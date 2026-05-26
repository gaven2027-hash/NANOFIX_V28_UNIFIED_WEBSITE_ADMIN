-- NANOFIX V28.1.4 Advertising & Promotion Center
-- Phase 1: backend-only campaign, ROI, approval and AI suggestion records.
-- No automatic external ad publishing and no automatic budget increase.

create table if not exists public.ad_campaigns (
  campaign_id uuid primary key default gen_random_uuid(),
  platform text not null default 'manual_import',
  campaign_name text not null,
  service_category text,
  status text not null default 'draft',
  approval_status text not null default 'draft',
  daily_budget numeric not null default 0,
  monthly_budget numeric not null default 0,
  spend_amount numeric not null default 0,
  leads_count integer not null default 0,
  bookings_count integer not null default 0,
  quotations_count integer not null default 0,
  jobs_count integer not null default 0,
  revenue_amount numeric not null default 0,
  gross_profit_amount numeric not null default 0,
  landing_page_url text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  headline text,
  primary_text text,
  owner_id uuid,
  created_by uuid,
  approved_by uuid,
  metadata_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ad_ai_suggestions (
  suggestion_id uuid primary key default gen_random_uuid(),
  campaign_id uuid references public.ad_campaigns(campaign_id) on delete cascade,
  suggestion_type text not null default 'performance',
  title text not null,
  summary text,
  editable_text text,
  status text not null default 'draft',
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ad_approval_requests (
  approval_request_id uuid primary key default gen_random_uuid(),
  campaign_id uuid references public.ad_campaigns(campaign_id) on delete cascade,
  request_type text not null default 'campaign_review',
  status text not null default 'submitted',
  requested_by uuid,
  finance_reviewer_id uuid,
  super_admin_reviewer_id uuid,
  request_note text,
  decision_note text,
  before_data jsonb not null default '{}'::jsonb,
  after_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists ad_campaigns_platform_idx on public.ad_campaigns(platform);
create index if not exists ad_campaigns_status_idx on public.ad_campaigns(status, approval_status);
create index if not exists ad_campaigns_owner_idx on public.ad_campaigns(owner_id);
create index if not exists ad_campaigns_created_at_idx on public.ad_campaigns(created_at);
create index if not exists ad_ai_suggestions_campaign_idx on public.ad_ai_suggestions(campaign_id);
create index if not exists ad_approval_requests_campaign_idx on public.ad_approval_requests(campaign_id);

alter table public.ad_campaigns enable row level security;
alter table public.ad_ai_suggestions enable row level security;
alter table public.ad_approval_requests enable row level security;
