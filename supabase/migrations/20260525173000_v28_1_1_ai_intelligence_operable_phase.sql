-- NANOFIX V28.1.1 AI Intelligence Center Operable Phase
-- Adds generic AI management records and AI operation version snapshots.

create table if not exists public.ai_management_records (
  record_id uuid primary key default gen_random_uuid(),
  section_key text not null,
  category text not null default 'general',
  title text not null,
  body text,
  config_json jsonb not null default '{}'::jsonb,
  status text not null default 'draft' check (status in ('draft','active','pending_review','approved','scheduled','published','archived','disabled')),
  created_by uuid,
  updated_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.ai_management_records enable row level security;

create index if not exists ai_management_records_section_key_idx on public.ai_management_records(section_key);
create index if not exists ai_management_records_category_idx on public.ai_management_records(category);
create index if not exists ai_management_records_status_idx on public.ai_management_records(status);
create index if not exists ai_management_records_updated_at_idx on public.ai_management_records(updated_at);

create table if not exists public.ai_operation_versions (
  version_id uuid primary key default gen_random_uuid(),
  record_id uuid references public.ai_management_records(record_id) on delete set null,
  draft_id uuid references public.ai_drafts(draft_id) on delete set null,
  section_key text not null default 'general',
  version_no integer not null default 1,
  status text not null default 'approved' check (status in ('draft','approved','scheduled','published','cancelled','failed')),
  snapshot_json jsonb not null default '{}'::jsonb,
  published_by uuid,
  published_at timestamptz default now(),
  created_at timestamptz not null default now()
);

alter table public.ai_operation_versions enable row level security;

create index if not exists ai_operation_versions_record_id_idx on public.ai_operation_versions(record_id);
create index if not exists ai_operation_versions_draft_id_idx on public.ai_operation_versions(draft_id);
create index if not exists ai_operation_versions_section_key_idx on public.ai_operation_versions(section_key);
create index if not exists ai_operation_versions_status_idx on public.ai_operation_versions(status);
create index if not exists ai_operation_versions_created_at_idx on public.ai_operation_versions(created_at);
