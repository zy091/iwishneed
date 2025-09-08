-- app_settings: 存储系统设置 key/value
create table if not exists public.app_settings (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.app_settings enable row level security;

-- 简单策略：认证用户可读；暂时允许认证用户写（后续可加 is_admin()）
do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'app_settings' and policyname = 'app_settings_select') then
    create policy app_settings_select on public.app_settings
      for select using (auth.role() = 'authenticated');
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'app_settings' and policyname = 'app_settings_upsert') then
    create policy app_settings_upsert on public.app_settings
      for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
  end if;
end $$;