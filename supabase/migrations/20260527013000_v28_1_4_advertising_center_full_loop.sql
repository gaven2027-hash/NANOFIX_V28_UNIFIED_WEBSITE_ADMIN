-- NANOFIX V28.1.4 Advertising Center full loop tables
-- Adds account, creative, daily performance, attribution, budget change, sync and takeover records.

create table if not exists public.ad_platform_accounts (
  ad_account_id uuid primary key default gen_random_uuid(),
  platform text not null,
  account_name text not null,
  platform_account_id text,
  currency text not null default 'SGD',
  timezone text not null default 'Asia/Singapore',
  connection_status text not null default 'manual_or_pending',
  sync_mode text not null default 'manual_csv',
  last_sync_at timestamptz,
  token_status text,
  metadata_json jsonb not null default '{}'::jsonb,
  created_by uuid,
  updated_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ad_creatives (
  creative_id uuid primary key default gen_random_uuid(),
  campaign_id uuid references public.ad_campaigns(campaign_id) on delete cascade,
  platform text,
  creative_type text not null default 'image',
  title text,
  headline text,
  primary_text text,
  description text,
  cta text,
  landing_page_url text,
  media_asset_id uuid,
  media_url text,
  version_label text,
  status text not null default 'draft',
  ai_generated boolean not null default false,
  editable_text text,
  created_by uuid,
  updated_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ad_performance_daily (
  performance_id uuid primary key default gen_random_uuid(),
  performance_date date not null,
  campaign_id uuid references public.ad_campaigns(campaign_id) on delete cascade,
  creative_id uuid references public.ad_creatives(creative_id) on delete set null,
  platform text,
  impressions integer not null default 0,
  clicks integer not null default 0,
  spend_amount numeric not null default 0,
  leads_count integer not null default 0,
  whatsapp_clicks integer not null default 0,
  phone_clicks integer not null default 0,
  form_submits integer not null default 0,
  bookings_count integer not null default 0,
  quotations_count integer not null default 0,
  jobs_count integer not null default 0,
  invoice_amount numeric not null default 0,
  payment_amount numeric not null default 0,
  gross_profit_amount numeric not null default 0,
  metadata_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ad_conversion_attribution (
  attribution_id uuid primary key default gen_random_uuid(),
  campaign_id uuid references public.ad_campaigns(campaign_id) on delete set null,
  creative_id uuid references public.ad_creatives(creative_id) on delete set null,
  lead_id uuid,
  customer_id uuid,
  service_request_id uuid,
  job_id uuid,
  quotation_id uuid,
  invoice_id uuid,
  payment_id uuid,
  event_type text not null,
  event_value numeric not null default 0,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  utm_content text,
  utm_term text,
  click_id text,
  attribution_model text not null default 'first_last_touch_review',
  confidence_score numeric,
  corrected_by uuid,
  correction_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ad_budget_change_requests (
  budget_change_id uuid primary key default gen_random_uuid(),
  campaign_id uuid references public.ad_campaigns(campaign_id) on delete cascade,
  current_daily_budget numeric not null default 0,
  requested_daily_budget numeric not null default 0,
  current_monthly_budget numeric not null default 0,
  requested_monthly_budget numeric not null default 0,
  reason text,
  status text not null default 'submitted',
  requested_by uuid,
  finance_reviewed_by uuid,
  super_admin_approved_by uuid,
  rejected_by uuid,
  decision_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ad_sync_logs (
  sync_log_id uuid primary key default gen_random_uuid(),
  platform text not null,
  sync_mode text not null default 'manual_csv',
  status text not null default 'pending',
  rows_imported integer not null default 0,
  error_message text,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  created_by uuid,
  metadata_json jsonb not null default '{}'::jsonb
);

create table if not exists public.ad_super_admin_takeovers (
  takeover_id uuid primary key default gen_random_uuid(),
  object_type text not null,
  object_id uuid,
  previous_owner_id uuid,
  takeover_by uuid not null,
  takeover_reason text,
  before_data jsonb not null default '{}'::jsonb,
  after_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists ad_platform_accounts_platform_idx on public.ad_platform_accounts(platform);
create index if not exists ad_creatives_campaign_idx on public.ad_creatives(campaign_id);
create index if not exists ad_performance_daily_campaign_date_idx on public.ad_performance_daily(campaign_id, performance_date);
create index if not exists ad_conversion_attribution_campaign_idx on public.ad_conversion_attribution(campaign_id);
create index if not exists ad_budget_change_requests_campaign_idx on public.ad_budget_change_requests(campaign_id, status);
create index if not exists ad_sync_logs_platform_idx on public.ad_sync_logs(platform, started_at);
create index if not exists ad_super_admin_takeovers_object_idx on public.ad_super_admin_takeovers(object_type, object_id);

alter table public.ad_platform_accounts enable row level security;
alter table public.ad_creatives enable row level security;
alter table public.ad_performance_daily enable row level security;
alter table public.ad_conversion_attribution enable row level security;
alter table public.ad_budget_change_requests enable row level security;
alter table public.ad_sync_logs enable row level security;
alter table public.ad_super_admin_takeovers enable row level security;
