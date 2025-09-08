-- 收紧 app_settings 的写入权限：仅管理员可写
-- 依赖已存在的 is_admin() 函数

-- 确保 RLS 已开启
alter table if exists public.app_settings enable row level security;

-- 读取策略保持：认证用户可读
do $$ begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'app_settings' and policyname = 'app_settings_select'
  ) then
    create policy app_settings_select on public.app_settings
      for select using (auth.role() = 'authenticated');
  end if;
end $$;

-- 先删除旧的宽松 upsert 策略（若存在）
do $$ begin
  if exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'app_settings' and policyname = 'app_settings_upsert'
  ) then
    drop policy app_settings_upsert on public.app_settings;
  end if;
end $$;

-- 新建严格 upsert 策略：仅管理员可写
create policy app_settings_admin_upsert on public.app_settings
  for all
  using (is_admin())
  with check (is_admin());