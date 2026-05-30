-- NANOFIX V28.2 Phase D.5
-- Customer Portal Warranty Claim Acceptance / Satisfaction Confirmation
-- Customers can confirm whether a completed warranty repair is satisfactory. This never edits quotation, invoice, warranty or payment records.

alter table public.service_requests
  add column if not exists warranty_claim_customer_satisfaction_status text not null default 'pending',
  add column if not exists warranty_claim_customer_satisfaction_rating integer,
  add column if not exists warranty_claim_customer_satisfaction_notes text,
  add column if not exists warranty_claim_customer_confirmed_at timestamptz,
  add column if not exists warranty_claim_customer_reopened_at timestamptz,
  add column if not exists warranty_claim_customer_reopen_reason text;

alter table public.service_requests
  drop constraint if exists service_requests_warranty_claim_satisfaction_status_chk;

alter table public.service_requests
  add constraint service_requests_warranty_claim_satisfaction_status_chk
  check (warranty_claim_customer_satisfaction_status in ('pending','satisfied','not_satisfied','reopened'));

alter table public.service_requests
  drop constraint if exists service_requests_warranty_claim_satisfaction_rating_chk;

alter table public.service_requests
  add constraint service_requests_warranty_claim_satisfaction_rating_chk
  check (warranty_claim_customer_satisfaction_rating is null or warranty_claim_customer_satisfaction_rating between 1 and 5);

create index if not exists service_requests_warranty_claim_satisfaction_idx
  on public.service_requests(customer_portal_request_type, warranty_claim_customer_satisfaction_status, warranty_claim_customer_confirmed_at desc)
  where customer_portal_request_type = 'warranty_repair';

create or replace function public.confirm_warranty_claim_satisfaction_tx(
  p_service_request_id uuid,
  p_customer_profile_id uuid,
  p_satisfaction_status text,
  p_rating integer default null,
  p_notes text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_request public.service_requests%rowtype;
  v_customer public.customers%rowtype;
  v_now timestamptz := now();
  v_status text := coalesce(nullif(trim(p_satisfaction_status), ''), 'satisfied');
  v_before jsonb;
  v_after jsonb;
begin
  if v_status not in ('satisfied','not_satisfied') then
    raise exception 'Unsupported warranty satisfaction status: %', v_status;
  end if;

  if p_rating is not null and (p_rating < 1 or p_rating > 5) then
    raise exception 'Rating must be between 1 and 5.';
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
    raise exception 'Only Customer Portal warranty_repair service requests can be confirmed here.';
  end if;

  select * into v_customer
  from public.customers
  where customer_id = v_request.customer_id
    and profile_id = p_customer_profile_id
    and account_status = 'active'
  limit 1;

  if not found then
    raise exception 'This warranty claim is not linked to the active customer profile.';
  end if;

  if coalesce(v_request.warranty_claim_closure_status, 'open') not in ('completed','closed') then
    raise exception 'Customer satisfaction confirmation is allowed only after warranty claim completion or closure.';
  end if;

  v_before := to_jsonb(v_request);

  update public.service_requests
  set
    warranty_claim_customer_satisfaction_status = case when v_status = 'satisfied' then 'satisfied' else 'not_satisfied' end,
    warranty_claim_customer_satisfaction_rating = p_rating,
    warranty_claim_customer_satisfaction_notes = nullif(trim(coalesce(p_notes, '')), ''),
    warranty_claim_customer_confirmed_at = v_now,
    warranty_claim_customer_reopened_at = case when v_status = 'not_satisfied' then v_now else warranty_claim_customer_reopened_at end,
    warranty_claim_customer_reopen_reason = case when v_status = 'not_satisfied' then nullif(trim(coalesce(p_notes, '')), '') else warranty_claim_customer_reopen_reason end,
    warranty_claim_closure_status = case when v_status = 'not_satisfied' then 'reopened' else warranty_claim_closure_status end,
    status = case when v_status = 'not_satisfied' then 'in_progress' else status end,
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
    p_customer_profile_id,
    'customer',
    'warranty_claim_customer_satisfaction_confirmation',
    jsonb_build_object(
      'satisfaction_status', v_status,
      'rating', p_rating,
      'notes', p_notes,
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
    p_customer_profile_id,
    'customer',
    'customer_portal_warranty_claim_satisfaction_confirm_tx',
    'service_request',
    p_service_request_id,
    v_before,
    v_after
  );

  return jsonb_build_object('ok', true, 'service_request', v_after, 'satisfaction_status', v_status);
end;
$$;

revoke all on function public.confirm_warranty_claim_satisfaction_tx(uuid, uuid, text, integer, text) from public;
grant execute on function public.confirm_warranty_claim_satisfaction_tx(uuid, uuid, text, integer, text) to authenticated, service_role;
