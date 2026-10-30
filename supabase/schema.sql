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
create or replace function public.studio_students() returns table (id uuid, username text, joined_at timestamptz, updated_at timestamptz, summary jsonb)
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
