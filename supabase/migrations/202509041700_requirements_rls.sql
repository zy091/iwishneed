-- Requirements RLS, admin mapping and submitter_id support

-- 1) Add submitter_id column (denormalized for performance/clarity)
alter table if exists public.requirements
  add column if not exists submitter_id uuid;

-- 2) Backfill submitter_id from JSON submitter->>id when possible
update public.requirements
set submitter_id = (submitter ->> 'id')::uuid
where submitter_id is null
  and (submitter ->> 'id') ~ '^[0-9a-fA-F-]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$';

-- 3) Index for submitter_id
create index if not exists idx_requirements_submitter_id
  on public.requirements (submitter_id);

-- 4) Minimal admin mapping table for this standalone system
create table if not exists public.app_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

-- 5) Helper: is_admin() checks if current user is listed in app_admins
create or replace function public.is_admin() returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.app_admins a
    where a.user_id = auth.uid()
  );
$$;

-- 6) Enable RLS and (re)create policies
alter table public.requirements enable row level security;

drop policy if exists req_select on public.requirements;
drop policy if exists req_insert_own on public.requirements;
drop policy if exists req_update_own_or_admin on public.requirements;
drop policy if exists req_delete_own_or_admin on public.requirements;

-- Allow authenticated users to read
create policy req_select on public.requirements
for select
to authenticated
using (true);

-- Only owner can insert (submitter_id must be self)
create policy req_insert_own on public.requirements
for insert
to authenticated
with check ( submitter_id = auth.uid() );

-- Only owner or admin can update
create policy req_update_own_or_admin on public.requirements
for update
to authenticated
using ( submitter_id = auth.uid() or public.is_admin() )
with check ( submitter_id = auth.uid() or public.is_admin() );

-- Only owner or admin can delete
create policy req_delete_own_or_admin on public.requirements
for delete
to authenticated
using ( submitter_id = auth.uid() or public.is_admin() );

-- Notes:
-- 1) 初次部署后，请将你的管理员用户 id 插入 app_admins 表：
--    insert into public.app_admins(user_id) values ('<your-auth-user-id>');
-- 2) 前端创建需求时会自动填充 submitter 和 submitter_id，RLS 会阻止伪造他人 id 的请求。