-- NANOFIX V28.2 Phase D.4.10
-- Warranty Claim Completion & Closure
-- Adds completion/closure fields and transactional closure RPC for Customer Portal warranty_repair service requests.

alter table public.service_requests
  add column if not exists warranty_claim_closure_status text not null default 'open',
  add column if not exists warranty_claim_completed_at timestamptz,
  add column if not exists warranty_claim_closed_at timestamptz,
  add column if not exists warranty_claim_closed_by uuid references public.profiles(profile_id) on delete set null,
  add column if not exists warranty_claim_completion_summary text,
  add column if not exists warranty_claim_closure_notes text;

create index if not exists service_requests_warranty_claim_closure_idx
  on public.service_requests(customer_portal_request_type, warranty_claim_closure_status, warranty_claim_completed_at desc)
  where customer_portal_request_type = 'warranty_repair';

create or replace function public.close_warranty_claim_tx(
  p_service_request_id uuid,
  p_actor_profile_id uuid,
  p_actor_role text,
  p_closure_status text default 'completed',
  p_completion_summary text default null,
  p_closure_notes text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_request public.service_requests%rowtype;
  v_now timestamptz := now();
  v_status text := coalesce(nullif(trim(p_closure_status), ''), 'completed');
  v_before jsonb;
  v_after jsonb;
begin
  if p_actor_role not in ('super_admin','operations_admin','support') then
    raise exception 'Only internal manager roles can close warranty claims.';
  end if;

  if v_status not in ('completed','closed','cancelled','reopened') then
    raise exception 'Unsupported warranty claim closure status: %', v_status;
  end if;

  select * into v_request
  from public.service_requests
  where service_request_id = p_service_request_id
  for update;

  if not found then
    raise exception 'Warranty claim service request not found.';
  end if;

  if coalesce(v_request.request_origin, '') <> 'customer_portal'
     or coalesce(v_request.customer_portal_request_type, '') <> 'warranty_repair' then
    raise exception 'Only Customer Portal warranty_repair service requests can be closed here.';
  end if;

  v_before := to_jsonb(v_request);

  update public.service_requests
  set
    status = case
      when v_status in ('completed','closed') then 'completed'
      when v_status = 'cancelled' then 'cancelled'
      when v_status = 'reopened' then 'in_progress'
      else status
    end,
    warranty_claim_closure_status = v_status,
    warranty_claim_completed_at = case when v_status in ('completed','closed') then coalesce(warranty_claim_completed_at, v_now) else warranty_claim_completed_at end,
    warranty_claim_closed_at = case when v_status in ('completed','closed','cancelled') then v_now else null end,
    warranty_claim_closed_by = p_actor_profile_id,
    warranty_claim_completion_summary = nullif(trim(coalesce(p_completion_summary, '')), ''),
    warranty_claim_closure_notes = nullif(trim(coalesce(p_closure_notes, '')), ''),
    updated_at = v_now
  where service_request_id = p_service_request_id
  returning to_jsonb(service_requests.*) into v_after;

  insert into public.status_transition_logs(
    object_type,
    object_id,
    from_status,
    to_status,
    actor_id,
    actor_role,
    reason,
    metadata_json
  ) values (
    'service_request',
    p_service_request_id,
    v_request.status,
    v_after ->> 'status',
    p_actor_profile_id,
    p_actor_role,
    'warranty_claim_completion_closure',
    jsonb_build_object(
      'closure_status', v_status,
      'completion_summary', p_completion_summary,
      'closure_notes', p_closure_notes,
      'customer_portal_request_type', 'warranty_repair'
    )
  );

  insert into public.audit_logs(
    actor_id,
    role,
    action,
    object_type,
    object_id,
    before_json,
    after_json
  ) values (
    p_actor_profile_id,
    p_actor_role,
    'service_operations_warranty_claim_close_tx',
    'service_request',
    p_service_request_id,
    v_before,
    v_after
  );

  return jsonb_build_object('ok', true, 'service_request', v_after, 'closure_status', v_status);
end;
$$;

revoke all on function public.close_warranty_claim_tx(uuid, uuid, text, text, text, text) from public;
grant execute on function public.close_warranty_claim_tx(uuid, uuid, text, text, text, text) to authenticated, service_role;
