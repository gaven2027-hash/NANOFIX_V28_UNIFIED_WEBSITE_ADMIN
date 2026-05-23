-- NANOFIX V28 unified website + central admin schema bridge
-- Safe to apply after existing website migrations. It avoids trusting Auth metadata roles,
-- adds missing backend columns/tables, creates RPC transaction entrypoints, and locks RPC execution to service_role.

create extension if not exists pgcrypto;

-- Canonical identity profile table. Admin/customer/engineer roles live here; auth metadata is never trusted for admin role elevation.
create table if not exists public.profiles (
  profile_id uuid primary key default gen_random_uuid(),
  auth_user_id uuid unique,
  email text unique,
  full_name text,
  role text not null check (role in ('super_admin','operations_admin','finance','content_admin','support','engineer','customer')) default 'customer',
  is_active boolean not null default true,
  password_status text not null default 'set',
  last_password_changed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.customers add column if not exists profile_id uuid references public.profiles(profile_id);
alter table public.customers add column if not exists address_json jsonb default '{}'::jsonb;
alter table public.customers add column if not exists binding_status text not null default 'linked';
alter table public.customers add column if not exists risk_tags text[] default array[]::text[];
alter table public.customers add column if not exists vip_tags text[] default array[]::text[];
alter table public.customers add column if not exists account_status text not null default 'active';
alter table public.customers add column if not exists updated_at timestamptz not null default now();

alter table public.unified_intake add column if not exists source text;
alter table public.unified_intake add column if not exists source_form text;
alter table public.unified_intake add column if not exists customer_name text;
alter table public.unified_intake add column if not exists phone text;
alter table public.unified_intake add column if not exists email text;
alter table public.unified_intake add column if not exists postal_code text;
alter table public.unified_intake add column if not exists address_text text;
alter table public.unified_intake add column if not exists property_type text;
alter table public.unified_intake add column if not exists issue_type text;
alter table public.unified_intake add column if not exists message text;
alter table public.unified_intake add column if not exists pdpa_consent boolean default true;
alter table public.unified_intake add column if not exists binding_status text not null default 'pending';
alter table public.unified_intake add column if not exists owner_id uuid references public.profiles(profile_id);
alter table public.unified_intake add column if not exists updated_at timestamptz not null default now();

-- Bridge older text-only intake payloads to jsonb so website, social and admin modules can share structured payloads.
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'unified_intake' and column_name = 'raw_message' and data_type <> 'jsonb'
  ) then
    alter table public.unified_intake
      alter column raw_message type jsonb
      using case
        when raw_message is null then '{}'::jsonb
        else jsonb_build_object('text', raw_message)
      end;
  end if;
end $$;


alter table public.leads add column if not exists name text;
alter table public.leads add column if not exists phone text;
alter table public.leads add column if not exists email text;
alter table public.leads add column if not exists address text;
alter table public.leads add column if not exists address_text text;
alter table public.leads add column if not exists issue_type text;
alter table public.leads add column if not exists message text;
alter table public.leads add column if not exists duplicate_reason text;
alter table public.leads add column if not exists updated_at timestamptz not null default now();

alter table public.service_requests add column if not exists contact_name text;
alter table public.service_requests add column if not exists phone text;
alter table public.service_requests add column if not exists whatsapp text;
alter table public.service_requests add column if not exists email text;
alter table public.service_requests add column if not exists address_text text;
alter table public.service_requests add column if not exists postal_code text;
alter table public.service_requests add column if not exists leak_location text;
alter table public.service_requests add column if not exists issue_description text;
alter table public.service_requests add column if not exists property_type text;
alter table public.service_requests add column if not exists property_address text;
alter table public.service_requests add column if not exists preferred_time_text text;
alter table public.service_requests add column if not exists consent boolean default true;
alter table public.service_requests add column if not exists user_agent text;
alter table public.service_requests add column if not exists address_json jsonb default '{}'::jsonb;
alter table public.service_requests add column if not exists admin_approval_required boolean not null default true;
alter table public.service_requests add column if not exists updated_at timestamptz not null default now();

alter table public.jobs add column if not exists notes text;
alter table public.jobs add column if not exists eta_json jsonb default '{}'::jsonb;
alter table public.jobs add column if not exists updated_at timestamptz not null default now();

alter table public.quotations add column if not exists job_id uuid references public.jobs(job_id);
alter table public.quotations add column if not exists current_version integer not null default 1;
alter table public.quotations add column if not exists total numeric(12,2) not null default 0;
alter table public.quotations add column if not exists approval_status text not null default 'draft';

create table if not exists public.quotation_versions (
  version_id uuid primary key default gen_random_uuid(),
  quotation_id uuid not null references public.quotations(quotation_id) on delete cascade,
  version int not null,
  line_items jsonb not null default '[]'::jsonb,
  total numeric(12,2) not null default 0,
  created_by uuid references public.profiles(profile_id),
  approval_log jsonb default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (quotation_id, version)
);

alter table public.invoices add column if not exists total numeric(12,2) not null default 0;
alter table public.invoices add column if not exists void_reason text;
create table if not exists public.invoice_items (
  invoice_item_id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.invoices(invoice_id) on delete cascade,
  description text not null,
  qty numeric(12,2) not null default 1,
  unit_price numeric(12,2) not null default 0,
  amount numeric(12,2) generated always as (qty * unit_price) stored,
  created_at timestamptz not null default now()
);

alter table public.payments add column if not exists fee numeric(12,2) not null default 0;
alter table public.warranties add column if not exists starts_at date;
alter table public.warranties add column if not exists ends_at date;

create table if not exists public.status_transition_logs (
  transition_id uuid primary key default gen_random_uuid(),
  machine text not null,
  object_id uuid not null,
  from_status text,
  to_status text not null,
  reason text,
  actor_id uuid,
  actor_role text,
  ip_address inet,
  created_at timestamptz not null default now()
);

create table if not exists public.payment_transactions (
  transaction_log_id uuid primary key default gen_random_uuid(),
  payment_id uuid references public.payments(payment_id),
  provider text,
  external_id text,
  status text,
  amount numeric(12,2),
  payload jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.webhook_events (
  webhook_event_id uuid primary key default gen_random_uuid(),
  provider text not null,
  event_type text not null,
  external_id text,
  payload jsonb default '{}'::jsonb,
  processed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (provider, external_id)
);


alter table public.social_messages add column if not exists source_platform text;
alter table public.social_messages add column if not exists sender_name text;
alter table public.social_messages add column if not exists sender_contact text;
alter table public.social_messages add column if not exists message_text text;
alter table public.social_messages add column if not exists human_required boolean not null default false;
alter table public.social_messages add column if not exists linked_lead_id uuid references public.leads(lead_id);
alter table public.social_messages add column if not exists linked_service_request_id uuid references public.service_requests(service_request_id);

alter table public.content_drafts add column if not exists prompt text;
alter table public.content_drafts add column if not exists body_json jsonb default '{}'::jsonb;
alter table public.content_drafts add column if not exists publish_status text not null default 'not_published';
alter table public.content_drafts add column if not exists created_by uuid references public.profiles(profile_id);
alter table public.content_drafts add column if not exists approved_by uuid references public.profiles(profile_id);
alter table public.content_drafts add column if not exists scheduled_at timestamptz;
alter table public.content_drafts add column if not exists published_at timestamptz;

alter table public.ai_logs add column if not exists provider text;
alter table public.ai_logs add column if not exists input_summary text;
alter table public.ai_logs add column if not exists output_summary text;
alter table public.ai_logs add column if not exists safety_status text;
alter table public.ai_logs add column if not exists usage_cost numeric(12,4) not null default 0;
alter table public.ai_logs add column if not exists human_required boolean not null default false;


alter table public.backup_jobs add column if not exists module_key text;
alter table public.backup_jobs add column if not exists schedule_text text;
alter table public.backup_jobs add column if not exists encryption_required boolean not null default true;
alter table public.backup_jobs add column if not exists signed_url text;
alter table public.backup_jobs add column if not exists failure_reason text;

alter table public.backup_schedules add column if not exists schedule_id uuid not null default gen_random_uuid();
alter table public.backup_schedules add column if not exists last_run_at timestamptz;


create table if not exists public.module_health (
  module_health_id uuid primary key default gen_random_uuid(),
  module_key text not null,
  status text not null default 'unknown',
  last_checked_at timestamptz not null default now(),
  details jsonb default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (module_key)
);

create table if not exists public.job_assignments (
  assignment_id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.jobs(job_id) on delete cascade,
  engineer_id uuid not null references public.profiles(profile_id),
  status text not null default 'assigned',
  created_at timestamptz not null default now()
);

create table if not exists public.job_checklists (
  checklist_id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.jobs(job_id) on delete cascade,
  engineer_id uuid references public.profiles(profile_id),
  checklist_json jsonb default '{}'::jsonb,
  status text not null default 'draft',
  created_at timestamptz not null default now()
);

create table if not exists public.job_photos (
  photo_id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.jobs(job_id) on delete cascade,
  engineer_id uuid references public.profiles(profile_id),
  storage_path text not null,
  photo_type text,
  created_at timestamptz not null default now()
);

create table if not exists public.customer_signatures (
  signature_id uuid primary key default gen_random_uuid(),
  job_id uuid references public.jobs(job_id) on delete set null,
  customer_id uuid references public.customers(customer_id) on delete set null,
  storage_path text,
  signed_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.audit_logs add column if not exists role text;
alter table public.audit_logs add column if not exists before_json jsonb;
alter table public.audit_logs add column if not exists after_json jsonb;

-- Helper functions for RLS and middleware compatibility.
create or replace function public.current_profile_id()
returns uuid language sql stable security definer set search_path = public as $$
  select profile_id from public.profiles where auth_user_id = auth.uid() and is_active = true limit 1
$$;

create or replace function public.current_profile_role()
returns text language sql stable security definer set search_path = public as $$
  select role from public.profiles where auth_user_id = auth.uid() and is_active = true limit 1
$$;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce(public.current_profile_role() in ('super_admin','operations_admin','finance','content_admin','support'), false)
$$;

create or replace function public.owns_customer(p_customer_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.customers c
    where c.customer_id = p_customer_id and c.profile_id = public.current_profile_id()
  )
$$;

create or replace function public.is_assigned_engineer(p_job_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.jobs j
    left join public.job_assignments a on a.job_id = j.job_id
    where j.job_id = p_job_id and (j.engineer_id = public.current_profile_id() or a.engineer_id = public.current_profile_id())
  )
$$;

create or replace function public.handle_new_auth_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (auth_user_id, email, full_name, role, is_active, password_status)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', split_part(coalesce(new.email, ''), '@', 1)),
    'customer',
    true,
    'set'
  )
  on conflict (auth_user_id) do update set
    email = excluded.email,
    updated_at = now();
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_create_profile on auth.users;
create trigger on_auth_user_created_create_profile
  after insert on auth.users
  for each row execute procedure public.handle_new_auth_user();

create or replace function public.search_all_records(search_text text, max_results int default 20)
returns table(type text, title text, subtitle text, href text, status text, created_at timestamptz)
language plpgsql security definer set search_path = public as $$
declare
  q text := '%' || replace(replace(left(coalesce(search_text,''), 80), '%', ''), '_', '') || '%';
  n int := least(greatest(coalesce(max_results, 20), 1), 50);
begin
  return query
  select 'customer', coalesce(c.name, 'Customer'), concat_ws(' · ', c.phone, c.email), '/customer-center#customer-' || c.customer_id::text, coalesce(c.binding_status, c.status), c.created_at
  from public.customers c where c.name ilike q or c.phone ilike q or c.email ilike q order by c.created_at desc limit n;

  return query
  select 'lead', 'Lead ' || left(l.lead_id::text, 8), concat_ws(' · ', l.source_platform, l.priority), '/service-operations#lead-' || l.lead_id::text, l.status, l.created_at
  from public.leads l where l.source_platform ilike q or l.status ilike q or l.priority ilike q or l.name ilike q order by l.created_at desc limit n;

  return query
  select 'service_request', 'Service Request ' || left(s.service_request_id::text, 8), concat_ws(' · ', s.issue_type, s.phone, s.email), '/service-operations#service-request-' || s.service_request_id::text, s.status, s.created_at
  from public.service_requests s where s.issue_type ilike q or s.phone ilike q or s.email ilike q or s.address_text ilike q order by s.created_at desc limit n;
end;
$$;

create or replace function public.nanofix_allowed_transition(p_machine text, p_from_status text, p_to_status text)
returns boolean language plpgsql immutable as $$
begin
  return case p_machine
    when 'lead' then p_to_status = any(case p_from_status when 'new' then array['qualified','duplicate','lost','archived'] when 'qualified' then array['converted','lost','archived'] when 'converted' then array['archived'] when 'duplicate' then array['archived'] when 'lost' then array['archived'] else array[]::text[] end)
    when 'service_request' then p_to_status = any(case p_from_status when 'pending_review' then array['scheduled','cancelled'] when 'scheduled' then array['inspected','cancelled'] when 'inspected' then array['quoted','cancelled'] when 'quoted' then array['approved','cancelled'] else array[]::text[] end)
    when 'job' then p_to_status = any(case p_from_status when 'assigned' then array['en_route','cancelled'] when 'en_route' then array['arrived','cancelled'] when 'arrived' then array['in_progress'] when 'in_progress' then array['completed','rework_required'] when 'completed' then array['rework_required'] when 'rework_required' then array['assigned','in_progress','completed'] else array[]::text[] end)
    else true
  end;
end;
$$;

create or replace function public.transition_status_tx(
  p_machine text,
  p_object_id uuid,
  p_to_status text,
  p_reason text,
  p_actor_id uuid,
  p_actor_role text,
  p_ip text default null
)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_table text;
  v_id_col text;
  v_status_col text := 'status';
  v_from text;
begin
  v_table := case p_machine
    when 'lead' then 'leads'
    when 'service_request' then 'service_requests'
    when 'inspection' then 'inspections'
    when 'quotation' then 'quotations'
    when 'job' then 'jobs'
    when 'invoice' then 'invoices'
    when 'payment' then 'payments'
    when 'receipt' then 'receipts'
    when 'warranty' then 'warranties'
    else null end;
  if v_table is null then raise exception 'Unsupported machine %', p_machine; end if;
  v_id_col := case p_machine
    when 'lead' then 'lead_id' when 'service_request' then 'service_request_id' when 'inspection' then 'inspection_id'
    when 'quotation' then 'quotation_id' when 'job' then 'job_id' when 'invoice' then 'invoice_id'
    when 'payment' then 'payment_id' when 'receipt' then 'receipt_id' when 'warranty' then 'warranty_id' end;
  if p_machine = 'quotation' then v_status_col := 'approval_status'; end if;

  execute format('select %I from public.%I where %I = $1 for update', v_status_col, v_table, v_id_col) into v_from using p_object_id;
  if v_from is null then raise exception 'Record not found'; end if;
  if not public.nanofix_allowed_transition(p_machine, v_from, p_to_status) then
    raise exception 'Invalid transition % -> % for %', v_from, p_to_status, p_machine;
  end if;
  execute format('update public.%I set %I = $1 where %I = $2', v_table, v_status_col, v_id_col) using p_to_status, p_object_id;

  insert into public.status_transition_logs(machine, object_id, from_status, to_status, reason, actor_id, actor_role, ip_address)
  values (p_machine, p_object_id, v_from, p_to_status, p_reason, p_actor_id, p_actor_role, nullif(p_ip,'')::inet);

  insert into public.audit_logs(actor_id, actor_role, role, action, object_type, object_id, before_data, after_data, before_json, after_json, ip_address)
  values (p_actor_id, p_actor_role, p_actor_role, 'status.transition', p_machine, p_object_id, jsonb_build_object('status', v_from), jsonb_build_object('status', p_to_status, 'reason', p_reason), jsonb_build_object('status', v_from), jsonb_build_object('status', p_to_status, 'reason', p_reason), nullif(p_ip,'')::inet);

  return jsonb_build_object('machine', p_machine, 'object_id', p_object_id, 'from_status', v_from, 'to_status', p_to_status);
end;
$$;

create or replace function public.create_backup_job_tx(
  p_module_key text,
  p_schedule_text text,
  p_actor_id uuid,
  p_actor_role text,
  p_ip text default null
)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  insert into public.backup_jobs(module, module_key, schedule_cron, schedule_text, status, created_by, created_at)
  values (p_module_key, p_module_key, p_schedule_text, p_schedule_text, 'scheduled', null, now())
  returning backup_id into v_id;
  insert into public.audit_logs(actor_id, actor_role, role, action, object_type, object_id, after_data, after_json, ip_address)
  values (p_actor_id, p_actor_role, p_actor_role, 'backup_job.created', 'backup_jobs', v_id, jsonb_build_object('module_key', p_module_key), jsonb_build_object('module_key', p_module_key), nullif(p_ip,'')::inet);
  return jsonb_build_object('backup_id', v_id, 'status', 'scheduled', 'module_key', p_module_key);
end;
$$;

create or replace function public.create_ai_draft_tx(
  p_module text,
  p_platform text,
  p_prompt text,
  p_title text,
  p_body_json jsonb,
  p_actor_id uuid,
  p_actor_role text,
  p_ip text default null
)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  insert into public.content_drafts(module, platform, prompt, title, body_json, approval_status, publish_status, created_by, created_at)
  values (coalesce(p_module,'website'), p_platform, p_prompt, p_title, coalesce(p_body_json,'{}'::jsonb), 'draft', 'not_published', p_actor_id, now())
  returning content_id into v_id;
  insert into public.ai_logs(module, provider, input_summary, output_summary, safety_status, human_required, created_at)
  values (coalesce(p_module,'website'), 'nanofix-ai-provider-pending', left(coalesce(p_prompt,''), 300), left(coalesce(p_title,''), 300), 'pending_review', true, now());
  insert into public.audit_logs(actor_id, actor_role, role, action, object_type, object_id, after_data, after_json, ip_address)
  values (p_actor_id, p_actor_role, p_actor_role, 'ai_draft.created', 'content_drafts', v_id, jsonb_build_object('module', p_module, 'platform', p_platform), jsonb_build_object('module', p_module, 'platform', p_platform), nullif(p_ip,'')::inet);
  return jsonb_build_object('content_id', v_id, 'approval_status', 'draft', 'publish_status', 'not_published');
end;
$$;

create or replace function public.ingest_social_message_tx(
  p_platform text,
  p_sender_name text,
  p_sender_contact text,
  p_message_text text,
  p_payload jsonb
)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_message_id uuid; v_intake_id uuid; v_lead_id uuid;
begin
  insert into public.social_messages(source_platform, channel, sender_name, sender_contact, message_text, body, ai_extracted_data, priority, human_required, status, created_at)
  values (p_platform, p_platform, p_sender_name, p_sender_contact, p_message_text, p_message_text, coalesce(p_payload,'{}'::jsonb), 'P2', true, 'new', now())
  returning message_id into v_message_id;
  insert into public.unified_intake(source_platform, source, raw_message, extracted_data, phone, message, binding_status, status, created_at)
  values (p_platform, 'social', to_jsonb(p_message_text), coalesce(p_payload,'{}'::jsonb), p_sender_contact, p_message_text, 'pending', 'new', now())
  returning intake_id into v_intake_id;
  insert into public.leads(intake_id, source_platform, name, phone, ai_extracted_data, binding_status, priority, status, created_at)
  values (v_intake_id, p_platform, p_sender_name, p_sender_contact, coalesce(p_payload,'{}'::jsonb), 'pending', 'P2', 'new', now())
  returning lead_id into v_lead_id;
  update public.social_messages set linked_lead_id = v_lead_id where message_id = v_message_id;
  return jsonb_build_object('message_id', v_message_id, 'intake_id', v_intake_id, 'lead_id', v_lead_id);
end;
$$;

create or replace function public.reconcile_payment_webhook_tx(
  p_provider text,
  p_event_type text,
  p_external_id text,
  p_invoice_id uuid,
  p_invoice_no text,
  p_amount numeric,
  p_status text,
  p_payload jsonb
)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_invoice_id uuid := p_invoice_id; v_payment_id uuid; v_event_id uuid;
begin
  insert into public.webhook_events(provider, event_type, external_id, payload, processed_at, created_at)
  values (p_provider, p_event_type, p_external_id, coalesce(p_payload,'{}'::jsonb), now(), now())
  on conflict (provider, external_id) do update set payload = excluded.payload, processed_at = now()
  returning webhook_event_id into v_event_id;

  if v_invoice_id is null and p_invoice_no is not null then
    select invoice_id into v_invoice_id from public.invoices where invoice_no = p_invoice_no limit 1;
  end if;

  if v_invoice_id is not null then
    insert into public.payments(invoice_id, gateway, transaction_id, amount, status, reconciled_at, created_at)
    values (v_invoice_id, p_provider, p_external_id, coalesce(p_amount,0), coalesce(p_status,'processing'), now(), now())
    on conflict (transaction_id) do update set status = excluded.status, amount = excluded.amount, reconciled_at = now()
    returning payment_id into v_payment_id;
    insert into public.payment_transactions(payment_id, provider, external_id, status, amount, payload, created_at)
    values (v_payment_id, p_provider, p_external_id, p_status, p_amount, coalesce(p_payload,'{}'::jsonb), now());
  end if;

  return jsonb_build_object('webhook_event_id', v_event_id, 'invoice_id', v_invoice_id, 'payment_id', v_payment_id);
end;
$$;

-- RLS: enable core tables and add high-level policies. Service role remains the server-side owner for admin APIs.
alter table public.profiles enable row level security;

-- Drop/recreate idempotent policies only for policies owned by this bridge.
drop policy if exists "nanofix profiles own read" on public.profiles;
drop policy if exists "nanofix profiles admin all" on public.profiles;
create policy "nanofix profiles own read" on public.profiles for select to authenticated using (auth_user_id = auth.uid());
create policy "nanofix profiles admin all" on public.profiles for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- Keep RPCs callable only from service-role backed server APIs; browser clients use RLS and normal table policies.
revoke execute on function public.search_all_records(text, int) from public, anon, authenticated;
revoke execute on function public.transition_status_tx(text, uuid, text, text, uuid, text, text) from public, anon, authenticated;
revoke execute on function public.create_backup_job_tx(text, text, uuid, text, text) from public, anon, authenticated;
revoke execute on function public.create_ai_draft_tx(text, text, text, text, jsonb, uuid, text, text) from public, anon, authenticated;
revoke execute on function public.ingest_social_message_tx(text, text, text, text, jsonb) from public, anon, authenticated;
revoke execute on function public.reconcile_payment_webhook_tx(text, text, text, uuid, text, numeric, text, jsonb) from public, anon, authenticated;

grant execute on function public.search_all_records(text, int) to service_role;
grant execute on function public.transition_status_tx(text, uuid, text, text, uuid, text, text) to service_role;
grant execute on function public.create_backup_job_tx(text, text, uuid, text, text) to service_role;
grant execute on function public.create_ai_draft_tx(text, text, text, text, jsonb, uuid, text, text) to service_role;
grant execute on function public.ingest_social_message_tx(text, text, text, text, jsonb) to service_role;
grant execute on function public.reconcile_payment_webhook_tx(text, text, text, uuid, text, numeric, text, jsonb) to service_role;

create index if not exists idx_profiles_auth_user_role on public.profiles(auth_user_id, role, is_active);
create index if not exists idx_service_requests_binding_status_created on public.service_requests(binding_status, created_at desc);
create index if not exists idx_status_transition_logs_object on public.status_transition_logs(machine, object_id, created_at desc);
create index if not exists idx_webhook_events_unique_lookup on public.webhook_events(provider, external_id);
