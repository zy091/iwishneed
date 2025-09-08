-- Create core tables for tech and creative requirements, and tech_staff
-- Ensure compatibility with existing views (20250908_1100_views_rpcs.sql) by including status/priority/due_date

create table if not exists public.tech_requirements (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  -- 提交人填写字段
  month text not null,
  submit_time timestamptz default now(),
  expected_completion_time timestamptz,
  urgency text check (urgency in ('高','中','低')),
  submitter_name text not null,
  client_url text,
  description text not null,
  tech_assignee text,
  client_type text check (client_type in ('流量运营服务','全案深度服务')),
  attachments jsonb,
  -- 技术负责人填写
  assignee_estimated_time timestamptz,
  progress text check (progress in ('未开始','处理中','已完成','已沟通延迟')),
  start_time timestamptz,
  end_time timestamptz,
  -- 系统字段
  submitter_id uuid references auth.users(id),
  submitter_avatar text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- 兼容 unified 视图的字段（可为空）
  status text,
  priority text,
  due_date timestamptz
);

create index if not exists idx_tech_requirements_created_at on public.tech_requirements (created_at desc);
create index if not exists idx_tech_requirements_submitter_id on public.tech_requirements (submitter_id);
create index if not exists idx_tech_requirements_progress on public.tech_requirements (progress);
create index if not exists idx_tech_requirements_urgency on public.tech_requirements (urgency);
create index if not exists idx_tech_requirements_client_type on public.tech_requirements (client_type);

create table if not exists public.creative_requirements (
  id uuid primary key default gen_random_uuid(),
  submit_time timestamptz default now(),
  expected_delivery_time timestamptz,
  actual_delivery_time timestamptz,
  submitter_name text not null,
  platform text check (platform in ('GG','FB','CT','网站')),
  status text check (status in ('未开始','处理中','已完成','不做处理')),
  urgency text check (urgency in ('高','中','低')),
  designer text,
  site_name text,
  url_or_product_page text,
  asset_type text check (asset_type in ('Google广告图','Meta广告图','网站Banner图','网站产品图','网站横幅图','联盟营销','EDM营销','Criteo广告图')),
  asset_size text,
  layout_style text,
  asset_count int,
  copy text,
  style_requirements text,
  original_assets text,
  asset_package text,
  remark text,
  reference_examples text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- 系统字段
  submitter_id uuid references auth.users(id),
  -- 兼容 unified 视图的字段（可为空）
  title text,
  description text,
  priority text,
  due_date timestamptz
);

create index if not exists idx_creative_requirements_created_at on public.creative_requirements (created_at desc);
create index if not exists idx_creative_requirements_submitter_id on public.creative_requirements (submitter_id);
create index if not exists idx_creative_requirements_status on public.creative_requirements (status);
create index if not exists idx_creative_requirements_urgency on public.creative_requirements (urgency);
create index if not exists idx_creative_requirements_platform on public.creative_requirements (platform);

create table if not exists public.tech_staff (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  department text not null check (department in ('技术部','创意部')),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- RLS helpers
create table if not exists public.app_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create or replace function public.is_admin() returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.app_admins a where a.user_id = auth.uid());
$$;

-- Enable RLS and policies for tech_requirements
alter table public.tech_requirements enable row level security;

drop policy if exists tech_select on public.tech_requirements;
drop policy if exists tech_insert_own on public.tech_requirements;
drop policy if exists tech_update_own_or_admin on public.tech_requirements;
drop policy if exists tech_delete_own_or_admin on public.tech_requirements;

create policy tech_select on public.tech_requirements
for select to authenticated using (true);

create policy tech_insert_own on public.tech_requirements
for insert to authenticated
with check (submitter_id = auth.uid());

create policy tech_update_own_or_admin on public.tech_requirements
for update to authenticated
using (submitter_id = auth.uid() or public.is_admin())
with check (submitter_id = auth.uid() or public.is_admin());

create policy tech_delete_own_or_admin on public.tech_requirements
for delete to authenticated
using (submitter_id = auth.uid() or public.is_admin());

-- Enable RLS and policies for creative_requirements
alter table public.creative_requirements enable row level security;

drop policy if exists cr_select on public.creative_requirements;
drop policy if exists cr_insert_own on public.creative_requirements;
drop policy if exists cr_update_own_or_admin on public.creative_requirements;
drop policy if exists cr_delete_own_or_admin on public.creative_requirements;

create policy cr_select on public.creative_requirements
for select to authenticated using (true);

create policy cr_insert_own on public.creative_requirements
for insert to authenticated
with check (submitter_id = auth.uid());

create policy cr_update_own_or_admin on public.creative_requirements
for update to authenticated
using (submitter_id = auth.uid() or public.is_admin())
with check (submitter_id = auth.uid() or public.is_admin());

create policy cr_delete_own_or_admin on public.creative_requirements
for delete to authenticated
using (submitter_id = auth.uid() or public.is_admin());