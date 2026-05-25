revoke execute on function public.current_profile_id() from public, anon, authenticated;
revoke execute on function public.current_profile_role() from public, anon, authenticated;
revoke execute on function public.is_admin() from public, anon, authenticated;
revoke execute on function public.handle_new_auth_user() from public, anon, authenticated;
revoke execute on function public.log_status_transition(text,text,uuid,text,text,text,uuid,text,inet) from public, anon, authenticated;
revoke execute on function public.record_module_health_snapshot(text) from public, anon, authenticated;

grant execute on function public.current_profile_id() to service_role;
grant execute on function public.current_profile_role() to service_role;
grant execute on function public.is_admin() to service_role;
grant execute on function public.handle_new_auth_user() to service_role;
grant execute on function public.log_status_transition(text,text,uuid,text,text,text,uuid,text,inet) to service_role;
grant execute on function public.record_module_health_snapshot(text) to service_role;

drop view if exists public.latest_module_health;
create view public.latest_module_health
with (security_invoker = true)
as
select distinct on (module_key, check_name)
  health_event_id,
  module_key,
  check_name,
  status,
  message,
  latency_ms,
  metadata,
  created_at
from public.module_health_events
order by module_key, check_name, created_at desc;
