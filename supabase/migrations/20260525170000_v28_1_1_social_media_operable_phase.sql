-- NANOFIX V28.1.1 Social Media Management Operable Phase
-- Adds a generic social admin records table and social publish/version snapshots.

create table if not exists public.social_management_records (
  record_id uuid primary key default gen_random_uuid(),
  section_key text not null,
  platform text not null default 'general',
  title text not null,
  body text,
  config_json jsonb not null default '{}'::jsonb,
  status text not null default 'draft' check (status in ('draft','active','pending_review','approved','scheduled','published','archived','disabled')),
  created_by uuid,
  updated_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.social_management_records enable row level security;

create index if not exists social_management_records_section_key_idx on public.social_management_records(section_key);
create index if not exists social_management_records_platform_idx on public.social_management_records(platform);
create index if not exists social_management_records_status_idx on public.social_management_records(status);
create index if not exists social_management_records_updated_at_idx on public.social_management_records(updated_at);

create table if not exists public.social_publish_versions (
  version_id uuid primary key default gen_random_uuid(),
  content_id uuid references public.content_drafts(content_id) on delete set null,
  platform text not null default 'all',
  version_no integer not null default 1,
  status text not null default 'scheduled' check (status in ('approved','scheduled','published','cancelled','failed')),
  snapshot_json jsonb not null default '{}'::jsonb,
  scheduled_at timestamptz,
  published_at timestamptz default now(),
  published_by uuid,
  created_at timestamptz not null default now()
);

alter table public.social_publish_versions enable row level security;

alter table public.social_publish_versions add column if not exists record_id uuid references public.social_management_records(record_id) on delete set null;

create index if not exists social_publish_versions_content_id_idx on public.social_publish_versions(content_id);
create index if not exists social_publish_versions_record_id_idx on public.social_publish_versions(record_id);
create index if not exists social_publish_versions_platform_idx on public.social_publish_versions(platform);
create index if not exists social_publish_versions_status_idx on public.social_publish_versions(status);
create index if not exists social_publish_versions_created_at_idx on public.social_publish_versions(created_at);
