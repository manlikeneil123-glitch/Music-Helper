-- Row-level security checks for supabase/migrations. Each block acts as one user.
\set ON_ERROR_STOP 1
insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-00000000000a', 'miss_t@x', '{"username":"Miss_T","role":"teacher","born":"1990-05","terms":"2026-10-31"}'),
  ('00000000-0000-0000-0000-00000000000b', 'ana@x', '{"username":"ana","role":"student","born":"1990-05","terms":"2026-10-31"}'),
  ('00000000-0000-0000-0000-00000000000c', 'ben@x', '{"username":"ben","role":"student","born":"1990-05","terms":"2026-10-31"}'),
  ('00000000-0000-0000-0000-00000000000d', 'mr_x@x', '{"username":"mr_x","role":"teacher","born":"1990-05","terms":"2026-10-31"}'),
  ('00000000-0000-0000-0000-00000000000e', 'eve@x', '{"username":"eve","role":"admin","born":"1990-05","terms":"2026-10-31"}');

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
  insert into auth.users (email, raw_user_meta_data) values ('dup@x', '{"username":"ana","born":"1990-05","terms":"t"}');
  raise exception 'FAIL: duplicate username allowed';
exception when unique_violation then raise notice 'ok: duplicate username rejected';
end $$;
do $$ begin
  insert into auth.users (email, raw_user_meta_data) values ('bad@x', '{"username":"no spaces!","born":"1990-05","terms":"t"}');
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

-- Assignments: teacher sets them for students in the studio only; students read their own.
select pg_temp.act('teacher');
insert into public.assignments (studio_id, student_id, title, piece_id, from_bar, to_bar, target_bpm, due)
  values (public.taught_studio(), '00000000-0000-0000-0000-00000000000b', 'Minuet bars 5-8', 'ode-to-joy', 5, 8, 72, current_date + 7);
insert into public.assignments (studio_id, title, piece_id) values (public.taught_studio(), 'Everyone: C major scale', 'c-scale');
do $$ begin insert into public.assignments (studio_id, student_id, title, piece_id) values (public.taught_studio(), '00000000-0000-0000-0000-00000000000c', 'x', 'c-scale'); raise exception 'FAIL: assigned to a non-member';
exception when insufficient_privilege then raise notice 'ok: cannot assign to a student outside the studio'; end $$;
select pg_temp.act('other');
do $$ begin insert into public.assignments (studio_id, title, piece_id) values ((select studio_id from public.profiles where id = '00000000-0000-0000-0000-00000000000b'), 'x', 'c-scale'); raise exception 'FAIL: other teacher assigned';
exception when insufficient_privilege or not_null_violation then raise notice 'ok: another teacher cannot assign into this studio'; end $$;
select pg_temp.ok((select count(*) from public.assignments) = 0, 'another teacher sees no assignments');
select pg_temp.act('ana');
select pg_temp.ok((select count(*) from public.assignments) = 2, 'student sees their own and studio-wide assignments');
update public.assignments set title = 'hacked'; -- matches no rows for a student
delete from public.assignments;
select pg_temp.ok((select count(*) from public.assignments where title = 'hacked') = 0 and (select count(*) from public.assignments) = 2, 'students cannot edit or delete assignments');
select pg_temp.act('ben');
select pg_temp.ok((select count(*) from public.assignments) = 0, 'non-member sees no assignments');

-- Shared scores: studio only.
select pg_temp.act('teacher');
insert into public.shared_scores (studio_id, title, musicxml) values (public.taught_studio(), 'My arrangement', '<score-partwise/>');
select pg_temp.act('ana');
select pg_temp.ok((select count(*) from public.shared_scores) = 1, 'student sees the shared score');
do $$ begin insert into public.shared_scores (studio_id, title, musicxml) values (public.my_studio(), 'x', 'x'); raise exception 'FAIL: student shared a score';
exception when insufficient_privilege then raise notice 'ok: students cannot share scores'; end $$;
select pg_temp.act('ben');
select pg_temp.ok((select count(*) from public.shared_scores) = 0, 'non-member sees no shared scores');

-- Recordings: student sends to their own studio; teacher listens and comments; 20 days max.
select pg_temp.act('ana');
insert into public.recordings (studio_id, title, kind, mime, data, seconds) values (public.my_studio(), 'Minuet take', 'audio', 'audio/webm', 'AAAA', 42);
do $$ begin insert into public.recordings (studio_id, title, kind, data) values ((select id from public.studios where teacher_id = '00000000-0000-0000-0000-00000000000d'), 'x', 'notes', '[]'); raise exception 'FAIL: sent to another studio';
exception when insufficient_privilege then raise notice 'ok: cannot send a recording to another studio'; end $$;
reset role;
insert into public.recordings (student_id, studio_id, title, kind, data, created_at)
  values ('00000000-0000-0000-0000-00000000000b', (select studio_id from public.profiles where id = '00000000-0000-0000-0000-00000000000b'), 'Old take', 'notes', '[]', now() - interval '21 days');
set role authenticated;
select pg_temp.act('teacher');
select pg_temp.ok((select count(*) from public.recordings) = 1, 'teacher hears the recent take, not the 21-day-old one');
select public.comment_recording((select id from public.recordings limit 1), 'Lovely phrasing in bar 3');
select pg_temp.act('ana');
select pg_temp.ok((select teacher_note from public.recordings limit 1) = 'Lovely phrasing in bar 3', 'student sees the teacher''s comment');
do $$ begin update public.recordings set teacher_note = 'forged'; raise exception 'FAIL: student edited a recording';
exception when insufficient_privilege then raise notice 'ok: students cannot edit recordings'; end $$;
select pg_temp.act('other');
select pg_temp.ok((select count(*) from public.recordings) = 0, 'another teacher hears nothing');
select pg_temp.act('ben');
select pg_temp.ok((select count(*) from public.recordings) = 0, 'another student hears nothing');
select pg_temp.act('ana');
insert into public.recordings (studio_id, title, kind, data) values (public.my_studio(), 'Second take', 'notes', '[]');
reset role;
select pg_temp.ok((select count(*) from public.recordings where title = 'Old take') = 0, 'expired recordings are purged on the next send');
set role authenticated;

-- Parent links: secret token, read-only summary, revocable; no direct table access.
select pg_temp.act('ana');
create temp table ptok as select public.create_parent_link() as t;
grant select on ptok to anon;
select pg_temp.ok((select length(t) from ptok) = 36, 'parent link token is 36 hex chars');
select pg_temp.ok(public.has_parent_link(), 'student can see they have a link');
do $$ begin perform * from public.parent_links; raise exception 'FAIL: read parent_links';
exception when insufficient_privilege then raise notice 'ok: parent_links not directly readable'; end $$;
reset role;
set role anon;
select pg_temp.ok((public.parent_view((select t from ptok)) ->> 'username') = 'ana', 'parent sees the summary with the token');
select pg_temp.ok((public.parent_view((select t from ptok)) -> 'summary' ->> 'week') = '42', 'parent sees the weekly summary');
select pg_temp.ok(public.parent_view('0123456789abcdef0123456789abcdef0123') is null, 'a wrong token shows nothing');
select pg_temp.ok(public.parent_view('') is null, 'an empty token shows nothing');
reset role;
set role authenticated;
select pg_temp.act('ana');
select public.revoke_parent_link();
reset role;
set role anon;
select pg_temp.ok(public.parent_view((select t from ptok)) is null, 'a revoked link shows nothing');
reset role;
set role authenticated;

-- Password resets: only the student's own teacher, only 8+ characters, signs them out.
reset role;
insert into auth.sessions (user_id) values ('00000000-0000-0000-0000-00000000000b');
set role authenticated;
select pg_temp.act('teacher');
do $$ begin perform public.reset_student_password('00000000-0000-0000-0000-00000000000b', 'short'); raise exception 'FAIL: short password accepted';
exception when raise_exception then if sqlerrm like 'FAIL%' then raise; end if; raise notice 'ok: short reset password rejected'; end $$;
select public.reset_student_password('00000000-0000-0000-0000-00000000000b', 'new-secret-1');
reset role;
select pg_temp.ok((select encrypted_password = extensions.crypt('new-secret-1', encrypted_password) from auth.users where id = '00000000-0000-0000-0000-00000000000b'), 'teacher reset the student''s password');
select pg_temp.ok((select count(*) from auth.sessions where user_id = '00000000-0000-0000-0000-00000000000b') = 0, 'reset signs the student out');
set role authenticated;
select pg_temp.act('teacher');
do $$ begin perform public.reset_student_password('00000000-0000-0000-0000-00000000000c', 'new-secret-1'); raise exception 'FAIL: reset a non-member';
exception when raise_exception then if sqlerrm like 'FAIL%' then raise; end if; raise notice 'ok: cannot reset a student outside the studio'; end $$;
select pg_temp.act('other');
do $$ begin perform public.reset_student_password('00000000-0000-0000-0000-00000000000b', 'hijacked-99'); raise exception 'FAIL: other teacher reset';
exception when raise_exception then if sqlerrm like 'FAIL%' then raise; end if; raise notice 'ok: another teacher cannot reset'; end $$;
select pg_temp.act('ana');
do $$ begin perform public.reset_student_password('00000000-0000-0000-0000-00000000000c', 'hijacked-99'); raise exception 'FAIL: student reset someone';
exception when raise_exception then if sqlerrm like 'FAIL%' then raise; end if; raise notice 'ok: students cannot reset passwords'; end $$;
select pg_temp.act('teacher');

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

-- Age screen and consent (migration 0003).
reset role;
do $$ begin insert into auth.users (email, raw_user_meta_data) values ('nb@x', '{"username":"no_born","terms":"t"}'); raise exception 'FAIL: sign-up without birth date';
exception when raise_exception then if sqlerrm like 'FAIL%' then raise; end if; raise notice 'ok: birth month and year required'; end $$;
do $$ begin insert into auth.users (email, raw_user_meta_data) values ('nt@x', '{"username":"no_terms","born":"1990-01"}'); raise exception 'FAIL: sign-up without terms';
exception when raise_exception then if sqlerrm like 'FAIL%' then raise; end if; raise notice 'ok: terms box required'; end $$;
insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-0000000000f1', 'kid@x', json_build_object('username', 'kid', 'role', 'teacher', 'born', to_char(current_date - interval '9 years', 'YYYY-MM'), 'terms', '2026-10-31')),
  ('00000000-0000-0000-0000-0000000000f2', 'kid2@x', json_build_object('username', 'kid2', 'role', 'student', 'born', to_char(current_date - interval '10 years', 'YYYY-MM'), 'terms', '2026-10-31')),
  ('00000000-0000-0000-0000-0000000000f3', 'kid3@x', json_build_object('username', 'kid3', 'role', 'student', 'born', to_char(current_date - interval '12 years', 'YYYY-MM'), 'terms', '2026-10-31')),
  ('00000000-0000-0000-0000-0000000000f4', 'teen@x', json_build_object('username', 'teen', 'role', 'student', 'born', to_char(current_date - interval '14 years', 'YYYY-MM'), 'terms', '2026-10-31'));
select pg_temp.ok((select consent = 'pending' and role = 'student' and terms_version = '2026-10-31' and terms_at is not null from public.profiles where username = 'kid'), 'under 13: pending, student, terms recorded');
select pg_temp.ok((select consent = 'ok' from public.profiles where username = 'teen'), '13 and over: no approval needed');
select pg_temp.ok(public.under_13(to_char(current_date - interval '13 years' + interval '1 month', 'YYYY-MM')) and not public.under_13(to_char(current_date - interval '13 years' - interval '1 month', 'YYYY-MM')), 'turns 13 at the end of the birth month');
set role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000f1', false);
select pg_temp.ok((public.me() ->> 'consent') = 'pending', 'child sees they are waiting');
do $$ begin insert into public.progress (user_id, data) values (auth.uid(), '{}'); raise exception 'FAIL: pending child stored progress';
exception when insufficient_privilege then raise notice 'ok: pending child stores nothing'; end $$;
do $$ begin perform public.create_parent_link(); raise exception 'FAIL: pending child made a parent link';
exception when raise_exception then if sqlerrm like 'FAIL%' then raise; end if; raise notice 'ok: pending child cannot make a parent link'; end $$;
do $$ begin perform public.issue_parent_consent(auth.uid(), 'mum@x.com'); raise exception 'FAIL: child issued own token';
exception when insufficient_privilege then raise notice 'ok: only the server issues consent tokens'; end $$;
reset role;
set role service_role;
create temp table tok as select public.issue_parent_consent('00000000-0000-0000-0000-0000000000f1', 'Mum@X.com') as t;
do $$ begin perform public.issue_parent_consent('00000000-0000-0000-0000-0000000000f1', 'mum@x.com'); raise exception 'FAIL: email spam';
exception when raise_exception then if sqlerrm like 'FAIL%' then raise; end if; raise notice 'ok: one consent email per 10 minutes'; end $$;
reset role;
grant select on tok to anon;
set role anon;
select pg_temp.ok(public.parent_consent((select t from tok), true) = 'kid', 'parent approves from the link');
do $$ begin perform public.parent_consent((select t from tok), true); raise exception 'FAIL: link reused';
exception when raise_exception then if sqlerrm like 'FAIL%' then raise; end if; raise notice 'ok: consent link works once'; end $$;
reset role;
select pg_temp.ok((select consent = 'ok' and consent_by = 'parent' and parent_email is null from public.profiles where username = 'kid'), 'approved and parent email wiped');
set role service_role;
create temp table tok2 as select public.issue_parent_consent('00000000-0000-0000-0000-0000000000f3', 'dad@x.com') as t;
reset role;
grant select on tok2 to anon;
set role anon;
select public.parent_consent((select t from tok2), false);
reset role;
select pg_temp.ok((select count(*) from public.profiles where username = 'kid3') = 0, 'parent says no: account deleted');
-- Teacher approval.
set role authenticated;
select pg_temp.act('teacher');
create temp table tcode as select public.me() -> 'studio' ->> 'code' as c;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000f2', false);
select public.join_studio((select c from tcode));
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000f4', false);
do $$ begin perform public.approve_student('00000000-0000-0000-0000-0000000000f2'); raise exception 'FAIL: non-teacher approved';
exception when raise_exception then if sqlerrm like 'FAIL%' then raise; end if; raise notice 'ok: only their teacher can approve'; end $$;
select pg_temp.act('teacher');
select pg_temp.ok((select pending from public.studio_students() where username = 'kid2'), 'teacher sees kid2 waiting');
select public.approve_student('00000000-0000-0000-0000-0000000000f2');
reset role;
select pg_temp.ok((select consent = 'ok' and consent_by = 'teacher' from public.profiles where username = 'kid2'), 'teacher approved kid2');
-- Unapproved for 14 days: gone at the next sign-up.
insert into auth.users (id, email, raw_user_meta_data) values ('00000000-0000-0000-0000-0000000000f5', 'old@x', json_build_object('username', 'oldkid', 'born', to_char(current_date - interval '8 years', 'YYYY-MM'), 'terms', 't'));
update public.profiles set created_at = now() - interval '15 days' where username = 'oldkid';
insert into auth.users (email, raw_user_meta_data) values ('new@x', '{"username":"newbie","born":"1990-01","terms":"t"}');
select pg_temp.ok((select count(*) from public.profiles where username = 'oldkid') = 0, 'unapproved accounts deleted after 14 days');

-- Photo scan limits (migration 0004).
insert into auth.users (id, email, raw_user_meta_data) values ('00000000-0000-0000-0000-0000000000f6', 'wait@x', json_build_object('username', 'waitkid', 'born', to_char(current_date - interval '8 years', 'YYYY-MM'), 'terms', 't'));
set role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000f4', false);
do $$ begin perform public.claim_scan(auth.uid(), 1); raise exception 'FAIL: student claimed a scan directly';
exception when insufficient_privilege then raise notice 'ok: only the server can claim scans'; end $$;
do $$ begin perform count(*) from public.scans; raise exception 'FAIL: student read scans';
exception when insufficient_privilege then raise notice 'ok: scans table is private'; end $$;
reset role;
set role service_role;
select public.claim_scan('00000000-0000-0000-0000-0000000000f4', 3);
select public.claim_scan('00000000-0000-0000-0000-0000000000f4', 3);
do $$ begin perform public.claim_scan('00000000-0000-0000-0000-0000000000f4', 1); raise exception 'FAIL: daily limit';
exception when raise_exception then if sqlerrm like 'FAIL%' then raise; end if; raise notice 'ok: six pages a day per student'; end $$;
do $$ begin perform public.claim_scan('00000000-0000-0000-0000-0000000000f6', 1); raise exception 'FAIL: pending child scanned';
exception when raise_exception then if sqlerrm like 'FAIL%' then raise; end if; raise notice 'ok: unapproved under-13s cannot scan'; end $$;
do $$ begin perform public.claim_scan('00000000-0000-0000-0000-0000000000f2', 1, 6, 6); raise exception 'FAIL: monthly cap';
exception when raise_exception then if sqlerrm like 'FAIL%' then raise; end if; raise notice 'ok: monthly cap across everyone'; end $$;
reset role;
select pg_temp.ok((select sum(pages) from public.scans) = 6, 'refused scans are not counted');
\echo ALL RLS CHECKS PASSED
