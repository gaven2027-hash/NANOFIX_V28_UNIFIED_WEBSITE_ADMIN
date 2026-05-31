-- NANOFIX V28.2 Advertising & Promotion Center database bridge
-- Purpose: make paid ads account binding, test bridge, sync events, leads, campaigns and attribution auditable.

create extension if not exists pgcrypto;

create or replace function public.nanofix_touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.nanofix_is_internal_actor()
returns boolean
language sql
stable
as $$
  select coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') in ('super_admin','admin','operations_admin','operations','finance','marketing_admin','content_admin','support','service_admin')
    or coalesce(auth.jwt() -> 'user_metadata' ->> 'role', '') in ('super_admin','admin','operations_admin','operations','finance','marketing_admin','content_admin','support','service_admin')
    or coalesce(auth.jwt() -> 'user_metadata' ->> 'requested_role_group', '') in ('super_admin','admin','operations','finance','marketing_admin','content_admin','support');
$$;

create table if not exists public.ad_connection_events (
  ad_connection_event_id uuid primary key default gen_random_uuid(),
  platform text not null,
  action text not null check (action in ('connect','test','sync','disconnect','rotate_secret','manual_import')),
  account_name text,
  external_account_id text,
  credential_summary jsonb not null default '{}'::jsonb,
  linked_modules jsonb not null default '[]'::jsonb,
  provider_data jsonb not null default '[]'::jsonb,
  status text not null default 'pending',
  bridge_ready boolean not null default false,
  bridge_checks jsonb not null default '[]'::jsonb,
  result_summary jsonb not null default '{}'::jsonb,
  source_ip text,
  user_agent text,
  actor_profile_id uuid,
  created_at timestamptz not null default now()
);

create table if not exists public.ad_accounts (
  ad_account_id uuid primary key default gen_random_uuid(),
  platform text not null,
  account_name text not null,
  external_account_id text not null,
  business_id text,
  currency_code text default 'SGD',
  timezone text default 'Asia/Singapore',
  status text not null default 'pending_connection' check (status in ('pending_connection','connected','test_failed','sync_enabled','sync_paused','disconnected','manual_mode')),
  credential_ref text,
  credential_summary jsonb not null default '{}'::jsonb,
  linked_modules jsonb not null default '[]'::jsonb,
  provider_data jsonb not null default '[]'::jsonb,
  last_tested_at timestamptz,
  last_synced_at timestamptz,
  last_error text,
  owner_role text default 'marketing_admin',
  created_by uuid,
  updated_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(platform, external_account_id)
);

create table if not exists public.ad_campaigns (
  ad_campaign_id uuid primary key default gen_random_uuid(),
  ad_account_id uuid references public.ad_accounts(ad_account_id) on delete cascade,
  platform text not null,
  external_campaign_id text,
  campaign_name text not null,
  objective text,
  campaign_status text not null default 'unknown',
  approval_status text not null default 'draft' check (approval_status in ('draft','pending_review','approved','rejected','paused','published','archived')),
  start_date date,
  end_date date,
  currency_code text default 'SGD',
  daily_budget numeric(12,2),
  lifetime_budget numeric(12,2),
  spend numeric(12,2) not null default 0,
  impressions integer not null default 0,
  clicks integer not null default 0,
  conversions integer not null default 0,
  leads integer not null default 0,
  bookings integer not null default 0,
  revenue numeric(12,2) not null default 0,
  cpl numeric(12,2),
  roi numeric(12,4),
  service_category text,
  landing_page_url text,
  ai_suggestions jsonb not null default '[]'::jsonb,
  provider_payload jsonb not null default '{}'::jsonb,
  last_synced_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(platform, external_campaign_id)
);

create table if not exists public.ad_leads (
  ad_lead_id uuid primary key default gen_random_uuid(),
  ad_account_id uuid references public.ad_accounts(ad_account_id) on delete set null,
  ad_campaign_id uuid references public.ad_campaigns(ad_campaign_id) on delete set null,
  platform text not null,
  external_lead_id text,
  lead_source text not null default 'paid_ads',
  lead_status text not null default 'new' check (lead_status in ('new','qualified','converted_to_customer','converted_to_service_request','duplicate','spam','archived')),
  customer_id uuid,
  lead_id uuid,
  service_request_id uuid,
  customer_name text,
  phone text,
  email text,
  whatsapp text,
  address_text text,
  enquiry_message text,
  service_category text,
  attribution_payload jsonb not null default '{}'::jsonb,
  provider_payload jsonb not null default '{}'::jsonb,
  received_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(platform, external_lead_id)
);

create table if not exists public.manual_ad_leads (
  manual_ad_lead_id uuid primary key default gen_random_uuid(),
  platform text not null,
  account_name text,
  campaign_name text,
  source_file_name text,
  imported_by uuid,
  import_batch_id uuid default gen_random_uuid(),
  customer_name text,
  phone text,
  email text,
  whatsapp text,
  enquiry_message text,
  service_category text,
  spend numeric(12,2),
  lead_status text not null default 'new' check (lead_status in ('new','qualified','converted_to_customer','converted_to_service_request','duplicate','spam','archived')),
  customer_id uuid,
  lead_id uuid,
  service_request_id uuid,
  raw_row jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.attribution_events (
  attribution_event_id uuid primary key default gen_random_uuid(),
  platform text not null,
  source_type text not null default 'paid_ads' check (source_type in ('paid_ads','organic_social','website','manual_import','referral','unknown')),
  event_type text not null check (event_type in ('impression','click','call','form_submit','whatsapp_click','message','lead_created','customer_created','service_request_created','quotation_created','invoice_paid','booking','revenue','manual_adjustment')),
  ad_account_id uuid references public.ad_accounts(ad_account_id) on delete set null,
  ad_campaign_id uuid references public.ad_campaigns(ad_campaign_id) on delete set null,
  ad_lead_id uuid references public.ad_leads(ad_lead_id) on delete set null,
  manual_ad_lead_id uuid references public.manual_ad_leads(manual_ad_lead_id) on delete set null,
  customer_id uuid,
  lead_id uuid,
  service_request_id uuid,
  job_id uuid,
  quotation_id uuid,
  invoice_id uuid,
  amount numeric(12,2),
  currency_code text default 'SGD',
  event_at timestamptz not null default now(),
  attribution_window_days integer default 30,
  attribution_model text default 'last_click',
  utm_source text,
  utm_medium text,
  utm_campaign text,
  utm_content text,
  utm_term text,
  landing_page_url text,
  referrer_url text,
  metadata_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists ad_connection_events_platform_action_idx on public.ad_connection_events(platform, action, created_at desc);
create index if not exists ad_connection_events_status_idx on public.ad_connection_events(status, created_at desc);
create index if not exists ad_accounts_platform_status_idx on public.ad_accounts(platform, status);
create index if not exists ad_accounts_external_idx on public.ad_accounts(platform, external_account_id);
create index if not exists ad_campaigns_account_idx on public.ad_campaigns(ad_account_id, campaign_status);
create index if not exists ad_campaigns_platform_external_idx on public.ad_campaigns(platform, external_campaign_id);
create index if not exists ad_campaigns_performance_idx on public.ad_campaigns(platform, spend desc, leads desc, updated_at desc);
create index if not exists ad_leads_account_campaign_idx on public.ad_leads(ad_account_id, ad_campaign_id, received_at desc);
create index if not exists ad_leads_status_idx on public.ad_leads(lead_status, received_at desc);
create index if not exists ad_leads_customer_idx on public.ad_leads(customer_id);
create index if not exists ad_leads_service_request_idx on public.ad_leads(service_request_id);
create index if not exists manual_ad_leads_platform_batch_idx on public.manual_ad_leads(platform, import_batch_id, created_at desc);
create index if not exists manual_ad_leads_status_idx on public.manual_ad_leads(lead_status, created_at desc);
create index if not exists attribution_events_platform_type_idx on public.attribution_events(platform, event_type, event_at desc);
create index if not exists attribution_events_campaign_idx on public.attribution_events(ad_campaign_id, event_at desc);
create index if not exists attribution_events_customer_idx on public.attribution_events(customer_id, event_at desc);
create index if not exists attribution_events_service_request_idx on public.attribution_events(service_request_id, event_at desc);

create trigger ad_accounts_touch_updated_at before update on public.ad_accounts for each row execute function public.nanofix_touch_updated_at();
create trigger ad_campaigns_touch_updated_at before update on public.ad_campaigns for each row execute function public.nanofix_touch_updated_at();
create trigger ad_leads_touch_updated_at before update on public.ad_leads for each row execute function public.nanofix_touch_updated_at();
create trigger manual_ad_leads_touch_updated_at before update on public.manual_ad_leads for each row execute function public.nanofix_touch_updated_at();

alter table public.ad_connection_events enable row level security;
alter table public.ad_accounts enable row level security;
alter table public.ad_campaigns enable row level security;
alter table public.ad_leads enable row level security;
alter table public.manual_ad_leads enable row level security;
alter table public.attribution_events enable row level security;

drop policy if exists ad_connection_events_internal_all on public.ad_connection_events;
create policy ad_connection_events_internal_all on public.ad_connection_events for all to authenticated using (public.nanofix_is_internal_actor()) with check (public.nanofix_is_internal_actor());

drop policy if exists ad_accounts_internal_all on public.ad_accounts;
create policy ad_accounts_internal_all on public.ad_accounts for all to authenticated using (public.nanofix_is_internal_actor()) with check (public.nanofix_is_internal_actor());

drop policy if exists ad_campaigns_internal_all on public.ad_campaigns;
create policy ad_campaigns_internal_all on public.ad_campaigns for all to authenticated using (public.nanofix_is_internal_actor()) with check (public.nanofix_is_internal_actor());

drop policy if exists ad_leads_internal_all on public.ad_leads;
create policy ad_leads_internal_all on public.ad_leads for all to authenticated using (public.nanofix_is_internal_actor()) with check (public.nanofix_is_internal_actor());

drop policy if exists manual_ad_leads_internal_all on public.manual_ad_leads;
create policy manual_ad_leads_internal_all on public.manual_ad_leads for all to authenticated using (public.nanofix_is_internal_actor()) with check (public.nanofix_is_internal_actor());

drop policy if exists attribution_events_internal_all on public.attribution_events;
create policy attribution_events_internal_all on public.attribution_events for all to authenticated using (public.nanofix_is_internal_actor()) with check (public.nanofix_is_internal_actor());

comment on table public.ad_connection_events is 'NANOFIX advertising account API binding, test and sync audit events. Secrets are masked; real secrets should live in encrypted secret storage.';
comment on table public.ad_accounts is 'Connected paid advertising accounts across Google, Meta, TikTok, LinkedIn, Microsoft/Bing and manual platforms.';
comment on table public.ad_campaigns is 'Synced or manually imported paid ad campaigns with cost, leads, bookings, revenue and ROI metrics.';
comment on table public.ad_leads is 'Paid advertising leads imported from provider APIs and linked to customer, lead and service request records when converted.';
comment on table public.manual_ad_leads is 'Manual ad lead imports for platforms without approved API access, including Xiaohongshu/manual campaigns.';
comment on table public.attribution_events is 'Cross-channel attribution events linking ad accounts, campaigns, leads, customers, service requests, jobs, quotations and invoices.';
