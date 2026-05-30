-- NANOFIX V28.2 Phase D.4.1
-- Warranty Claim Admin Review Decision
-- Customer warranty claims remain normal service_requests. Internal Admin records the review decision and pushes the same record back into the original Service Operations flow.

alter table public.service_requests
  add column if not exists warranty_claim_decision text check (warranty_claim_decision is null or warranty_claim_decision in ('in_warranty','out_of_warranty','needs_new_quote','rejected','converted_to_job')),
  add column if not exists warranty_claim_next_action text check (warranty_claim_next_action is null or warranty_claim_next_action in ('schedule_repair_under_warranty','prepare_new_quotation','close_rejected_claim','continue_original_job_flow')),
  add column if not exists warranty_claim_decision_notes text,
  add column if not exists warranty_claim_reviewed_by uuid references public.profiles(profile_id) on delete set null,
  add column if not exists warranty_claim_reviewed_at timestamptz;

create index if not exists service_requests_warranty_claim_review_idx
  on public.service_requests(customer_portal_request_type, warranty_claim_decision, status, created_at desc)
  where request_origin = 'customer_portal';

create index if not exists service_requests_warranty_claim_reviewer_idx
  on public.service_requests(warranty_claim_reviewed_by, warranty_claim_reviewed_at desc)
  where warranty_claim_reviewed_by is not null;

create or replace function public.review_warranty_claim_tx(
  p_service_request_id uuid,
  p_decision text,
  p_notes text,
  p_actor_id uuid,
  p_actor_role text,
  p_ip text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_before public.service_requests%rowtype;
  v_to_status text;
  v_next_action text;
begin
  if p_actor_role not in ('super_admin','operations_admin','support') then
    raise exception 'Internal warranty claim review role required';
  end if;

  if p_decision not in ('in_warranty','out_of_warranty','needs_new_quote','rejected','converted_to_job') then
    raise exception 'Invalid warranty claim decision: %', p_decision;
  end if;

  select * into v_before
  from public.service_requests
  where service_request_id = p_service_request_id
  for update;

  if v_before.service_request_id is null then
    raise exception 'Warranty claim service request not found';
  end if;

  if coalesce(v_before.request_origin, '') <> 'customer_portal'
     or coalesce(v_before.customer_portal_request_type, '') <> 'warranty_repair' then
    raise exception 'Only Customer Portal Warranty Claim service requests can be reviewed here';
  end if;

  if v_before.related_warranty_id is null then
    raise exception 'Warranty claim must be linked to a warranty record';
  end if;

  v_to_status := case p_decision
    when 'in_warranty' then 'warranty_approved'
    when 'out_of_warranty' then 'quotation_required'
    when 'needs_new_quote' then 'quotation_required'
    when 'rejected' then 'rejected'
    when 'converted_to_job' then 'converted_to_job'
  end;

  v_next_action := case p_decision
    when 'in_warranty' then 'schedule_repair_under_warranty'
    when 'out_of_warranty' then 'prepare_new_quotation'
    when 'needs_new_quote' then 'prepare_new_quotation'
    when 'rejected' then 'close_rejected_claim'
    when 'converted_to_job' then 'continue_original_job_flow'
  end;

  update public.service_requests
  set
    status = v_to_status,
    warranty_claim_decision = p_decision,
    warranty_claim_next_action = v_next_action,
    warranty_claim_decision_notes = nullif(left(coalesce(p_notes, ''), 1200), ''),
    warranty_claim_reviewed_by = p_actor_id,
    warranty_claim_reviewed_at = now(),
    updated_at = now()
  where service_request_id = p_service_request_id;

  insert into public.status_transition_logs(machine, object_id, from_status, to_status, reason, actor_id, actor_role, ip_address)
  values ('service_request', p_service_request_id, v_before.status, v_to_status, concat('Warranty Claim decision: ', p_decision, '. ', coalesce(p_notes, '')), p_actor_id, p_actor_role, nullif(p_ip,'')::inet);

  insert into public.audit_logs(actor_id, actor_role, role, action, object_type, object_id, before_data, after_data, before_json, after_json, ip_address)
  values (
    p_actor_id,
    p_actor_role,
    p_actor_role,
    'service_operations_warranty_claim_decision_tx',
    'service_request',
    p_service_request_id,
    jsonb_build_object('status', v_before.status, 'warranty_claim_decision', v_before.warranty_claim_decision, 'warranty_claim_next_action', v_before.warranty_claim_next_action),
    jsonb_build_object('status', v_to_status, 'warranty_claim_decision', p_decision, 'warranty_claim_next_action', v_next_action, 'notes', p_notes),
    jsonb_build_object('status', v_before.status, 'warranty_claim_decision', v_before.warranty_claim_decision, 'warranty_claim_next_action', v_before.warranty_claim_next_action),
    jsonb_build_object('status', v_to_status, 'warranty_claim_decision', p_decision, 'warranty_claim_next_action', v_next_action, 'notes', p_notes),
    nullif(p_ip,'')::inet
  );

  return jsonb_build_object(
    'service_request_id', p_service_request_id,
    'from_status', v_before.status,
    'to_status', v_to_status,
    'decision', p_decision,
    'next_action', v_next_action,
    'reviewed_by', p_actor_id,
    'reviewed_at', now()
  );
end;
$$;

revoke all on function public.review_warranty_claim_tx(uuid, text, text, uuid, text, text) from public;
grant execute on function public.review_warranty_claim_tx(uuid, text, text, uuid, text, text) to service_role;
