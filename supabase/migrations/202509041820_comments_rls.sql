-- Comments RLS: readable to all authenticated users; only owner or admin can update/delete; insert by self
-- Adjust table/columns to match your existing schema if different.

-- 1) Ensure required columns exist
alter table if exists public.comments
  add column if not exists user_id uuid,
  add column if not exists requirement_id uuid,
  add column if not exists content text,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

-- 2) Backfill user_id from legacy columns if any
-- Try common legacy fields: user_external_id (text uuid) or submitter->>id
update public.comments
set user_id = (user_external_id)::uuid
where user_id is null and coalesce(user_external_id, '') ~ '^[0-9a-fA-F-]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$';

update public.comments
set user_id = (submitter->>'id')::uuid
where user_id is null
  and (submitter->>'id') ~ '^[0-9a-fA-F-]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$';

-- 3) Indexes
create index if not exists idx_comments_requirement_id on public.comments(requirement_id);
create index if not exists idx_comments_user_id on public.comments(user_id);

-- 4) Enable RLS
alter table public.comments enable row level security;

-- 5) Policies
drop policy if exists comments_select on public.comments;
drop policy if exists comments_insert_own on public.comments;
drop policy if exists comments_update_own_or_admin on public.comments;
drop policy if exists comments_delete_own_or_admin on public.comments;

-- Allow all authenticated users to read comments
create policy comments_select on public.comments
for select
to authenticated
using (true);

-- Insert: only self
create policy comments_insert_own on public.comments
for insert
to authenticated
with check ( user_id = auth.uid() );

-- Update: owner or admin
create policy comments_update_own_or_admin on public.comments
for update
to authenticated
using ( user_id = auth.uid() or public.is_admin() )
with check ( user_id = auth.uid() or public.is_admin() );

-- Delete: owner or admin
create policy comments_delete_own_or_admin on public.comments
for delete
to authenticated
using ( user_id = auth.uid() or public.is_admin() );

-- Note:
-- - Requires function public.is_admin() and table public.app_admins created previously.
-- - If your comments table schema differs, adjust user_id/requirement_id/content field names accordingly.