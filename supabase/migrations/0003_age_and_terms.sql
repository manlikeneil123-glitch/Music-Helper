-- Age screen, parental consent and terms acceptance. Safe to re-run.
--
-- Sign-up sends the birth month and year (asked neutrally, nothing pre-selected) and
-- the version of the Terms the person ticked. The server, not the phone, records when.
-- Anyone under 13 gets an account that can't store anything until a parent (by an
-- emailed link) or their studio teacher approves it. Unapproved accounts are deleted
-- after 14 days, and the parent's email is wiped as soon as they answer.

alter table public.profiles add column if not exists born text check (born ~ '^\d{4}-(0[1-9]|1[0-2])$');
alter table public.profiles add column if not exists consent text not null default 'ok' check (consent in ('ok', 'pending'));
alter table public.profiles add column if not exists consent_by text check (consent_by in ('parent', 'teacher'));
alter table public.profiles add column if not exists consent_at timestamptz;
alter table public.profiles add column if not exists parent_email text check (char_length(parent_email) <= 254);
alter table public.profiles add column if not exists consent_token uuid unique;
alter table public.profiles add column if not exists consent_sent_at timestamptz;
alter table public.profiles add column if not exists terms_version text check (char_length(terms_version) <= 20);
alter table public.profiles add column if not exists terms_at timestamptz;

-- Under 13 on the last day of their birth month, so a guess always errs younger.
create or replace function public.under_13(p_born text) returns boolean
language sql immutable set search_path = '' as $$
  select (to_date(p_born, 'YYYY-MM') + interval '1 month' - interval '1 day' + interval '13 years')::date > current_date
$$;

create or replace function public.approved() returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce((select consent = 'ok' from public.profiles where id = auth.uid()), false)
$$;

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  born text := new.raw_user_meta_data ->> 'born';
  child boolean;
begin
  if born is null or born !~ '^\d{4}-(0[1-9]|1[0-2])$' or to_date(born, 'YYYY-MM') > current_date or to_date(born, 'YYYY-MM') < date '1900-01-01' then
    raise exception 'Choose the month and year you were born.';
  end if;
  if coalesce(new.raw_user_meta_data ->> 'terms', '') = '' then
    raise exception 'Tick the box to agree to the Terms and Privacy Policy.';
  end if;
  child := public.under_13(born);
  -- Accounts nobody approved in 14 days go, with everything attached.
  delete from auth.users where id in (
    select id from public.profiles where consent = 'pending' and created_at < now() - interval '14 days');
  insert into public.profiles (id, username, role, born, consent, terms_version, terms_at)
  values (
    new.id,
    lower(new.raw_user_meta_data ->> 'username'),
    case when new.raw_user_meta_data ->> 'role' = 'teacher' and not child then 'teacher' else 'student' end,
    born,
    case when child then 'pending' else 'ok' end,
    left(new.raw_user_meta_data ->> 'terms', 20),
    now()
  );
  return new;
end
$$;

create or replace function public.me() returns json
language sql stable security definer set search_path = '' as $$
  select json_build_object(
    'id', p.id, 'username', p.username, 'role', p.role,
    'consent', p.consent, 'parentAsked', p.consent_sent_at is not null,
    'studio', case when s.id is null then null else json_build_object(
      'id', s.id,
      'name', s.name,
      'code', case when s.teacher_id = p.id then s.code end,
      'teacher', (select t.username from public.profiles t where t.id = s.teacher_id)
    ) end
  )
  from public.profiles p
  left join public.studios s on s.id = coalesce(p.studio_id, (select id from public.studios where teacher_id = p.id))
  where p.id = auth.uid()
$$;

-- Nothing is stored for an account waiting for approval.
drop policy if exists "progress: write own" on public.progress;
create policy "progress: write own" on public.progress for insert to authenticated
  with check (user_id = auth.uid() and public.approved());
drop policy if exists "progress: update own" on public.progress;
create policy "progress: update own" on public.progress for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid() and public.approved());
drop policy if exists "recordings: student sends" on public.recordings;
create policy "recordings: student sends" on public.recordings for insert to authenticated
  with check (student_id = auth.uid() and studio_id = public.my_studio() and public.approved());

create or replace function public.create_parent_link() returns text
language plpgsql security definer set search_path = '' as $$
declare
  t text := encode(extensions.gen_random_bytes(18), 'hex');
begin
  if auth.uid() is null then raise exception 'Sign in first.'; end if;
  if not public.approved() then raise exception 'Your account needs a parent or teacher to approve it first.'; end if;
  delete from public.parent_links where student_id = auth.uid();
  insert into public.parent_links (token, student_id) values (t, auth.uid());
  return t;
end
$$;

-- The teacher's list now says who is waiting for approval.
drop function if exists public.studio_students();
create function public.studio_students() returns table (id uuid, username text, joined_at timestamptz, updated_at timestamptz, summary jsonb, pending boolean)
language sql stable security definer set search_path = '' as $$
  select p.id, p.username, p.joined_at, g.updated_at, g.data -> 'summary' -> 'v', p.consent = 'pending'
  from public.profiles p
  left join public.progress g on g.user_id = p.id
  where p.studio_id is not null and p.studio_id = public.taught_studio()
  order by p.username
$$;

create or replace function public.approve_student(p_student uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  update public.profiles set consent = 'ok', consent_by = 'teacher', consent_at = now(), parent_email = null, consent_token = null
  where id = p_student and consent = 'pending' and studio_id is not null and studio_id = public.taught_studio();
  if not found then raise exception 'You can only approve students waiting in your studio.'; end if;
end
$$;

-- Called only by the parent-consent edge function (service role): stores where the
-- email went and returns the one-time token for the link. At most one email per 10 minutes.
create or replace function public.issue_parent_consent(p_user uuid, p_email text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  t uuid := gen_random_uuid();
begin
  if p_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then raise exception 'That email address doesn''t look right.'; end if;
  update public.profiles set parent_email = lower(p_email), consent_token = t, consent_sent_at = now()
  where id = p_user and consent = 'pending' and (consent_sent_at is null or consent_sent_at < now() - interval '10 minutes');
  if not found then raise exception 'Wait a few minutes before sending another email.'; end if;
  return t;
end
$$;

-- The parent's answer from the emailed link. Yes approves; no deletes the account.
create or replace function public.parent_consent(p_token uuid, p_agree boolean) returns text
language plpgsql security definer set search_path = '' as $$
declare
  child uuid;
  name text;
begin
  select id, username into child, name from public.profiles
  where consent_token = p_token and consent = 'pending' and consent_sent_at > now() - interval '7 days';
  if child is null then raise exception 'This link has expired or was already used.'; end if;
  if p_agree then
    update public.profiles set consent = 'ok', consent_by = 'parent', consent_at = now(), parent_email = null, consent_token = null where id = child;
  else
    delete from auth.users where id = child;
  end if;
  return name;
end
$$;

revoke execute on function public.under_13, public.approved, public.issue_parent_consent from public, anon, authenticated;
grant execute on function public.approved to authenticated;
revoke execute on function public.studio_students, public.approve_student from public, anon;
grant execute on function public.studio_students, public.approve_student to authenticated;
revoke execute on function public.parent_consent from public;
grant execute on function public.parent_consent to anon, authenticated;
do $$ begin
  if exists (select 1 from pg_roles where rolname = 'service_role') then
    grant execute on function public.issue_parent_consent to service_role;
  end if;
end $$;
