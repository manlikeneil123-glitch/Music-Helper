-- Row-level security checks for supabase/schema.sql. Each block acts as one user.
\set ON_ERROR_STOP 1
insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-00000000000a', 'miss_t@x', '{"username":"Miss_T","role":"teacher"}'),
  ('00000000-0000-0000-0000-00000000000b', 'ana@x', '{"username":"ana","role":"student"}'),
  ('00000000-0000-0000-0000-00000000000c', 'ben@x', '{"username":"ben","role":"student"}'),
  ('00000000-0000-0000-0000-00000000000d', 'mr_x@x', '{"username":"mr_x","role":"teacher"}'),
  ('00000000-0000-0000-0000-00000000000e', 'eve@x', '{"username":"eve","role":"admin"}');

create function pg_temp.act(who text) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claim.sub', case who when 'teacher' then '00000000-0000-0000-0000-00000000000a' when 'ana' then '00000000-0000-0000-0000-00000000000b' when 'ben' then '00000000-0000-0000-0000-00000000000c' when 'other' then '00000000-0000-0000-0000-00000000000d' when 'eve' then '00000000-0000-0000-0000-00000000000e' end, false);
end $$;
create function pg_temp.ok(cond boolean, what text) returns void language plpgsql as $$
begin
  if not cond then raise exception 'FAIL: %', what; end if;
  raise notice 'ok: %', what;
end $$;

select pg_temp.ok((select username from public.profiles where id = '00000000-0000-0000-0000-00000000000a') = 'miss_t', 'username lower-cased');
select pg_temp.ok((select role from public.profiles where id = '00000000-0000-0000-0000-00000000000e') = 'student', 'unknown role becomes student');
do $$ begin
  insert into auth.users (email, raw_user_meta_data) values ('dup@x', '{"username":"ana"}');
  raise exception 'FAIL: duplicate username allowed';
exception when unique_violation then raise notice 'ok: duplicate username rejected';
end $$;
do $$ begin
  insert into auth.users (email, raw_user_meta_data) values ('bad@x', '{"username":"no spaces!"}');
  raise exception 'FAIL: bad username allowed';
exception when check_violation then raise notice 'ok: malformed username rejected';
end $$;

set role authenticated;

-- Teacher makes a studio; a student can't.
select pg_temp.act('ana');
do $$ begin perform public.create_studio('x'); raise exception 'FAIL: student made a studio';
exception when raise_exception then if sqlerrm like 'FAIL%' then raise; end if; raise notice 'ok: student cannot make a studio'; end $$;
select pg_temp.act('teacher');
select public.create_studio('Piano with Miss T') ->> 'studio' as studio;
create temp table code as select (public.me() -> 'studio' ->> 'code') as c;
select pg_temp.ok((select length(c) from code) = 6, 'teacher sees a 6-char code');
select pg_temp.act('other');
select public.create_studio('Other studio');

-- Direct writes are blocked.
select pg_temp.act('ana');
do $$ begin update public.profiles set studio_id = (select id from public.studios limit 1); raise exception 'FAIL: direct profile update';
exception when insufficient_privilege then raise notice 'ok: profiles not directly writable'; end $$;
do $$ begin insert into public.studios (teacher_id, code) values (auth.uid(), 'HACKED'); raise exception 'FAIL: direct studio insert';
exception when insufficient_privilege then raise notice 'ok: studios not directly writable'; end $$;
select pg_temp.ok((select count(*) from public.studios) = 0, 'student sees no studios before joining');

-- Students store progress; nobody else can write it.
insert into public.progress (user_id, data) values (auth.uid(), '{"summary":{"v":{"week":42},"t":1}}');
do $$ begin insert into public.progress (user_id, data) values ('00000000-0000-0000-0000-00000000000c', '{}'); raise exception 'FAIL: wrote someone else''s progress';
exception when insufficient_privilege then raise notice 'ok: cannot write another user''s progress'; end $$;
select pg_temp.act('ben');
insert into public.progress (user_id, data) values (auth.uid(), '{"summary":{"v":{"week":7},"t":1}}');
update public.progress set data = '{}' where user_id = '00000000-0000-0000-0000-00000000000b';
select pg_temp.act('ana');
select pg_temp.ok((select data -> 'summary' -> 'v' ->> 'week' from public.progress where user_id = auth.uid()) = '42', 'update of another user''s progress had no effect');
select pg_temp.ok((select count(*) from public.progress) = 1, 'student sees only their own progress');

-- Teacher sees nothing until ana joins with the code.
select pg_temp.act('teacher');
select pg_temp.ok((select count(*) from public.studio_students()) = 0, 'empty class before joining');
select pg_temp.ok((select count(*) from public.progress) = 0, 'teacher cannot read non-member progress');
select pg_temp.act('ana');
do $$ begin perform public.join_studio('WRONG1'); raise exception 'FAIL: joined with wrong code';
exception when raise_exception then if sqlerrm like 'FAIL%' then raise; end if; raise notice 'ok: wrong code rejected'; end $$;
select public.join_studio(lower((select c from code)));
select pg_temp.ok((public.me() -> 'studio' ->> 'teacher') = 'miss_t', 'student sees their teacher');
select pg_temp.ok((public.me() -> 'studio' ->> 'code') is null, 'student is not shown the code');
select pg_temp.ok((select count(*) from public.profiles) = 2, 'student sees self + teacher only');
select pg_temp.act('teacher');
do $$ begin perform public.join_studio((select c from code)); raise exception 'FAIL: teacher joined a studio';
exception when raise_exception then if sqlerrm like 'FAIL%' then raise; end if; raise notice 'ok: teachers cannot join studios'; end $$;
select pg_temp.ok((select count(*) from public.studio_students()) = 1, 'teacher sees ana');
select pg_temp.ok((select summary ->> 'week' from public.studio_students()) = '42', 'teacher reads ana''s summary');
select pg_temp.ok((select count(*) from public.progress) = 1, 'teacher reads exactly one student''s progress');
select pg_temp.ok((select count(*) from public.profiles where username = 'ben') = 0, 'teacher cannot see non-member ben');
select pg_temp.act('other');
select pg_temp.ok((select count(*) from public.studio_students()) = 0, 'another teacher sees nobody');
select pg_temp.ok((select count(*) from public.progress) = 0, 'another teacher reads no progress');
do $$ begin perform public.remove_student('00000000-0000-0000-0000-00000000000b'); end $$;
select pg_temp.act('teacher');
select pg_temp.ok((select count(*) from public.studio_students()) = 1, 'other teacher could not remove ana');

-- Code rotation locks out the old code; removal and leaving work.
select public.new_studio_code();
select pg_temp.ok((public.me() -> 'studio' ->> 'code') <> (select c from code), 'code rotated');
select pg_temp.act('ben');
do $$ begin perform public.join_studio((select c from code)); raise exception 'FAIL: old code still works';
exception when raise_exception then if sqlerrm like 'FAIL%' then raise; end if; raise notice 'ok: old code rejected'; end $$;
select pg_temp.act('teacher');
select public.remove_student('00000000-0000-0000-0000-00000000000b');
select pg_temp.ok((select count(*) from public.studio_students()) = 0, 'teacher removed ana');
select pg_temp.ok((select count(*) from public.progress) = 0, 'removed student''s progress hidden again');

-- Anonymous callers get nothing.
reset role;
set role anon;
do $$ begin perform count(*) from public.profiles; raise exception 'FAIL: anon read profiles';
exception when insufficient_privilege then raise notice 'ok: anon cannot read profiles'; end $$;
do $$ begin perform public.studio_students(); raise exception 'FAIL: anon called rpc';
exception when insufficient_privilege then raise notice 'ok: anon cannot call functions'; end $$;

-- Deleting an account removes its data; a teacher's deletion frees students.
reset role;
create temp table other_code as select code from public.studios where teacher_id = '00000000-0000-0000-0000-00000000000d';
grant select on other_code to authenticated;
set role authenticated;
select pg_temp.act('ana');
select public.join_studio((select code from other_code));
select pg_temp.act('ben');
select public.delete_me();
reset role;
select pg_temp.ok((select count(*) from public.progress where user_id = '00000000-0000-0000-0000-00000000000c') = 0, 'deleted account''s progress is gone');
select pg_temp.ok((select count(*) from public.profiles where username = 'ben') = 0, 'deleted account''s profile is gone');
delete from auth.users where id = '00000000-0000-0000-0000-00000000000d';
select pg_temp.ok((select studio_id from public.profiles where username = 'ana') is null, 'teacher deletion frees the student');
\echo ALL RLS CHECKS PASSED
