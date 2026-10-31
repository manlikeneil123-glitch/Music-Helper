-- Photo scanning limits. Safe to re-run. Only the page count and time of each scan
-- are kept (never the photo), for 40 days, so the daily and monthly caps can work.
create table if not exists public.scans (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users on delete cascade,
  pages int not null check (pages between 1 and 3),
  created_at timestamptz not null default now()
);
create index if not exists scans_user on public.scans (user_id, created_at);
create index if not exists scans_created on public.scans (created_at);
alter table public.scans enable row level security;
revoke all on public.scans from anon, authenticated;

-- Called only by the scan-score function (service role) before each scan.
create or replace function public.claim_scan(p_user uuid, p_pages int, p_daily int default 6, p_monthly int default 3000) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not exists (select 1 from public.profiles where id = p_user and consent = 'ok') then
    raise exception 'Your account needs a parent or teacher to approve it first.';
  end if;
  delete from public.scans where created_at < now() - interval '40 days';
  if coalesce((select sum(pages) from public.scans where user_id = p_user and created_at > now() - interval '1 day'), 0) + p_pages > p_daily then
    raise exception 'You''ve scanned the most pages for today. Try again tomorrow.';
  end if;
  if coalesce((select sum(pages) from public.scans where created_at >= date_trunc('month', now())), 0) + p_pages > p_monthly then
    raise exception 'Scanning is paused until next month. Ask your teacher for the file instead.';
  end if;
  insert into public.scans (user_id, pages) values (p_user, p_pages);
end
$$;

revoke execute on function public.claim_scan from public, anon, authenticated;
do $$ begin
  if exists (select 1 from pg_roles where rolname = 'service_role') then
    grant execute on function public.claim_scan to service_role;
  end if;
end $$;
