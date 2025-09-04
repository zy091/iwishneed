-- Comments: add user_id, backfill, and RLS policies (owner-or-admin)
-- Safe to re-run: IF NOT EXISTS, DROP POLICY IF EXISTS used

-- Ensure helper exists
create table if not exists public.app_admins (
  user_id uuid primary key references auth.users(id) on delete cascade
);

create or replace function public.is_admin() returns boolean
language sql stable as $$
  select exists(select 1 from public.app_admins a where a.user_id = auth.uid());
$$;

-- Ensure user_id column
alter table if exists public.comments
  add column if not exists user_id uuid;

-- Backfill user_id from legacy user_external_id when it looks like uuid
update public.comments
set user_id = coalesce(user_id, nullif(user_external_id, '')::uuid)
where user_id is null
  and user_external_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$';

create index if not exists idx_comments_user_id on public.comments(user_id);

-- Enable RLS
alter table if exists public.comments enable row level security;

-- Policies for comments
drop policy if exists cmt_select on public.comments;
create policy cmt_select on public.comments
for select using (true);

drop policy if exists cmt_insert on public.comments;
create policy cmt_insert on public.comments
for insert
with check (auth.uid() is not null and (user_id is null or user_id = auth.uid()));

drop policy if exists cmt_update on public.comments;
create policy cmt_update on public.comments
for update
using (public.is_admin() or user_id = auth.uid());

drop policy if exists cmt_delete on public.comments;
create policy cmt_delete on public.comments
for delete
using (public.is_admin() or user_id = auth.uid());

-- Attachments RLS (owner follows its parent comment)
alter table if exists public.comment_attachments enable row level security;

drop policy if exists cmt_att_select on public.comment_attachments;
create policy cmt_att_select on public.comment_attachments
for select using (true);

drop policy if exists cmt_att_insert on public.comment_attachments;
create policy cmt_att_insert on public.comment_attachments
for insert
with check (
  exists (
    select 1 from public.comments c
    where c.id = comment_attachments.comment_id
      and (public.is_admin() or c.user_id = auth.uid())
  )
);

drop policy if exists cmt_att_update on public.comment_attachments;
create policy cmt_att_update on public.comment_attachments
for update
using (
  exists (
    select 1 from public.comments c
    where c.id = comment_attachments.comment_id
      and (public.is_admin() or c.user_id = auth.uid())
  )
);

drop policy if exists cmt_att_delete on public.comment_attachments;
create policy cmt_att_delete on public.comment_attachments
for delete
using (
  exists (
    select 1 from public.comments c
    where c.id = comment_attachments.comment_id
      and (public.is_admin() or c.user_id = auth.uid())
  )
);