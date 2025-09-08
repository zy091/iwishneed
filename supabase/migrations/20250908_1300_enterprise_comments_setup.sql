-- Enterprise setup for comments, views, RLS, RPC, and storage
-- Safe/idempotent where possible

-- 1) Ensure comments table has required columns
create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  requirement_id uuid not null,
  content text not null,
  parent_id uuid null,
  user_id uuid null,
  user_external_id text null,
  user_email text null,
  attachments_count int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Columns add-if-missing
do $$
begin
  if not exists(select 1 from information_schema.columns where table_schema='public' and table_name='comments' and column_name='parent_id') then
    alter table public.comments add column parent_id uuid null;
  end if;
  if not exists(select 1 from information_schema.columns where table_schema='public' and table_name='comments' and column_name='user_id') then
    alter table public.comments add column user_id uuid null;
  end if;
  if not exists(select 1 from information_schema.columns where table_schema='public' and table_name='comments' and column_name='user_external_id') then
    alter table public.comments add column user_external_id text null;
  end if;
  if not exists(select 1 from information_schema.columns where table_schema='public' and table_name='comments' and column_name='user_email') then
    alter table public.comments add column user_email text null;
  end if;
  if not exists(select 1 from information_schema.columns where table_schema='public' and table_name='comments' and column_name='attachments_count') then
    alter table public.comments add column attachments_count int not null default 0;
  end if;
  if not exists(select 1 from information_schema.columns where table_schema='public' and table_name='comments' and column_name='updated_at') then
    alter table public.comments add column updated_at timestamptz not null default now();
  end if;
end$$;

-- helpful indexes
create index if not exists idx_comments_req on public.comments(requirement_id, created_at desc);
create index if not exists idx_comments_parent on public.comments(parent_id);

-- 2) Ensure comment_attachments table
create table if not exists public.comment_attachments (
  id uuid primary key default gen_random_uuid(),
  comment_id uuid not null references public.comments(id) on delete cascade,
  file_path text not null,
  file_name text not null,
  mime_type text not null,
  size bigint not null,
  created_at timestamptz not null default now()
);
create index if not exists idx_cmt_att_cid on public.comment_attachments(comment_id);

-- 3) Mask email function and views
create or replace function public.mask_email(email text)
returns text
language sql immutable as $$
  select case
    when email is null or position('@' in email)=0 then '匿名用户'
    when length(split_part(email,'@',1)) <= 2
      then left(split_part(email,'@',1),1) || '***@' || split_part(email,'@',2)
    else left(split_part(email,'@',1),1) || repeat('*',3) || right(split_part(email,'@',1),1) || '@' || split_part(email,'@',2)
  end
$$;

create or replace view public.comments_public as
select
  c.id,
  c.requirement_id,
  c.content,
  c.parent_id,
  coalesce(c.user_external_id::text, c.user_id::text) as user_external_id,
  c.user_email,
  public.mask_email(c.user_email) as user_email_masked,
  c.created_at,
  c.updated_at,
  c.attachments_count
from public.comments c;

create or replace view public.comment_attachments_public as
select
  id, comment_id, file_path, file_name, mime_type, size, created_at
from public.comment_attachments;

-- 4) RLS: enable and unify (strict write via functions)
alter table public.comments enable row level security;
alter table public.comment_attachments enable row level security;

-- Drop conflicting legacy policies if exist (safe)
do $$
begin
  if exists (select 1 from pg_policies where schemaname='public' and tablename='comments' and policyname='comments_select') then
    drop policy comments_select on public.comments;
  end if;
  if exists (select 1 from pg_policies where schemaname='public' and tablename='comments' and policyname='cmt_select') then
    drop policy cmt_select on public.comments;
  end if;
  if exists (select 1 from pg_policies where schemaname='public' and tablename='comments' and policyname in ('comments_insert_own','cmt_insert')) then
    drop policy comments_insert_own on public.comments;
    exception when undefined_object then null;
  end;
end$$;

-- Recreate consistent policies
do $$
begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='comments' and policyname='comments_read_all_auth') then
    create policy comments_read_all_auth on public.comments
      for select to authenticated using (true);
  end if;

  -- Strict mode: deny direct insert from authenticated; edge functions w/ service role bypass RLS
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='comments' and policyname='comments_insert_deny_auth') then
    create policy comments_insert_deny_auth on public.comments
      for insert to authenticated with check (false);
  end if;

  if not exists (select 1 from pg_policies where schemaname='public' and tablename='comments' and policyname='comments_update_own_or_admin') then
    create policy comments_update_own_or_admin on public.comments
      for update to authenticated
      using (auth.uid() = user_id or public.is_admin())
      with check (auth.uid() = user_id or public.is_admin());
  end if;

  if not exists (select 1 from pg_policies where schemaname='public' and tablename='comments' and policyname='comments_delete_own_or_admin') then
    create policy comments_delete_own_or_admin on public.comments
      for delete to authenticated
      using (auth.uid() = user_id or public.is_admin());
  end if;
end$$;

-- Attachments policies
do $$
begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='comment_attachments' and policyname='cmt_att_select_auth') then
    create policy cmt_att_select_auth on public.comment_attachments
      for select to authenticated using (true);
  end if;

  if not exists (select 1 from pg_policies where schemaname='public' and tablename='comment_attachments' and policyname='cmt_att_insert_deny_auth') then
    create policy cmt_att_insert_deny_auth on public.comment_attachments
      for insert to authenticated with check (false);
  end if;

  if not exists (select 1 from pg_policies where schemaname='public' and tablename='comment_attachments' and policyname='cmt_att_delete_admin') then
    create policy cmt_att_delete_admin on public.comment_attachments
      for delete to authenticated using (public.is_admin());
  end if;
end$$;

-- 5) is_admin (unified) based on profiles.role_id in (0,1)
create or replace function public.is_admin() returns boolean
language sql stable as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role_id in (0,1)
  )
$$;

-- 6) get_current_user_profile (used by frontend)
create or replace function public.get_current_user_profile()
returns table (id uuid, name text, role_id int4, rolename text)
language sql stable as $$
  select p.id, p.name, p.role_id,
    case p.role_id
      when 0 then '超级管理员'
      when 1 then '管理员'
      when 2 then '经理'
      when 3 then '开发者'
      else '提交者' end as rolename
  from public.profiles p
  where p.id = auth.uid()
$$;

-- 7) Storage bucket for comments attachments (private)
-- Create bucket if missing
insert into storage.buckets (id, name, public)
select 'comments-attachments','comments-attachments', false
where not exists (select 1 from storage.buckets where id='comments-attachments');

-- Storage policies for bucket (authenticated access; service role generates signed urls/uploads)
do $$
begin
  if not exists (select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='storage_comments_select') then
    create policy storage_comments_select on storage.objects
    for select to authenticated
    using (bucket_id = 'comments-attachments');
  end if;

  if not exists (select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='storage_comments_insert') then
    create policy storage_comments_insert on storage.objects
    for insert to authenticated
    with check (bucket_id = 'comments-attachments');
  end if;

  if not exists (select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='storage_comments_update') then
    create policy storage_comments_update on storage.objects
    for update to authenticated
    using (bucket_id='comments-attachments')
    with check (bucket_id='comments-attachments');
  end if;

  if not exists (select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='storage_comments_delete') then
    create policy storage_comments_delete on storage.objects
    for delete to authenticated
    using (bucket_id='comments-attachments');
  end if;
end$$;