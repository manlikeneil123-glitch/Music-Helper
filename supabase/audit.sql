-- Security audit: run in the Supabase SQL editor after every migration. Every result
-- set should match the expected list in the comment above it.

-- 1. Functions a signed-out visitor (anon) can call. Expected: parent_view only.
select p.proname
from pg_proc p join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public' and has_function_privilege('anon', p.oid, 'execute')
order by 1;

-- 2. Tables in public without row-level security. Expected: none.
select c.relname
from pg_class c join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity;

-- 3. Security-definer functions without a fixed search_path. Expected: none.
select p.proname
from pg_proc p join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public' and p.prosecdef and not exists (select 1 from unnest(p.proconfig) c where c like 'search_path=%');

-- 4. Public storage buckets. Expected: none (Stave keeps recordings in a table).
select id from storage.buckets where public;

-- 5. Foreign keys without an index. Expected: none.
select c.conrelid::regclass as table_name, a.attname as column_name
from pg_constraint c
join pg_attribute a on a.attrelid = c.conrelid and a.attnum = c.conkey[1]
where c.contype = 'f' and c.connamespace = 'public'::regnamespace
  and not exists (select 1 from pg_index i where i.indrelid = c.conrelid and i.indkey[0] = c.conkey[1]);
