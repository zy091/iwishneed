-- requirements RLS and admin helpers

-- Admin table (if not exists)
create table if not exists public.app_admins (
  user_id uuid primary key references auth.users(id) on delete cascade
);

-- Helper: is_admin()
create or replace function public.is_admin() returns boolean
language sql
stable
as $$
  select exists(select 1 from public.app_admins a where a.user_id = auth.uid());
$$;

-- Ensure submitter_id exists and backfill
alter table if exists public.requirements
  add column if not exists submitter_id uuid;

update public.requirements
set submitter_id = coalesce(submitter_id, nullif((submitter->>'id'), '')::uuid)
where submitter_id is null
  and (submitter->>'id') ~* '^[0-9a-f-]{8}-[0-9a-f-]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$';

create index if not exists idx_requirements_submitter_id on public.requirements (submitter_id);

-- Enable RLS
alter table if exists public.requirements enable row level security;

-- Policies
drop policy if exists req_select on public.requirements;
create policy req_select on public.requirements
for select using (true);

drop policy if exists req_insert on public.requirements;
create policy req_insert on public.requirements
for insert
with check (auth.uid() is not null and submitter_id = auth.uid());

drop policy if exists req_update on public.requirements;
create policy req_update on public.requirements
for update
using (public.is_admin() or submitter_id = auth.uid());

drop policy if exists req_delete on public.requirements;
create policy req_delete on public.requirements
for delete
using (public.is_admin() or submitter_id = auth.uid());