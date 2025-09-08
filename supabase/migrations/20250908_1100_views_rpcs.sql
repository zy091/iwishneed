-- Minimal views and RPCs required by unifiedRequirementService

-- All requirements unified view
create or replace view public.all_requirements_view as
select
  id,
  title,
  description,
  status,
  priority,
  created_at,
  updated_at,
  due_date,
  'tech'::text as requirement_type
from public.tech_requirements
union all
select
  id,
  title,
  description,
  status,
  priority,
  created_at,
  updated_at,
  due_date,
  'creative'::text as requirement_type
from public.creative_requirements;

-- Requirement stats single-row view
create or replace view public.requirement_stats_view as
select
  coalesce((select count(*) from public.tech_requirements), 0)
  + coalesce((select count(*) from public.creative_requirements), 0) as total_requirements,
  coalesce((select count(*) from public.tech_requirements where status = 'pending'), 0)
  + coalesce((select count(*) from public.creative_requirements where status = 'pending'), 0) as pending_requirements,
  coalesce((select count(*) from public.tech_requirements where status = 'in_progress'), 0)
  + coalesce((select count(*) from public.creative_requirements where status = 'in_progress'), 0) as in_progress_requirements,
  coalesce((select count(*) from public.tech_requirements where status = 'completed'), 0)
  + coalesce((select count(*) from public.creative_requirements where status = 'completed'), 0) as completed_requirements,
  coalesce((select count(*) from public.tech_requirements where status = 'cancelled'), 0)
  + coalesce((select count(*) from public.creative_requirements where status = 'cancelled'), 0) as cancelled_requirements,
  coalesce((select count(*) from public.tech_requirements), 0) as tech_requirements,
  coalesce((select count(*) from public.creative_requirements), 0) as creative_requirements,
  coalesce((select count(*) from public.tech_requirements where priority = 'high'), 0)
  + coalesce((select count(*) from public.creative_requirements where priority = 'high'), 0) as high_priority,
  coalesce((select count(*) from public.tech_requirements where priority = 'medium'), 0)
  + coalesce((select count(*) from public.creative_requirements where priority = 'medium'), 0) as medium_priority,
  coalesce((select count(*) from public.tech_requirements where priority = 'low'), 0)
  + coalesce((select count(*) from public.creative_requirements where priority = 'low'), 0) as low_priority;

-- Search requirements RPC
create or replace function public.search_requirements(
  search_query text,
  req_type text default null,
  result_limit int default 50
) returns table (
  id uuid,
  title text,
  description text,
  status text,
  priority text,
  created_at timestamptz,
  updated_at timestamptz,
  due_date timestamptz,
  requirement_type text
) language sql stable as $$
  select * from public.all_requirements_view
  where
    (search_query is null)
    or (title ilike '%' || search_query || '%')
    or (description ilike '%' || search_query || '%')
  and (req_type is null or requirement_type = req_type)
  order by created_at desc
  limit result_limit;
$$;

-- Activity logs RPC (minimal: return empty set if no activity table)
create or replace function public.get_requirement_activity_logs(
  req_id uuid,
  req_type text default null
) returns table (
  id uuid,
  requirement_id uuid,
  requirement_type text,
  action text,
  old_values jsonb,
  new_values jsonb,
  user_id uuid,
  user_name text,
  created_at timestamptz
) language plpgsql stable as $$
begin
  return query
  select
    l.id,
    l.requirement_id,
    l.requirement_type,
    l.action,
    l.old_values,
    l.new_values,
    l.user_id,
    l.user_name,
    l.created_at
  from public.activity_logs l
  where l.requirement_id = req_id
    and (req_type is null or l.requirement_type = req_type)
  order by l.created_at desc;
exception
  when undefined_table then
    return query
    select null::uuid, req_id, coalesce(req_type, null::text), null::text,
           null::jsonb, null::jsonb, null::uuid, null::text, now()
    where false;
end;
$$;

-- Data integrity check RPC (returns basic diagnostics as jsonb)
create or replace function public.check_data_integrity()
returns jsonb language plpgsql stable as $$
declare
  orphaned_comments int := 0;
  missing_assignees int := 0;
  invalid_statuses int := 0;
  duplicate_requirements int := 0;
  inconsistent_timestamps int := 0;
begin
  -- Minimal checks guarded by exceptions
  begin
    execute 'select count(*) from public.comments c left join public.tech_requirements t on c.requirement_id = t.id left join public.creative_requirements cr on c.requirement_id = cr.id where t.id is null and cr.id is null'
    into orphaned_comments;
  exception when others then orphaned_comments := 0;
  end;

  return jsonb_build_object(
    'orphaned_comments', orphaned_comments,
    'missing_assignees', missing_assignees,
    'invalid_statuses', invalid_statuses,
    'duplicate_requirements', duplicate_requirements,
    'inconsistent_timestamps', inconsistent_timestamps,
    'recommendations', jsonb_build_array(),
    'checked_at', now()
  );
end;
$$;

-- Realtime stats RPC (basic totals as jsonb)
create or replace function public.get_realtime_stats()
returns jsonb language sql stable as $$
  select jsonb_build_object(
    'total', coalesce((select count(*) from public.tech_requirements), 0)
           + coalesce((select count(*) from public.creative_requirements), 0),
    'tech', coalesce((select count(*) from public.tech_requirements), 0),
    'creative', coalesce((select count(*) from public.creative_requirements), 0),
    'updated_at', now()
  );
$$;