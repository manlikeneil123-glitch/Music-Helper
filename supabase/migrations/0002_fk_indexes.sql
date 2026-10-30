-- Indexes on the foreign keys that 0001 left without one: a student's own work and
-- recordings are looked up (and cascade-deleted) by student_id. Safe to re-run.
create index if not exists assignments_student on public.assignments (student_id);
create index if not exists recordings_student on public.recordings (student_id);
create index if not exists parent_links_student on public.parent_links (student_id);
