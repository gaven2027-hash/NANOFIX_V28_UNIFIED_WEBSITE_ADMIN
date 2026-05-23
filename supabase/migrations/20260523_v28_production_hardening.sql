-- NANOFIX V28 production hardening: transactional workflow, customer portal RLS,
-- website CMS, backup storage, module health and closed-loop operations.

create extension if not exists "pgcrypto";

-- Keep user metadata from ever becoming an admin authority. Admin access is granted
-- only by explicit rows in public.admin_profiles created by service-role/admin tools.
create or replace function public.handle_new_customer_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_name text;
  v_phone text;
begin
  v_name := nullif(trim(coalesce(new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1), 'Customer')), '');
  v_phone := nullif(trim(coalesce(new.raw_user_meta_data ->> 'phone', new.raw_user_meta_data ->> 'whatsapp', '')), '');

  insert into public.customers (auth_user_id, name, email, phone, whatsapp, status, account_status, created_at, updated_at)
  values (new.id, coalesce(v_name, 'Customer'), new.email, v_phone, v_phone, 'active', 'active', now(), now())
  on conflict (auth_user_id) do update set
    email = excluded.email,
    updated_at = now();

  return new;
end;
$$;

drop trigger if exists on_auth_user_created_create_customer on auth.users;
create trigger on_auth_user_created_create_customer
after insert on auth.users
for each row execute function public.handle_new_customer_auth_user();

-- Website CMS with draft/review/publish/versioning.
create table if not exists public.website_pages (
  page_id uuid primary key default gen_random_uuid(),
  route_path text not null unique,
  title text not null,
  description text,
  status text not null default 'published' check (status in ('draft','pending_review','published','archived')),
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid,
  updated_by uuid,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.website_content_blocks (
  block_id uuid primary key default gen_random_uuid(),
  route_path text not null,
  locale text not null default 'en' check (locale in ('en','zh','default')),
  block_key text not null,
  content_type text not null check (content_type in ('text','rich_text','image','cta','faq','form','schema')),
  content_json jsonb not null default '{}'::jsonb,
  status text not null default 'draft' check (status in ('draft','pending_review','published','archived')),
  published_version int not null default 1,
  updated_by uuid,
  reviewed_by uuid,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(route_path, locale, block_key)
);

create table if not exists public.website_publish_versions (
  version_id uuid primary key default gen_random_uuid(),
  route_path text not null,
  locale text not null default 'en',
  version_no int not null,
  snapshot_json jsonb not null,
  published_by uuid,
  published_at timestamptz not null default now(),
  unique(route_path, locale, version_no)
);

alter table public.website_pages enable row level security;
alter table public.website_content_blocks enable row level security;
alter table public.website_publish_versions enable row level security;

-- Backup storage hardening.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('system-backups', 'system-backups', false, 262144000, array['application/octet-stream'])
on conflict (id) do update set public = false;

alter table public.backup_jobs
  add column if not exists restore_verified_at timestamptz,
  add column if not exists encryption_version text not null default 'aes-256-gcm-v1',
  add column if not exists metadata jsonb not null default '{}'::jsonb;

-- Ensure all transactional workflow tables have consistent timestamps and payment ownership.
alter table public.service_requests add column if not exists updated_at timestamptz not null default now();
alter table public.inspections add column if not exists updated_at timestamptz not null default now();
alter table public.quotations add column if not exists updated_at timestamptz not null default now();
alter table public.jobs add column if not exists updated_at timestamptz not null default now();
alter table public.invoices add column if not exists updated_at timestamptz not null default now();
alter table public.payments add column if not exists customer_id uuid references public.customers(customer_id) on delete set null;
alter table public.payments add column if not exists updated_at timestamptz not null default now();
alter table public.receipts add column if not exists updated_at timestamptz not null default now();
alter table public.warranties add column if not exists updated_at timestamptz not null default now();

-- Social/payment/warranty closed-loop support columns.
alter table public.social_messages
  add column if not exists status text not null default 'draft' check (status in ('draft','pending_review','approved','scheduled','published','failed','rejected')),
  add column if not exists platform_payload jsonb not null default '{}'::jsonb,
  add column if not exists scheduled_at timestamptz,
  add column if not exists published_at timestamptz,
  add column if not exists updated_at timestamptz not null default now();

create table if not exists public.payment_events (
  payment_event_id uuid primary key default gen_random_uuid(),
  payment_id uuid references public.payments(payment_id) on delete cascade,
  gateway text,
  event_type text not null,
  payload jsonb not null default '{}'::jsonb,
  verified boolean not null default false,
  processed_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.payment_events enable row level security;

-- Ensure customer portal rows are readable by the authenticated linked customer.
do $$
begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='payments' and policyname='customers can read own payments') then
    create policy "customers can read own payments" on public.payments for select to authenticated
    using (customer_id in (select customer_id from public.customers where auth_user_id = auth.uid()));
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='receipts' and policyname='customers can read own receipts') then
    create policy "customers can read own receipts" on public.receipts for select to authenticated
    using (invoice_id in (select invoice_id from public.invoices where customer_id in (select customer_id from public.customers where auth_user_id = auth.uid())));
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='warranties' and policyname='customers can read own warranties') then
    create policy "customers can read own warranties" on public.warranties for select to authenticated
    using (customer_id in (select customer_id from public.customers where auth_user_id = auth.uid()));
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='website_content_blocks' and policyname='published cms blocks are readable') then
    create policy "published cms blocks are readable" on public.website_content_blocks for select to anon, authenticated
    using (status = 'published');
  end if;
end $$;

-- Transactional status transition RPC. This is the only supported status mutation path.
create or replace function public.transition_record_status(
  p_object_type text,
  p_object_id uuid,
  p_from_status text,
  p_to_status text,
  p_reason text default null,
  p_actor_id uuid default null,
  p_actor_role text default 'system'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_table text;
  v_id_col text;
  v_current text;
  v_transition_id uuid;
begin
  case p_object_type
    when 'lead' then v_table := 'leads'; v_id_col := 'lead_id';
    when 'service_request' then v_table := 'service_requests'; v_id_col := 'service_request_id';
    when 'inspection' then v_table := 'inspections'; v_id_col := 'inspection_id';
    when 'quotation' then v_table := 'quotations'; v_id_col := 'quotation_id';
    when 'job' then v_table := 'jobs'; v_id_col := 'job_id';
    when 'invoice' then v_table := 'invoices'; v_id_col := 'invoice_id';
    when 'payment' then v_table := 'payments'; v_id_col := 'payment_id';
    when 'receipt' then v_table := 'receipts'; v_id_col := 'receipt_id';
    when 'warranty' then v_table := 'warranties'; v_id_col := 'warranty_id';
    else raise exception 'unsupported object_type %', p_object_type;
  end case;

  execute format('select status from public.%I where %I = $1 for update', v_table, v_id_col)
    into v_current using p_object_id;

  if v_current is null then
    raise exception 'record not found: %.%', p_object_type, p_object_id;
  end if;

  if v_current <> p_from_status then
    raise exception 'status mismatch: current %, expected %', v_current, p_from_status;
  end if;

  execute format('update public.%I set status = $1, updated_at = now() where %I = $2', v_table, v_id_col)
    using p_to_status, p_object_id;

  insert into public.status_transition_logs(machine, object_type, object_id, from_status, to_status, reason, actor_id, actor_role, created_at)
  values (p_object_type, p_object_type, p_object_id, p_from_status, p_to_status, p_reason, p_actor_id, p_actor_role, now())
  returning transition_id into v_transition_id;

  insert into public.audit_logs(actor_id, actor_role, action, object_type, object_id, before_data, after_data, created_at)
  values (
    p_actor_id,
    p_actor_role,
    'status.transition.transactional',
    v_table,
    p_object_id,
    jsonb_build_object('status', p_from_status),
    jsonb_build_object('status', p_to_status, 'reason', p_reason, 'transition_id', v_transition_id),
    now()
  );

  insert into public.entity_events(topic, entity_type, entity_id, module_key, actor_id, actor_role, payload, created_at)
  values (
    'status.transition',
    p_object_type,
    p_object_id::text,
    p_object_type,
    p_actor_id::text,
    p_actor_role,
    jsonb_build_object('from_status', p_from_status, 'to_status', p_to_status, 'reason', p_reason, 'transition_id', v_transition_id),
    now()
  );

  insert into public.integration_outbox(event_type, destination, payload, status, next_run_at, created_at, updated_at)
  values (
    'status.transition',
    'module_subscribers',
    jsonb_build_object('object_type', p_object_type, 'object_id', p_object_id, 'from_status', p_from_status, 'to_status', p_to_status),
    'queued',
    now(),
    now(),
    now()
  );

  return jsonb_build_object(
    'transition_id', v_transition_id,
    'object_type', p_object_type,
    'object_id', p_object_id,
    'from_status', p_from_status,
    'to_status', p_to_status,
    'transactional', true
  );
end;
$$;

create or replace function public.record_payment_and_reconcile(
  p_invoice_id uuid,
  p_amount numeric,
  p_gateway text,
  p_transaction_id text,
  p_actor_id uuid default null,
  p_actor_role text default 'finance_admin'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invoice public.invoices%rowtype;
  v_paid numeric;
  v_payment_id uuid;
  v_receipt_id uuid;
  v_receipt_no text;
  v_new_status text;
begin
  select * into v_invoice from public.invoices where invoice_id = p_invoice_id for update;
  if not found then raise exception 'invoice not found'; end if;
  if v_invoice.status = 'void' then raise exception 'void invoice cannot receive payment'; end if;

  insert into public.payments(invoice_id, customer_id, gateway, transaction_id, amount, currency, status, reconciled_at, created_at)
  values (p_invoice_id, v_invoice.customer_id, p_gateway, p_transaction_id, p_amount, v_invoice.currency, 'succeeded', now(), now())
  returning payment_id into v_payment_id;

  select coalesce(sum(amount), 0) into v_paid from public.payments where invoice_id = p_invoice_id and status = 'succeeded';
  v_new_status := case when v_paid >= v_invoice.total_amount then 'paid' else 'partially_paid' end;
  update public.invoices set status = v_new_status where invoice_id = p_invoice_id;

  v_receipt_no := 'RCPT-' || to_char(now(), 'YYYYMMDDHH24MISS') || '-' || substr(v_payment_id::text, 1, 6);
  insert into public.receipts(receipt_no, payment_id, invoice_id, status, issued_at, created_at)
  values (v_receipt_no, v_payment_id, p_invoice_id, 'issued', now(), now())
  returning receipt_id into v_receipt_id;

  insert into public.audit_logs(actor_id, actor_role, action, object_type, object_id, after_data, created_at)
  values (p_actor_id, p_actor_role, 'payment.reconciled', 'invoices', p_invoice_id,
    jsonb_build_object('payment_id', v_payment_id, 'receipt_id', v_receipt_id, 'invoice_status', v_new_status, 'paid_amount', v_paid), now());

  return jsonb_build_object('payment_id', v_payment_id, 'receipt_id', v_receipt_id, 'invoice_status', v_new_status, 'paid_amount', v_paid);
end;
$$;

create or replace function public.record_module_health_snapshot(p_actor_role text default 'system')
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count int;
begin
  insert into public.module_health_events(module_key, check_name, status, message, latency_ms, metadata, created_at)
  select module_key, 'scheduled_contract_check', 'healthy', 'Module contract is registered and database is reachable.', 0,
         jsonb_build_object('criticality', criticality, 'owner_role', owner_role), now()
  from public.app_modules where enabled = true;
  get diagnostics v_count = row_count;
  insert into public.audit_logs(actor_role, action, object_type, after_data, created_at)
  values (p_actor_role, 'module_health.snapshot', 'module_health_events', jsonb_build_object('inserted', v_count), now());
  return jsonb_build_object('inserted', v_count, 'created_at', now());
end;
$$;


-- Restrict CG hardening SECURITY DEFINER RPCs to server-side service role only.
revoke execute on function public.transition_record_status(text, uuid, text, text, text, uuid, text) from public, anon, authenticated;
revoke execute on function public.record_payment_and_reconcile(uuid, numeric, text, text, uuid, text) from public, anon, authenticated;
revoke execute on function public.record_module_health_snapshot(text) from public, anon, authenticated;

grant execute on function public.transition_record_status(text, uuid, text, text, text, uuid, text) to service_role;
grant execute on function public.record_payment_and_reconcile(uuid, numeric, text, text, uuid, text) to service_role;
grant execute on function public.record_module_health_snapshot(text) to service_role;
