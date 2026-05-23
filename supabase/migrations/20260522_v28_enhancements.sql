-- NANOFIX-V28 enhancements for the existing 20260521 central admin schema.
-- This migration preserves the existing *_id naming contract and adds the
-- AI review, queue/DLQ, search, backup schedule and customer-binding fields.

create extension if not exists "pgcrypto";

alter table public.customers
  add column if not exists whatsapp text,
  add column if not exists account_status text not null default 'active',
  add column if not exists updated_at timestamptz not null default now();

alter table public.leads
  add column if not exists address_text text,
  add column if not exists issue_type text,
  add column if not exists message text,
  add column if not exists updated_at timestamptz not null default now();

alter table public.unified_intake
  add column if not exists source text,
  add column if not exists source_form text,
  add column if not exists customer_name text,
  add column if not exists phone text,
  add column if not exists email text,
  add column if not exists postal_code text,
  add column if not exists address_text text,
  add column if not exists property_type text,
  add column if not exists issue_type text,
  add column if not exists message text,
  add column if not exists pdpa_consent boolean not null default true,
  add column if not exists binding_status text not null default 'pending',
  add column if not exists updated_at timestamptz not null default now();

alter table public.service_requests
  add column if not exists contact_name text,
  add column if not exists phone text,
  add column if not exists whatsapp text,
  add column if not exists email text,
  add column if not exists leak_location text,
  add column if not exists issue_description text,
  add column if not exists property_type text,
  add column if not exists property_address text,
  add column if not exists preferred_time_text text,
  add column if not exists consent boolean not null default true,
  add column if not exists user_agent text,
  add column if not exists updated_at timestamptz not null default now();

alter table public.jobs
  add column if not exists notes text,
  add column if not exists updated_at timestamptz not null default now();

alter table public.quotations
  add column if not exists customer_id uuid references public.customers(customer_id) on delete set null,
  add column if not exists updated_at timestamptz not null default now();

alter table public.payments
  add column if not exists customer_id uuid references public.customers(customer_id) on delete set null;

create table if not exists public.social_messages (
  message_id uuid primary key default gen_random_uuid(),
  lead_id uuid references public.leads(lead_id) on delete set null,
  customer_id uuid references public.customers(customer_id) on delete set null,
  channel text not null,
  external_message_id text,
  direction text not null default 'inbound',
  body text,
  risk_level text,
  created_at timestamptz not null default now()
);

create table if not exists public.ai_drafts (
  draft_id uuid primary key default gen_random_uuid(),
  module text not null,
  record_id text,
  task text not null,
  input_text text not null,
  output_text text not null,
  ai_confidence numeric(4,2),
  ai_risk_level text not null,
  human_review_status text not null default 'pending_review',
  created_by text,
  reviewed_by text,
  reviewed_at timestamptz,
  published_at timestamptz,
  sent_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.ai_logs (
  ai_log_id uuid primary key default gen_random_uuid(),
  module text not null,
  record_id text,
  prompt_type text,
  risk_level text,
  confidence numeric(4,2),
  decision text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.inbound_events (
  inbound_event_id uuid primary key default gen_random_uuid(),
  source text not null,
  external_event_id text not null,
  signature_present boolean not null default false,
  payload_raw text,
  payload jsonb,
  status text not null default 'accepted',
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  unique(source, external_event_id)
);

create table if not exists public.webhook_retry_jobs (
  retry_job_id uuid primary key default gen_random_uuid(),
  inbound_event_id uuid not null references public.inbound_events(inbound_event_id) on delete cascade,
  attempts int not null default 0,
  next_run_at timestamptz not null default now(),
  last_error text,
  status text not null default 'queued',
  created_at timestamptz not null default now()
);

create table if not exists public.dead_letter_events (
  dead_letter_id uuid primary key default gen_random_uuid(),
  inbound_event_id uuid not null references public.inbound_events(inbound_event_id) on delete cascade,
  failure_reason text not null,
  status text not null default 'open',
  created_at timestamptz not null default now()
);

create table if not exists public.backup_schedules (
  module text primary key,
  frequency text not null,
  exact_run_time text not null,
  timezone text not null default 'Asia/Singapore',
  weekdays int[],
  day_of_month int,
  custom_cron text,
  retention_days int not null default 90,
  enabled boolean not null default true,
  next_run_at timestamptz,
  updated_by text,
  updated_at timestamptz not null default now()
);

create table if not exists public.search_logs (
  search_log_id uuid primary key default gen_random_uuid(),
  actor_id text,
  query text not null,
  filters jsonb not null default '[]'::jsonb,
  result_count int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.lead_attachments (
  attachment_id uuid primary key default gen_random_uuid(),
  lead_id uuid references public.leads(lead_id) on delete cascade,
  intake_id uuid references public.unified_intake(intake_id) on delete cascade,
  storage_bucket text not null default 'lead-attachments',
  storage_path text not null,
  file_name text,
  file_type text,
  file_size_bytes bigint,
  created_at timestamptz not null default now()
);

create table if not exists public.integration_outbox (
  outbox_id uuid primary key default gen_random_uuid(),
  event_type text not null,
  destination text not null,
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'queued' check (status in ('queued','sent','failed','dead_letter')),
  attempts int not null default 0,
  last_error text,
  next_run_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.form_rate_limits (
  rate_limit_id uuid primary key default gen_random_uuid(),
  fingerprint_hash text not null,
  form_name text not null,
  window_start timestamptz not null,
  request_count int not null default 1,
  blocked_until timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (fingerprint_hash, form_name, window_start)
);

create table if not exists public.seo_routes (
  route_path text primary key,
  legacy_hash text not null,
  title text not null,
  description text not null,
  canonical_path text not null,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.cta_config (
  cta_key text primary key,
  label_en text not null,
  label_zh text,
  business_semantic text,
  href text not null,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);



-- V28 deployment hardening: tables/views used by admin APIs and health checks.
create table if not exists public.app_modules (
  module_key text primary key,
  name text not null,
  category text not null default 'system',
  owner_role text,
  criticality text not null default 'normal',
  health_status text not null default 'unknown',
  enabled boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.module_health_events (
  health_event_id uuid primary key default gen_random_uuid(),
  module_key text not null,
  check_name text not null,
  status text not null check (status in ('healthy','degraded','down','unknown')),
  message text,
  latency_ms int,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create or replace view public.latest_module_health as
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

create table if not exists public.entity_events (
  event_id uuid primary key default gen_random_uuid(),
  topic text not null,
  entity_type text not null,
  entity_id text,
  module_key text,
  actor_id text,
  actor_role text,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.customer_binding_suggestions (
  suggestion_id uuid primary key default gen_random_uuid(),
  service_request_id uuid not null references public.service_requests(service_request_id) on delete cascade,
  customer_id uuid not null references public.customers(customer_id) on delete cascade,
  match_score numeric(5,2) not null check (match_score between 0 and 100),
  match_reasons text[] not null default '{}',
  status text not null default 'suggested' check (status in ('suggested','approved','rejected')),
  reviewed_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(service_request_id, customer_id)
);

create table if not exists public.global_search_documents (
  document_id uuid primary key default gen_random_uuid(),
  entity_type text not null,
  entity_id text,
  module_key text,
  title text not null,
  subtitle text,
  search_text text not null default '',
  route_path text,
  priority text,
  updated_at timestamptz not null default now()
);

create index if not exists idx_module_health_events_latest on public.module_health_events(module_key, check_name, created_at desc);
create index if not exists idx_entity_events_module_created on public.entity_events(module_key, created_at desc);
create index if not exists idx_customer_binding_suggestions_status on public.customer_binding_suggestions(status, match_score desc);
create index if not exists idx_global_search_documents_text on public.global_search_documents using gin (to_tsvector('simple', coalesce(title,'') || ' ' || coalesce(subtitle,'') || ' ' || coalesce(search_text,'')));

alter table public.app_modules enable row level security;
alter table public.module_health_events enable row level security;
alter table public.entity_events enable row level security;
alter table public.customer_binding_suggestions enable row level security;
alter table public.global_search_documents enable row level security;

insert into public.app_modules (module_key, name, category, owner_role, criticality, health_status)
values
  ('dashboard', 'Dashboard, Analytics & Alerts', 'core', 'super_admin', 'critical', 'unknown'),
  ('operations', 'Service & Order Operations', 'operations', 'operations_admin', 'critical', 'unknown'),
  ('website', 'Website Management', 'content', 'content_admin', 'high', 'unknown'),
  ('social', 'Social Media Management', 'content', 'content_admin', 'high', 'unknown'),
  ('ai', 'AI Intelligence Center', 'ai', 'ai_admin', 'high', 'unknown'),
  ('customers', 'Customer Center', 'customer', 'support_admin', 'critical', 'unknown'),
  ('settings', 'Website & System Settings', 'system', 'super_admin', 'critical', 'unknown')
on conflict (module_key) do update set
  name = excluded.name,
  category = excluded.category,
  owner_role = excluded.owner_role,
  criticality = excluded.criticality,
  updated_at = now();

create index if not exists idx_service_requests_binding_status on public.service_requests(binding_status);
create index if not exists idx_service_requests_status_priority on public.service_requests(status, priority);
create index if not exists idx_social_messages_channel_created on public.social_messages(channel, created_at desc);
create index if not exists idx_ai_drafts_review on public.ai_drafts(human_review_status, ai_risk_level);
create index if not exists idx_inbound_events_status on public.inbound_events(status, received_at desc);
create index if not exists idx_webhook_retry_next_run on public.webhook_retry_jobs(next_run_at, status);
create index if not exists idx_search_logs_created on public.search_logs(created_at desc);
create index if not exists idx_lead_attachments_lead on public.lead_attachments(lead_id, created_at desc);
create index if not exists idx_integration_outbox_status_next on public.integration_outbox(status, next_run_at);
create index if not exists idx_form_rate_limits_lookup on public.form_rate_limits(fingerprint_hash, form_name, window_start);
create index if not exists idx_seo_routes_enabled on public.seo_routes(enabled);

alter table public.social_messages enable row level security;
alter table public.ai_drafts enable row level security;
alter table public.ai_logs enable row level security;
alter table public.inbound_events enable row level security;
alter table public.webhook_retry_jobs enable row level security;
alter table public.dead_letter_events enable row level security;
alter table public.backup_schedules enable row level security;
alter table public.search_logs enable row level security;
alter table public.lead_attachments enable row level security;
alter table public.integration_outbox enable row level security;
alter table public.form_rate_limits enable row level security;
alter table public.seo_routes enable row level security;
alter table public.cta_config enable row level security;

insert into public.seo_routes (route_path, legacy_hash, title, description, canonical_path)
values
  ('/leak-detection/thermal-imaging-scan', '#thermal-imaging-leak-scan', 'Thermal Imaging Leak Scan | NANOFIX Singapore', 'Thermal imaging scan for non-invasive leak detection in Singapore.', '/leak-detection/thermal-imaging-scan'),
  ('/leak-detection/drone-facade-inspection', '#drone-facade-leak-inspection', 'Drone Facade Leak Inspection | NANOFIX Singapore', 'Drone facade inspection for external wall leakage and waterproofing diagnosis.', '/leak-detection/drone-facade-inspection'),
  ('/no-hacking-repair/toilet-no-hacking-repair', '#toilet-no-hacking-repair', 'Toilet No-Hacking Repair | NANOFIX Singapore', 'No-hacking toilet and bathroom leakage repair request page.', '/no-hacking-repair/toilet-no-hacking-repair'),
  ('/waterproofing-works/rc-roof-metal-roof', '#rc-roof-metal-roof', 'RC Roof & Metal Roof Waterproofing | NANOFIX Singapore', 'Roof waterproofing works for RC roof and metal roof leakage.', '/waterproofing-works/rc-roof-metal-roof'),
  ('/track-record-warranty/service-warranty-terms', '#service-warranty-terms', 'Service Warranty Terms | NANOFIX Singapore', 'Waterproofing repair warranty scope, records and service terms.', '/track-record-warranty/service-warranty-terms'),
  ('/free-leak-inspection-quote', '#get-free-quote-page', 'Free Leak Inspection & Quote | NANOFIX Singapore', 'Request free leak inspection and transparent repair quote from NANOFIX.', '/free-leak-inspection-quote'),
  ('/member-sign-up-login', '#client-portal-repair-tracking', 'Member Sign Up / Login | NANOFIX Singapore', 'Member portal login for repair progress, service status, quotations, invoices, payments and warranty records.', '/member-sign-up-login')
on conflict (route_path) do update set
  legacy_hash = excluded.legacy_hash,
  title = excluded.title,
  description = excluded.description,
  canonical_path = excluded.canonical_path,
  updated_at = now();

insert into public.cta_config (cta_key, label_en, label_zh, business_semantic, href)
values
  ('top_nav_quote', '⭐️ Get a Free Quote', '⭐️ 获取免费报价', 'Free Leak Inspection & Quote', '#get-free-quote-page'),
  ('form_title', 'Request Free Inspection & Quote', '申请免费检测与报价', 'Free Leak Inspection & Quote', '#quote-submit-request'),
  ('form_submit', 'Submit Repair Request', '提交报修申请', 'Free Leak Inspection & Quote', '/api/public-repair-request'),
  ('member_portal', 'Member Sign Up / Login', '会员注册 / 登录', 'Member registration and login', '/member-sign-up-login')
on conflict (cta_key) do update set
  label_en = excluded.label_en,
  label_zh = excluded.label_zh,
  business_semantic = excluded.business_semantic,
  href = excluded.href,
  updated_at = now();

insert into storage.buckets (id, name, public)
values ('lead-attachments', 'lead-attachments', false)
on conflict (id) do nothing;

create policy "customers can read own quotations"
  on public.quotations for select
  using (
    customer_id in (select customer_id from public.customers where auth_user_id = auth.uid())
    and status in ('sent','viewed','accepted','rejected','expired')
  );

-- Admin/server writes continue to use service role. Do not expose service role
-- key, AI keys, WhatsApp tokens or Google Business Profile tokens to clients.
