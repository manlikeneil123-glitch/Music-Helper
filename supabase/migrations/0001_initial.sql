-- Music Helper accounts: username + password (no email), student and teacher roles,
-- one studio per teacher that students join with a code, and one progress blob per
-- account. Paste the whole file into Supabase → SQL Editor → Run. Safe to re-run.
--
-- Security model (every table has row-level security on):
--   * you can read and write your own progress, and read your own profile;
--   * a teacher can read the profiles and progress of students in their studio;
--   * a student can read their own teacher's username and studio name, and nothing
--     about classmates;
--   * all changes to profiles and studios go through the functions at the bottom,
--     so nobody can put themselves in a studio without its code or change their role.

create table if not exists public.studios (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null unique references auth.users on delete cascade,
  name text not null default 'My studio' check (char_length(name) between 1 and 60),
  code text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists public.profiles (
  id uuid primary key references auth.users on delete cascade,
  username text not null unique check (username ~ '^[a-z0-9_]{3,20}$'),
  role text not null check (role in ('student', 'teacher')),
  studio_id uuid references public.studios on delete set null,
  joined_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.progress (
  user_id uuid primary key references auth.users on delete cascade,
  data jsonb not null default '{}'::jsonb check (pg_column_size(data) < 2000000),
  updated_at timestamptz not null default now()
);

create index if not exists profiles_studio on public.profiles (studio_id);

-- Helpers for the policies. SECURITY DEFINER so a policy on profiles can ask about
-- profiles without recursing into itself.
create or replace function public.my_studio() returns uuid
language sql stable security definer set search_path = '' as $$
  select studio_id from public.profiles where id = auth.uid()
$$;

create or replace function public.taught_studio() returns uuid
language sql stable security definer set search_path = '' as $$
  select id from public.studios where teacher_id = auth.uid()
$$;

alter table public.studios enable row level security;
alter table public.profiles enable row level security;
alter table public.progress enable row level security;

drop policy if exists "studio: teacher or member reads" on public.studios;
create policy "studio: teacher or member reads" on public.studios for select to authenticated
  using (teacher_id = auth.uid() or id = public.my_studio());

drop policy if exists "profile: self, my students, my teacher" on public.profiles;
create policy "profile: self, my students, my teacher" on public.profiles for select to authenticated
  using (
    id = auth.uid()
    or (studio_id is not null and studio_id = public.taught_studio())
    or id = (select s.teacher_id from public.studios s where s.id = public.my_studio())
  );

drop policy if exists "progress: own or my students" on public.progress;
create policy "progress: own or my students" on public.progress for select to authenticated
  using (
    user_id = auth.uid()
    or user_id in (select p.id from public.profiles p where p.studio_id is not null and p.studio_id = public.taught_studio())
  );

drop policy if exists "progress: write own" on public.progress;
create policy "progress: write own" on public.progress for insert to authenticated
  with check (user_id = auth.uid());

drop policy if exists "progress: update own" on public.progress;
create policy "progress: update own" on public.progress for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

revoke all on public.studios, public.profiles, public.progress from anon;
revoke insert, update, delete, truncate on public.studios, public.profiles from authenticated;
grant select on public.studios, public.profiles to authenticated;
grant select, insert, update on public.progress to authenticated;
revoke delete, truncate on public.progress from authenticated;

-- A profile for every new account, from the username and role sent at sign-up. If
-- the username is taken or malformed this raises, and the sign-up is rolled back.
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, username, role)
  values (
    new.id,
    lower(new.raw_user_meta_data ->> 'username'),
    case when new.raw_user_meta_data ->> 'role' = 'teacher' then 'teacher' else 'student' end
  );
  return new;
end
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Studio codes: 6 characters with no look-alikes (no 0/O, 1/I/L).
create or replace function public.new_code() returns text
language plpgsql volatile set search_path = '' as $$
declare
  alphabet constant text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  out text;
begin
  loop
    out := '';
    for i in 1..6 loop
      out := out || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
    end loop;
    exit when not exists (select 1 from public.studios where code = out);
  end loop;
  return out;
end
$$;

create or replace function public.me() returns json
language sql stable security definer set search_path = '' as $$
  select json_build_object(
    'id', p.id, 'username', p.username, 'role', p.role,
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

create or replace function public.create_studio(p_name text default 'My studio') returns json
language plpgsql security definer set search_path = '' as $$
begin
  if (select role from public.profiles where id = auth.uid()) is distinct from 'teacher' then
    raise exception 'Only teacher accounts can make a studio.';
  end if;
  insert into public.studios (teacher_id, name, code)
  values (auth.uid(), coalesce(nullif(trim(p_name), ''), 'My studio'), public.new_code())
  on conflict (teacher_id) do update set name = excluded.name;
  return public.me();
end
$$;

create or replace function public.new_studio_code() returns json
language plpgsql security definer set search_path = '' as $$
begin
  update public.studios set code = public.new_code() where teacher_id = auth.uid();
  return public.me();
end
$$;

create or replace function public.join_studio(p_code text) returns json
language plpgsql security definer set search_path = '' as $$
declare
  target uuid;
begin
  if (select role from public.profiles where id = auth.uid()) is distinct from 'student' then
    raise exception 'Only student accounts can join a studio.';
  end if;
  select id into target from public.studios where code = upper(regexp_replace(p_code, '[^A-Za-z0-9]', '', 'g'));
  if target is null then
    raise exception 'No studio has that code. Check it with your teacher.';
  end if;
  update public.profiles set studio_id = target, joined_at = now() where id = auth.uid();
  return public.me();
end
$$;

create or replace function public.leave_studio() returns json
language sql security definer set search_path = '' as $$
  update public.profiles set studio_id = null, joined_at = null where id = auth.uid();
  select public.me();
$$;

create or replace function public.remove_student(p_student uuid) returns void
language sql security definer set search_path = '' as $$
  update public.profiles set studio_id = null, joined_at = null
  where id = p_student and studio_id is not null and studio_id = public.taught_studio();
$$;

-- The teacher's class list: each student's username and the summary their phone
-- computed (minutes, streak, recent checks) — never their full history.
-- Dropped first: 0003 adds a column, and a re-run can't change a return type in place.
drop function if exists public.studio_students();
create function public.studio_students() returns table (id uuid, username text, joined_at timestamptz, updated_at timestamptz, summary jsonb)
language sql stable security definer set search_path = '' as $$
  select p.id, p.username, p.joined_at, g.updated_at, g.data -> 'summary' -> 'v'
  from public.profiles p
  left join public.progress g on g.user_id = p.id
  where p.studio_id is not null and p.studio_id = public.taught_studio()
  order by p.username
$$;

-- A student who forgets their password has no email to reset it with, so their
-- teacher can set a temporary one. Only for students in the teacher's own studio;
-- it also signs the student out everywhere.
create or replace function public.reset_student_password(p_student uuid, p_password text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if char_length(coalesce(p_password, '')) < 8 then
    raise exception 'Passwords need at least 8 characters.';
  end if;
  if not exists (select 1 from public.profiles where id = p_student and studio_id is not null and studio_id = public.taught_studio()) then
    raise exception 'You can only reset passwords for students in your studio.';
  end if;
  update auth.users set encrypted_password = extensions.crypt(p_password, extensions.gen_salt('bf')), updated_at = now() where id = p_student;
  delete from auth.sessions where user_id = p_student;
end
$$;

-- Right to erasure: deletes the account and, by cascade, everything attached to it.
create or replace function public.delete_me() returns void
language sql security definer set search_path = '' as $$
  delete from auth.users where id = auth.uid();
$$;

revoke execute on function public.my_studio, public.taught_studio, public.handle_new_user, public.new_code from public, anon, authenticated;
grant execute on function public.my_studio, public.taught_studio to authenticated;
revoke execute on function public.reset_student_password from public, anon;
grant execute on function public.reset_student_password to authenticated;
revoke execute on function public.me, public.create_studio, public.new_studio_code, public.join_studio, public.leave_studio, public.remove_student, public.studio_students, public.delete_me from public, anon;
grant execute on function public.me, public.create_studio, public.new_studio_code, public.join_studio, public.leave_studio, public.remove_student, public.studio_students, public.delete_me to authenticated;

-- ============================================================================
-- Teaching: assignments, shared scores, recordings, parent links.
-- ============================================================================

-- What the teacher sets: a piece (library id or a shared score), optionally a bar
-- range, a target tempo and checking strictness, a due date and a note. student_id
-- null means everyone in the studio.
create table if not exists public.assignments (
  id uuid primary key default gen_random_uuid(),
  studio_id uuid not null references public.studios on delete cascade,
  student_id uuid references auth.users on delete cascade,
  title text not null check (char_length(title) between 1 and 120),
  piece_id text not null check (char_length(piece_id) <= 80),
  from_bar int check (from_bar >= 1),
  to_bar int check (to_bar >= from_bar),
  target_bpm int check (target_bpm between 20 and 300),
  strictness text check (strictness in ('gentle', 'standard', 'exam')),
  due date,
  note text check (char_length(note) <= 500),
  created_at timestamptz not null default now()
);
create index if not exists assignments_studio on public.assignments (studio_id);

-- Scores the teacher shares with their own students only (their own arrangements
-- or files they're licensed to share). Never public.
create table if not exists public.shared_scores (
  id uuid primary key default gen_random_uuid(),
  studio_id uuid not null references public.studios on delete cascade,
  title text not null check (char_length(title) between 1 and 120),
  musicxml text not null check (char_length(musicxml) < 1500000),
  created_at timestamptz not null default now()
);
create index if not exists shared_scores_studio on public.shared_scores (studio_id);

-- Takes a student chose to send to their teacher. Audio (base64, compressed by
-- the phone) or the notes played on a keyboard. Gone after 20 days: hidden by the
-- policies at once, and deleted by the purge below.
create table if not exists public.recordings (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references auth.users on delete cascade default auth.uid(),
  studio_id uuid not null references public.studios on delete cascade,
  title text not null check (char_length(title) between 1 and 160),
  kind text not null check (kind in ('audio', 'notes')),
  mime text check (char_length(mime) <= 60),
  data text not null check (char_length(data) < 2000000),
  seconds int check (seconds between 0 and 900),
  score int,
  teacher_note text check (char_length(teacher_note) <= 1000),
  created_at timestamptz not null default now()
);
create index if not exists recordings_studio on public.recordings (studio_id, created_at);

-- A secret read-only link for a parent: no account, revocable by the student.
create table if not exists public.parent_links (
  token text primary key,
  student_id uuid not null references auth.users on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.assignments enable row level security;
alter table public.shared_scores enable row level security;
alter table public.recordings enable row level security;
alter table public.parent_links enable row level security;

drop policy if exists "assignments: teacher manages" on public.assignments;
create policy "assignments: teacher manages" on public.assignments for all to authenticated
  using (studio_id = public.taught_studio())
  with check (
    studio_id = public.taught_studio()
    and (student_id is null or student_id in (select p.id from public.profiles p where p.studio_id = public.taught_studio()))
  );
drop policy if exists "assignments: student reads own" on public.assignments;
create policy "assignments: student reads own" on public.assignments for select to authenticated
  using (studio_id = public.my_studio() and (student_id is null or student_id = auth.uid()));

drop policy if exists "shared scores: teacher manages" on public.shared_scores;
create policy "shared scores: teacher manages" on public.shared_scores for all to authenticated
  using (studio_id = public.taught_studio()) with check (studio_id = public.taught_studio());
drop policy if exists "shared scores: students read" on public.shared_scores;
create policy "shared scores: students read" on public.shared_scores for select to authenticated
  using (studio_id = public.my_studio());

drop policy if exists "recordings: student sends" on public.recordings;
create policy "recordings: student sends" on public.recordings for insert to authenticated
  with check (student_id = auth.uid() and studio_id = public.my_studio());
drop policy if exists "recordings: student and teacher read" on public.recordings;
create policy "recordings: student and teacher read" on public.recordings for select to authenticated
  using (
    created_at > now() - interval '20 days'
    and (student_id = auth.uid() or (studio_id = public.taught_studio() and student_id in (select p.id from public.profiles p where p.studio_id = public.taught_studio())))
  );
drop policy if exists "recordings: student or teacher deletes" on public.recordings;
create policy "recordings: student or teacher deletes" on public.recordings for delete to authenticated
  using (student_id = auth.uid() or studio_id = public.taught_studio());

-- parent_links: no direct access at all; only through the functions below.

grant select, insert, update, delete on public.assignments, public.shared_scores to authenticated;
grant select, insert, delete on public.recordings to authenticated;
revoke all on public.assignments, public.shared_scores, public.recordings, public.parent_links from anon;
revoke all on public.parent_links from authenticated;

-- Teachers can leave a comment on a recording (and nothing else about it).
create or replace function public.comment_recording(p_id uuid, p_note text) returns void
language sql security definer set search_path = '' as $$
  update public.recordings set teacher_note = left(p_note, 1000)
  where id = p_id and studio_id = public.taught_studio() and created_at > now() - interval '20 days';
$$;

-- The 20-day rule, physically: every new recording sweeps out expired ones, and on
-- Supabase a nightly pg_cron job does too (set up below when pg_cron is available).
create or replace function public.purge_recordings() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  delete from public.recordings where created_at < now() - interval '20 days';
  return null;
end
$$;
drop trigger if exists recordings_purge on public.recordings;
create trigger recordings_purge after insert on public.recordings
  for each statement execute function public.purge_recordings();

do $$
begin
  create extension if not exists pg_cron;
  perform cron.schedule('purge-recordings', '17 3 * * *', $c$delete from public.recordings where created_at < now() - interval '20 days'$c$);
exception when others then
  raise notice 'pg_cron not available; expired recordings are purged on each new recording instead.';
end
$$;

-- Parent links: the student makes (or remakes) one; anyone holding the token can
-- read that student's weekly summary and nothing else.
create or replace function public.create_parent_link() returns text
language plpgsql security definer set search_path = '' as $$
declare
  t text := encode(extensions.gen_random_bytes(18), 'hex');
begin
  if auth.uid() is null then raise exception 'Sign in first.'; end if;
  delete from public.parent_links where student_id = auth.uid();
  insert into public.parent_links (token, student_id) values (t, auth.uid());
  return t;
end
$$;

create or replace function public.revoke_parent_link() returns void
language sql security definer set search_path = '' as $$
  delete from public.parent_links where student_id = auth.uid();
$$;

create or replace function public.has_parent_link() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.parent_links where student_id = auth.uid());
$$;

create or replace function public.parent_view(p_token text) returns json
language sql stable security definer set search_path = '' as $$
  select json_build_object('username', p.username, 'updated_at', g.updated_at, 'summary', g.data -> 'summary' -> 'v')
  from public.parent_links l
  join public.profiles p on p.id = l.student_id
  left join public.progress g on g.user_id = l.student_id
  where l.token = p_token and char_length(p_token) >= 32
$$;

revoke execute on function public.comment_recording, public.create_parent_link, public.revoke_parent_link, public.has_parent_link, public.purge_recordings from public, anon;
grant execute on function public.comment_recording, public.create_parent_link, public.revoke_parent_link, public.has_parent_link to authenticated;
revoke execute on function public.parent_view from public;
grant execute on function public.parent_view to anon, authenticated;
