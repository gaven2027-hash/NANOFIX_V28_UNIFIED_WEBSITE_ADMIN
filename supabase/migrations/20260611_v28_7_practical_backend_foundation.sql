-- NANOFIX V28.7 Practical Backend Real-Use Foundation
-- Date: 2026-06-11
-- Purpose: prepare Service/Customer chain, API Credential Center, Social/Ads staging and Video Engine rules.
-- Safety: idempotent create-if-not-exists migration; does not disable RLS and does not reset production data.

create extension if not exists pgcrypto;

create table if not exists public.v287_service_chain_stages (
  stage_key text primary key,
  stage_order integer not null unique,
  label_en text not null,
  label_zh text not null,
  module_route text not null default '/service-operations',
  required_tables text[] not null default '{}',
  required_apis text[] not null default '{}',
  status text not null default 'planned' check (status in ('planned', 'ready_for_repair', 'in_progress', 'verified', 'blocked')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.v287_customer_chain_stages (
  stage_key text primary key,
  stage_order integer not null unique,
  label_en text not null,
  label_zh text not null,
  module_route text not null default '/customer-center',
  required_tables text[] not null default '{}',
  required_apis text[] not null default '{}',
  status text not null default 'planned' check (status in ('planned', 'ready_for_repair', 'in_progress', 'verified', 'blocked')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.integration_providers (
  provider_key text primary key,
  category text not null check (category in ('social', 'ads', 'messaging', 'storage', 'deployment', 'ai', 'manual')),
  label_en text not null,
  label_zh text not null,
  connection_mode text not null default 'oauth' check (connection_mode in ('oauth', 'api_key', 'manual', 'webhook', 'hybrid')),
  status text not null default 'auth_required' check (status in ('connected', 'auth_required', 'manual_mode', 'api_review_required', 'error', 'disabled')),
  supports_test boolean not null default true,
  supports_sync boolean not null default true,
  supports_webhook boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.integration_credentials (
  credential_id uuid primary key default gen_random_uuid(),
  provider_key text not null references public.integration_providers(provider_key) on delete cascade,
  account_label text not null,
  masked_reference text not null,
  encrypted_payload text,
  encryption_hint text not null default 'server-side encrypted secret; never return plaintext to frontend',
  status text not null default 'auth_required' check (status in ('connected', 'auth_required', 'manual_mode', 'api_review_required', 'error', 'disabled')),
  last_test_at timestamptz,
  last_sync_at timestamptz,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.integration_test_logs (
  log_id uuid primary key default gen_random_uuid(),
  provider_key text not null references public.integration_providers(provider_key) on delete cascade,
  credential_id uuid references public.integration_credentials(credential_id) on delete set null,
  action text not null check (action in ('save_binding', 'test_connection', 'sync_data', 'webhook_check', 'publish', 'manual_export')),
  ok boolean not null default false,
  message text,
  safe_details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.webhook_events (
  event_id uuid primary key default gen_random_uuid(),
  provider_key text not null references public.integration_providers(provider_key) on delete cascade,
  external_event_id text,
  event_type text not null,
  payload_safe jsonb not null default '{}'::jsonb,
  signature_status text not null default 'unchecked' check (signature_status in ('unchecked', 'valid', 'invalid', 'missing')),
  processing_status text not null default 'received' check (processing_status in ('received', 'processed', 'retrying', 'dead_letter', 'ignored')),
  received_at timestamptz not null default now(),
  processed_at timestamptz
);

create table if not exists public.integration_outbox (
  outbox_id uuid primary key default gen_random_uuid(),
  provider_key text not null references public.integration_providers(provider_key) on delete cascade,
  job_type text not null,
  target_ref text,
  payload_safe jsonb not null default '{}'::jsonb,
  status text not null default 'queued' check (status in ('queued', 'running', 'succeeded', 'failed', 'cancelled')),
  retry_count integer not null default 0,
  next_retry_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.dead_letter_events (
  dead_letter_id uuid primary key default gen_random_uuid(),
  provider_key text,
  source_table text not null,
  source_id text not null,
  error_message text not null,
  payload_safe jsonb not null default '{}'::jsonb,
  resolved boolean not null default false,
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

create table if not exists public.platform_video_specs (
  spec_id uuid primary key default gen_random_uuid(),
  platform_key text not null,
  placement_key text not null,
  label_en text not null,
  label_zh text not null,
  aspect_ratio text not null,
  width integer,
  height integer,
  max_duration_seconds integer,
  safe_zone jsonb not null default '{}'::jsonb,
  output_format text not null default 'mp4',
  publishing_mode text not null default 'approval' check (publishing_mode in ('approval', 'manual', 'api', 'export')),
  is_active boolean not null default true,
  updated_at timestamptz not null default now(),
  unique(platform_key, placement_key)
);

create table if not exists public.media_transform_jobs (
  transform_job_id uuid primary key default gen_random_uuid(),
  source_asset_id uuid,
  source_path text,
  requested_by uuid,
  target_platforms text[] not null default '{}',
  status text not null default 'queued' check (status in ('queued', 'running', 'succeeded', 'failed', 'cancelled')),
  error_message text,
  created_at timestamptz not null default now(),
  started_at timestamptz,
  finished_at timestamptz
);

create table if not exists public.media_renditions (
  rendition_id uuid primary key default gen_random_uuid(),
  transform_job_id uuid references public.media_transform_jobs(transform_job_id) on delete set null,
  platform_key text not null,
  placement_key text not null,
  storage_path text not null,
  preview_url text,
  download_url text,
  width integer,
  height integer,
  duration_seconds numeric,
  file_size_bytes bigint,
  format text not null default 'mp4',
  compliance_status text not null default 'unchecked' check (compliance_status in ('unchecked', 'passed', 'warning', 'failed')),
  compliance_notes text,
  created_at timestamptz not null default now()
);

alter table public.v287_service_chain_stages enable row level security;
alter table public.v287_customer_chain_stages enable row level security;
alter table public.integration_providers enable row level security;
alter table public.integration_credentials enable row level security;
alter table public.integration_test_logs enable row level security;
alter table public.webhook_events enable row level security;
alter table public.integration_outbox enable row level security;
alter table public.dead_letter_events enable row level security;
alter table public.platform_video_specs enable row level security;
alter table public.media_transform_jobs enable row level security;
alter table public.media_renditions enable row level security;

create index if not exists idx_integration_credentials_provider on public.integration_credentials(provider_key);
create index if not exists idx_integration_test_logs_provider_created on public.integration_test_logs(provider_key, created_at desc);
create index if not exists idx_webhook_events_provider_received on public.webhook_events(provider_key, received_at desc);
create index if not exists idx_integration_outbox_status_retry on public.integration_outbox(status, next_retry_at);
create index if not exists idx_dead_letter_events_resolved_created on public.dead_letter_events(resolved, created_at desc);
create index if not exists idx_platform_video_specs_platform on public.platform_video_specs(platform_key, is_active);
create index if not exists idx_media_transform_jobs_status on public.media_transform_jobs(status, created_at desc);
create index if not exists idx_media_renditions_platform on public.media_renditions(platform_key, placement_key);

insert into public.v287_service_chain_stages(stage_key, stage_order, label_en, label_zh, required_tables, required_apis, status)
values
  ('leads_intake', 1, 'Leads & Intake', '线索与报修入口', array['unified_intake','leads','service_requests'], array['/api/public/intake','/api/admin/leads','/api/admin/service-requests'], 'ready_for_repair'),
  ('site_inspection', 2, 'Site Inspection', '现场查验', array['service_requests','inspection_records','media_assets'], array['/api/admin/inspections'], 'ready_for_repair'),
  ('quotations', 3, 'Quotations', '报价', array['quotations','quotation_items','approval_tasks'], array['/api/admin/quotations'], 'ready_for_repair'),
  ('jobs_scheduling', 4, 'Jobs & Scheduling', '工单与排期', array['jobs','job_status_logs','engineer_tasks'], array['/api/admin/jobs'], 'ready_for_repair'),
  ('engineer_tasks', 5, 'Engineer Tasks', '工程师任务', array['engineer_tasks','job_status_logs'], array['/api/admin/engineer-tasks'], 'planned'),
  ('invoices', 6, 'Invoices', '发票', array['invoices','invoice_items'], array['/api/admin/invoices'], 'ready_for_repair'),
  ('payments', 7, 'Payments', '付款', array['payments','payment_events'], array['/api/admin/payments'], 'ready_for_repair'),
  ('warranty_completion', 8, 'Warranty & Completion', '完工与保修', array['warranties','warranty_claims','completion_records'], array['/api/admin/warranties'], 'ready_for_repair'),
  ('operations_audit', 9, 'Operations Audit', '操作审计', array['audit_logs','status_transition_logs'], array['/api/admin/audit-logs'], 'ready_for_repair')
on conflict (stage_key) do update set
  label_en = excluded.label_en,
  label_zh = excluded.label_zh,
  required_tables = excluded.required_tables,
  required_apis = excluded.required_apis,
  status = excluded.status,
  updated_at = now();

insert into public.v287_customer_chain_stages(stage_key, stage_order, label_en, label_zh, required_tables, required_apis, status)
values
  ('customer_profiles', 1, 'Customer Profiles', '客户档案', array['customer_profiles'], array['/api/admin/customers'], 'ready_for_repair'),
  ('customer_binding_verification', 2, 'Customer Binding & Verification', '客户绑定与验证', array['customer_profiles','customer_bindings','customer_claims'], array['/api/admin/customers/bindings'], 'ready_for_repair'),
  ('customer_portal_accounts', 3, 'Customer Portal Accounts', '客户门户账号', array['customer_profiles','customer_portal_accounts'], array['/api/admin/customer-portal/accounts'], 'planned'),
  ('repair_tracking', 4, 'Repair Tracking', '维修进度追踪', array['service_requests','jobs','job_status_logs'], array['/api/customer/repair-tracking'], 'ready_for_repair'),
  ('quotes_payments', 5, 'Quotes & Payments', '报价与付款', array['quotations','invoices','payments'], array['/api/customer/quotes','/api/customer/payments'], 'ready_for_repair'),
  ('warranty_documents', 6, 'Warranty & Documents', '保修与文件', array['warranties','customer_documents'], array['/api/customer/warranties'], 'ready_for_repair'),
  ('reviews_feedback', 7, 'Reviews & Feedback', '评价与反馈', array['customer_reviews','testimonials'], array['/api/customer/reviews'], 'planned'),
  ('privacy_consent', 8, 'Privacy & Consent', '隐私与授权', array['consent_logs','privacy_requests'], array['/api/customer/privacy'], 'planned')
on conflict (stage_key) do update set
  label_en = excluded.label_en,
  label_zh = excluded.label_zh,
  required_tables = excluded.required_tables,
  required_apis = excluded.required_apis,
  status = excluded.status,
  updated_at = now();

insert into public.integration_providers(provider_key, category, label_en, label_zh, connection_mode, status, supports_test, supports_sync, supports_webhook)
values
  ('whatsapp_cloud', 'messaging', 'WhatsApp Cloud API', 'WhatsApp Cloud API', 'webhook', 'auth_required', true, true, true),
  ('facebook_pages', 'social', 'Facebook Pages', 'Facebook 页面', 'oauth', 'auth_required', true, true, true),
  ('instagram_business', 'social', 'Instagram Business', 'Instagram 商业账号', 'oauth', 'auth_required', true, true, true),
  ('google_business_profile', 'social', 'Google Business Profile', 'Google 商家资料', 'oauth', 'auth_required', true, true, true),
  ('youtube_shorts', 'social', 'YouTube Shorts', 'YouTube Shorts', 'oauth', 'auth_required', true, true, false),
  ('tiktok_business', 'social', 'TikTok Business', 'TikTok Business', 'oauth', 'api_review_required', true, true, false),
  ('x_platform', 'social', 'X Platform', 'X 平台', 'oauth', 'auth_required', true, true, false),
  ('xiaohongshu_manual', 'manual', 'Xiaohongshu Manual Mode', '小红书手动模式', 'manual', 'manual_mode', false, false, false),
  ('google_ads', 'ads', 'Google Ads', 'Google 广告', 'oauth', 'auth_required', true, true, false),
  ('meta_ads', 'ads', 'Meta Ads', 'Meta 广告', 'oauth', 'auth_required', true, true, true),
  ('tiktok_ads', 'ads', 'TikTok Ads', 'TikTok 广告', 'oauth', 'api_review_required', true, true, false),
  ('x_ads', 'ads', 'X Ads', 'X 广告', 'oauth', 'auth_required', true, true, false),
  ('bing_ads', 'ads', 'Bing Ads', 'Bing 广告', 'oauth', 'auth_required', true, true, false)
on conflict (provider_key) do update set
  category = excluded.category,
  label_en = excluded.label_en,
  label_zh = excluded.label_zh,
  connection_mode = excluded.connection_mode,
  status = excluded.status,
  supports_test = excluded.supports_test,
  supports_sync = excluded.supports_sync,
  supports_webhook = excluded.supports_webhook,
  updated_at = now();

insert into public.platform_video_specs(platform_key, placement_key, label_en, label_zh, aspect_ratio, width, height, max_duration_seconds, safe_zone, output_format, publishing_mode)
values
  ('instagram', 'reels', 'Instagram Reels', 'Instagram Reels', '9:16', 1080, 1920, 90, '{"caption_safe_bottom": 340}'::jsonb, 'mp4', 'approval'),
  ('facebook', 'reels', 'Facebook Reels', 'Facebook Reels', '9:16', 1080, 1920, 90, '{"caption_safe_bottom": 340}'::jsonb, 'mp4', 'approval'),
  ('tiktok', 'organic', 'TikTok Video', 'TikTok 视频', '9:16', 1080, 1920, 180, '{"caption_safe_bottom": 360}'::jsonb, 'mp4', 'manual'),
  ('youtube', 'shorts', 'YouTube Shorts', 'YouTube Shorts', '9:16', 1080, 1920, 60, '{"caption_safe_bottom": 280}'::jsonb, 'mp4', 'approval'),
  ('x', 'video_landscape', 'X Landscape Video', 'X 横屏视频', '16:9', 1920, 1080, 140, '{}'::jsonb, 'mp4', 'approval'),
  ('x', 'video_square', 'X Square Video', 'X 方形视频', '1:1', 1080, 1080, 140, '{}'::jsonb, 'mp4', 'approval'),
  ('google_business_profile', 'post_video', 'Google Business Profile Post Video', 'Google 商家帖子视频', '1:1', 1080, 1080, 30, '{}'::jsonb, 'mp4', 'manual'),
  ('xiaohongshu', 'note_video', 'Xiaohongshu Note Video', '小红书笔记视频', '3:4', 1080, 1440, 120, '{"cover_required": true}'::jsonb, 'mp4', 'manual'),
  ('ads', 'vertical_video', 'Ads Vertical Video', '广告竖屏视频', '9:16', 1080, 1920, 60, '{"cta_safe_bottom": 320}'::jsonb, 'mp4', 'approval'),
  ('ads', 'square_video', 'Ads Square Video', '广告方形视频', '1:1', 1080, 1080, 60, '{}'::jsonb, 'mp4', 'approval')
on conflict (platform_key, placement_key) do update set
  label_en = excluded.label_en,
  label_zh = excluded.label_zh,
  aspect_ratio = excluded.aspect_ratio,
  width = excluded.width,
  height = excluded.height,
  max_duration_seconds = excluded.max_duration_seconds,
  safe_zone = excluded.safe_zone,
  output_format = excluded.output_format,
  publishing_mode = excluded.publishing_mode,
  is_active = true,
  updated_at = now();

comment on table public.integration_credentials is 'Encrypted API Credential Center records. Never return encrypted_payload or plaintext secrets to frontend.';
comment on table public.platform_video_specs is 'V28.7 database-driven platform video rules. Update rows when platform rules change instead of hardcoding component rules.';
comment on table public.v287_service_chain_stages is 'V28.7 Service & Order Operations real repair stage registry.';
comment on table public.v287_customer_chain_stages is 'V28.7 Customer Center real repair stage registry.';
