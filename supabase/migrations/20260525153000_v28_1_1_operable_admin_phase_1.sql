-- NANOFIX V28.1.1 Operable Admin Phase 1
-- Adds the missing bookings module table and a server-only status transition RPC.
-- The RPC is intended to be called by Next.js server routes using SUPABASE_SERVICE_ROLE_KEY only.

create table if not exists public.bookings (
  booking_id uuid primary key default gen_random_uuid(),
  service_request_id uuid references public.service_requests(service_request_id) on delete set null,
  customer_id uuid references public.customers(customer_id) on delete set null,
  booking_type text not null default 'site_inspection' check (booking_type in ('site_inspection','repair_work','follow_up','warranty_claim','other')),
  scheduled_at timestamptz,
  status text not null default 'pending' check (status in ('pending','confirmed','assigned','completed','rescheduled','cancelled','no_show')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.bookings enable row level security;

create index if not exists bookings_service_request_id_idx on public.bookings(service_request_id);
create index if not exists bookings_customer_id_idx on public.bookings(customer_id);
create index if not exists bookings_status_idx on public.bookings(status);
create index if not exists bookings_scheduled_at_idx on public.bookings(scheduled_at);

create or replace function public.nanofix_admin_update_status_with_audit(
  p_object_type text,
  p_object_id uuid,
  p_to_status text,
  p_actor_id uuid default null,
  p_actor_role text default null,
  p_reason text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_table text;
  v_pk text;
  v_before_status text;
  v_after jsonb;
  v_sql text;
  v_has_updated_at boolean;
begin
  case p_object_type
    when 'lead' then v_table := 'leads'; v_pk := 'lead_id';
    when 'service_request' then v_table := 'service_requests'; v_pk := 'service_request_id';
    when 'booking' then v_table := 'bookings'; v_pk := 'booking_id';
    when 'inspection' then v_table := 'inspections'; v_pk := 'inspection_id';
    when 'quotation' then v_table := 'quotations'; v_pk := 'quotation_id';
    when 'job' then v_table := 'jobs'; v_pk := 'job_id';
    when 'invoice' then v_table := 'invoices'; v_pk := 'invoice_id';
    when 'payment' then v_table := 'payments'; v_pk := 'payment_id';
    when 'receipt' then v_table := 'receipts'; v_pk := 'receipt_id';
    when 'warranty' then v_table := 'warranties'; v_pk := 'warranty_id';
    when 'customer' then v_table := 'customers'; v_pk := 'customer_id';
    when 'unified_intake' then v_table := 'unified_intake'; v_pk := 'intake_id';
    else raise exception 'Unsupported object_type: %', p_object_type using errcode = '22023';
  end case;

  execute format('select status from public.%I where %I = $1', v_table, v_pk)
    using p_object_id
    into v_before_status;

  if v_before_status is null then
    raise exception 'Record not found for %.%', p_object_type, p_object_id using errcode = 'P0002';
  end if;

  select exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = v_table
      and column_name = 'updated_at'
  ) into v_has_updated_at;

  v_sql := format(
    'update public.%I as t set status = $1%s where t.%I = $2 returning to_jsonb(t.*)',
    v_table,
    case when v_has_updated_at then ', updated_at = now()' else '' end,
    v_pk
  );

  execute v_sql using p_to_status, p_object_id into v_after;

  if p_object_type in ('lead','service_request','inspection','quotation','job','invoice','payment','receipt','warranty') then
    insert into public.status_transition_logs (
      machine,
      object_type,
      object_id,
      from_status,
      to_status,
      reason,
      actor_id,
      actor_role,
      created_at
    ) values (
      p_object_type,
      p_object_type,
      p_object_id,
      v_before_status,
      p_to_status,
      p_reason,
      p_actor_id,
      p_actor_role,
      now()
    );
  end if;

  insert into public.audit_logs (
    actor_id,
    actor_role,
    action,
    object_type,
    object_id,
    before_data,
    after_data,
    created_at
  ) values (
    p_actor_id,
    p_actor_role,
    'status_change',
    p_object_type,
    p_object_id,
    jsonb_build_object('status', v_before_status),
    jsonb_build_object('status', p_to_status, 'reason', p_reason, 'record', v_after),
    now()
  );

  return jsonb_build_object(
    'ok', true,
    'object_type', p_object_type,
    'object_id', p_object_id,
    'from_status', v_before_status,
    'to_status', p_to_status,
    'record', v_after
  );
end;
$$;

revoke all on function public.nanofix_admin_update_status_with_audit(text, uuid, text, uuid, text, text) from public, anon, authenticated;
grant execute on function public.nanofix_admin_update_status_with_audit(text, uuid, text, uuid, text, text) to service_role;
