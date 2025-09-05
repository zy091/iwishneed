-- Roles table
create table if not exists public.roles (
  id int primary key,
  name text not null unique,
  permissions jsonb default '{}'::jsonb
);

-- Seed roles if missing
insert into public.roles (id, name) values
  (0, '超级管理员'),
  (1, '管理员'),
  (2, '经理'),
  (3, '开发者'),
  (4, '提交者')
on conflict (id) do nothing;

-- Profiles linked to auth.users
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text,
  role_id int not null default 3 references public.roles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Trigger to update updated_at
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;
drop trigger if exists trg_profiles_updated on public.profiles;
create trigger trg_profiles_updated before update on public.profiles
for each row execute function public.set_updated_at();

-- RLS
alter table public.profiles enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='profiles' and policyname='profiles_read_own_or_admin') then
    create policy profiles_read_own_or_admin on public.profiles
      for select using (
        auth.uid() = id
        or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role_id in (0,1))
      );
  end if;

  if not exists (select 1 from pg_policies where schemaname='public' and tablename='profiles' and policyname='profiles_update_own') then
    create policy profiles_update_own on public.profiles
      for update using (auth.uid() = id)
      with check (auth.uid() = id);
  end if;

  if not exists (select 1 from pg_policies where schemaname='public' and tablename='profiles' and policyname='profiles_admin_all') then
    create policy profiles_admin_all on public.profiles
      for all using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role_id in (0,1)))
      with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role_id in (0,1)));
  end if;
end $$;

-- Admin check function
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role_id in (0,1)
  )
$$;

-- Generic SQL exec for service role (used only inside Edge Function with service headers)
-- NOTE: to keep controllable, restrict usage via SECURITY DEFINER and RLS won't apply to auth schema anyway
create or replace function public.exec_sql(q text)
returns json
language plpgsql
security definer
as $$
declare result json;
begin
  execute q into result;
  return coalesce(result, '[]'::json);
end $$;

revoke all on function public.exec_sql(text) from public, anon, authenticated;
grant execute on function public.exec_sql(text) to service_role;

-- Users public view (masked email)
create or replace view public.users_public as
select
  au.id,
  split_part(au.email, '@', 1) || '***@' || split_part(au.email, '@', 2) as email_masked,
  p.name,
  p.role_id,
  au.last_sign_in_at,
  au.created_at
from auth.users au
join public.profiles p on au.id = p.id;

-- Comments & attachments RLS tightening (only if tables exist)
do $$
begin
  if to_regclass('public.comments') is not null then
    alter table public.comments enable row level security;
    if not exists (select 1 from pg_policies where schemaname='public' and tablename='comments' and policyname='comments_read_all') then
      create policy comments_read_all on public.comments for select using (true);
    end if;
    if not exists (select 1 from pg_policies where schemaname='public' and tablename='comments' and policyname='comments_insert_auth') then
      create policy comments_insert_auth on public.comments for insert with check (auth.role() = 'authenticated');
    end if;
    if not exists (select 1 from pg_policies where schemaname='public' and tablename='comments' and policyname='comments_delete_owner_or_admin') then
      create policy comments_delete_owner_or_admin on public.comments for delete using (
        (user_id = auth.uid() or user_external_id::text = auth.uid()::text)
        or public.is_admin()
      );
    end if;
  end if;

  if to_regclass('public.comment_attachments') is not null then
    alter table public.comment_attachments enable row level security;
    if not exists (select 1 from pg_policies where schemaname='public' and tablename='comment_attachments' and policyname='comment_attachments_read_all') then
      create policy comment_attachments_read_all on public.comment_attachments for select using (true);
    end if;
    if not exists (select 1 from pg_policies where schemaname='public' and tablename='comment_attachments' and policyname='comment_attachments_insert_auth') then
      create policy comment_attachments_insert_auth on public.comment_attachments for insert with check (auth.role() = 'authenticated');
    end if;
    if not exists (select 1 from pg_policies where schemaname='public' and tablename='comment_attachments' and policyname='comment_attachments_delete_owner_or_admin') then
      create policy comment_attachments_delete_owner_or_admin on public.comment_attachments for delete using (
        exists (select 1 from public.comments c where c.id = comment_id and (c.user_id = auth.uid() or c.user_external_id::text = auth.uid()::text))
        or public.is_admin()
      );
    end if;
  end if;
end $$;

-- Audit logs for admin actions
create table if not exists public.admin_audit_logs (
  id bigserial primary key,
  actor_id uuid not null,
  action text not null,
  target_user_id uuid,
  payload jsonb,
  created_at timestamptz not null default now()
);