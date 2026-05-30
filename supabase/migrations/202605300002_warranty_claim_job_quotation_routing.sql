-- NANOFIX V28.2 Phase D.4.2
-- Warranty Claim → Job / Quotation Routing
-- Route an already reviewed Customer Portal warranty claim into the original Service Operations flow.

alter table public.service_requests
  add column if not exists warranty_claim_routing_status text check (warranty_claim_routing_status is null or warranty_claim_routing_status in ('not_routed','job_created','quotation_created','closed_rejected','already_routed')),
  add column if not exists warranty_claim_routed_job_id uuid references public.jobs(job_id) on delete set null,
  add column if not exists warranty_claim_routed_quotation_id uuid references public.quotations(quotation_id) on delete set null,
  add column if not exists warranty_claim_routed_by uuid references public.profiles(profile_id) on delete set null,
  add column if not exists warranty_claim_routed_at timestamptz,
  add column if not exists warranty_claim_routing_notes text;

create index if not exists service_requests_warranty_claim_routing_idx
  on public.service_requests(customer_portal_request_type, warranty_claim_decision, warranty_claim_routing_status, created_at desc)
  where request_origin = 'customer_portal';

create index if not exists service_requests_warranty_claim_routed_job_idx
  on public.service_requests(warranty_claim_routed_job_id, warranty_claim_routed_quotation_id, warranty_claim_routed_at desc)
  where warranty_claim_routed_job_id is not null or warranty_claim_routed_quotation_id is not null;

create or replace function public.route_warranty_claim_tx(
  p_service_request_id uuid,
  p_route_action text,
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
  v_request public.service_requests%rowtype;
  v_job_id uuid;
  v_quotation_id uuid;
  v_route_status text;
  v_to_status text;
  v_existing_job_id uuid;
  v_existing_quotation_id uuid;
begin
  if p_actor_role not in ('super_admin','operations_admin','support') then
    raise exception 'Internal warranty claim routing role required';
  end if;

  if p_route_action not in ('create_warranty_job','create_payable_quote','close_rejected_claim','continue_existing_flow') then
    raise exception 'Invalid warranty claim route action: %', p_route_action;
  end if;

  select * into v_request
  from public.service_requests
  where service_request_id = p_service_request_id
  for update;

  if v_request.service_request_id is null then
    raise exception 'Warranty claim service request not found';
  end if;

  if coalesce(v_request.request_origin, '') <> 'customer_portal'
     or coalesce(v_request.customer_portal_request_type, '') <> 'warranty_repair' then
    raise exception 'Only Customer Portal Warranty Claim service requests can be routed here';
  end if;

  if v_request.related_warranty_id is null then
    raise exception 'Warranty claim must be linked to a warranty record';
  end if;

  if v_request.warranty_claim_decision is null then
    raise exception 'Warranty claim must be reviewed before routing';
  end if;

  if v_request.warranty_claim_routing_status in ('job_created','quotation_created','closed_rejected') then
    return jsonb_build_object(
      'service_request_id', p_service_request_id,
      'routing_status', 'already_routed',
      'job_id', v_request.warranty_claim_routed_job_id,
      'quotation_id', v_request.warranty_claim_routed_quotation_id
    );
  end if;

  if p_route_action = 'create_warranty_job' and v_request.warranty_claim_decision <> 'in_warranty' then
    raise exception 'create_warranty_job requires in_warranty decision';
  end if;

  if p_route_action = 'create_payable_quote' and v_request.warranty_claim_decision not in ('out_of_warranty','needs_new_quote') then
    raise exception 'create_payable_quote requires out_of_warranty or needs_new_quote decision';
  end if;

  if p_route_action = 'close_rejected_claim' and v_request.warranty_claim_decision <> 'rejected' then
    raise exception 'close_rejected_claim requires rejected decision';
  end if;

  if p_route_action = 'continue_existing_flow' and v_request.warranty_claim_decision <> 'converted_to_job' then
    raise exception 'continue_existing_flow requires converted_to_job decision';
  end if;

  if p_route_action in ('create_warranty_job','continue_existing_flow') then
    insert into public.jobs (service_request_id, customer_id, status, notes, created_at, updated_at)
    values (
      p_service_request_id,
      v_request.customer_id,
      case when p_route_action = 'create_warranty_job' then 'warranty_repair_scheduled' else 'assigned' end,
      concat('Warranty claim routed from Service Request ', p_service_request_id::text, '. Decision: ', v_request.warranty_claim_decision, '. ', coalesce(p_notes, '')),
      now(),
      now()
    )
    returning job_id into v_job_id;

    v_route_status := 'job_created';
    v_to_status := case when p_route_action = 'create_warranty_job' then 'warranty_job_created' else 'converted_to_job' end;
  elsif p_route_action = 'create_payable_quote' then
    insert into public.jobs (service_request_id, customer_id, status, notes, created_at, updated_at)
    values (
      p_service_request_id,
      v_request.customer_id,
      'quotation_required',
      concat('Warranty claim routed to payable quotation. Decision: ', v_request.warranty_claim_decision, '. ', coalesce(p_notes, '')),
      now(),
      now()
    )
    returning job_id into v_job_id;

    insert into public.quotations (job_id, current_version, total, approval_status)
    values (v_job_id, 1, 0, 'draft')
    returning quotation_id into v_quotation_id;

    insert into public.quotation_versions (quotation_id, version, line_items, total, created_by, approval_log, warranty_years, warranty_terms)
    values (
      v_quotation_id,
      1,
      jsonb_build_array(jsonb_build_object('description', 'Warranty claim out-of-scope assessment / payable repair quotation draft', 'qty', 1, 'unit_price', 0)),
      0,
      p_actor_id,
      jsonb_build_object('source', 'route_warranty_claim_tx', 'service_request_id', p_service_request_id, 'decision', v_request.warranty_claim_decision),
      0,
      'No free warranty coverage confirmed at routing stage. Admin must revise official quotation before sending to customer.'
    );

    v_route_status := 'quotation_created';
    v_to_status := 'quotation_required';
  elsif p_route_action = 'close_rejected_claim' then
    v_route_status := 'closed_rejected';
    v_to_status := 'rejected';
  end if;

  update public.service_requests
  set
    status = v_to_status,
    warranty_claim_routing_status = v_route_status,
    warranty_claim_routed_job_id = v_job_id,
    warranty_claim_routed_quotation_id = v_quotation_id,
    warranty_claim_routed_by = p_actor_id,
    warranty_claim_routed_at = now(),
    warranty_claim_routing_notes = nullif(left(coalesce(p_notes, ''), 1200), ''),
    updated_at = now()
  where service_request_id = p_service_request_id;

  insert into public.status_transition_logs(machine, object_id, from_status, to_status, reason, actor_id, actor_role, ip_address)
  values ('service_request', p_service_request_id, v_request.status, v_to_status, concat('Warranty Claim routing: ', p_route_action, '. ', coalesce(p_notes, '')), p_actor_id, p_actor_role, nullif(p_ip,'')::inet);

  insert into public.audit_logs(actor_id, actor_role, role, action, object_type, object_id, before_data, after_data, before_json, after_json, ip_address)
  values (
    p_actor_id,
    p_actor_role,
    p_actor_role,
    'service_operations_warranty_claim_routing_tx',
    'service_request',
    p_service_request_id,
    jsonb_build_object('status', v_request.status, 'decision', v_request.warranty_claim_decision, 'routing_status', v_request.warranty_claim_routing_status),
    jsonb_build_object('status', v_to_status, 'route_action', p_route_action, 'routing_status', v_route_status, 'job_id', v_job_id, 'quotation_id', v_quotation_id),
    jsonb_build_object('status', v_request.status, 'decision', v_request.warranty_claim_decision, 'routing_status', v_request.warranty_claim_routing_status),
    jsonb_build_object('status', v_to_status, 'route_action', p_route_action, 'routing_status', v_route_status, 'job_id', v_job_id, 'quotation_id', v_quotation_id),
    nullif(p_ip,'')::inet
  );

  return jsonb_build_object(
    'service_request_id', p_service_request_id,
    'route_action', p_route_action,
    'routing_status', v_route_status,
    'from_status', v_request.status,
    'to_status', v_to_status,
    'job_id', v_job_id,
    'quotation_id', v_quotation_id,
    'routed_by', p_actor_id,
    'routed_at', now()
  );
end;
$$;

revoke all on function public.route_warranty_claim_tx(uuid, text, text, uuid, text, text) from public;
grant execute on function public.route_warranty_claim_tx(uuid, text, text, uuid, text, text) to service_role;
