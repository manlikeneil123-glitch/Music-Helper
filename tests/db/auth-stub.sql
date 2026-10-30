-- The bits of Supabase that schema.sql relies on, for testing on plain Postgres.
create role anon nologin;
create role authenticated nologin;
create schema auth;
grant usage on schema auth, public to anon, authenticated;
create table auth.users (id uuid primary key default gen_random_uuid(), email text unique, raw_user_meta_data jsonb, encrypted_password text, updated_at timestamptz);
create table auth.sessions (id uuid primary key default gen_random_uuid(), user_id uuid references auth.users on delete cascade);
create schema extensions;
create extension pgcrypto schema extensions;
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
grant execute on function auth.uid() to anon, authenticated;
