-- NANOFIX V28.1.1 Customer Center Operable Phase
-- Adds customer center policy records and version snapshots.

create table if not exists public.customer_center_records (
  record_id uuid primary key default gen_random_uuid(),
  section_key text not null,
  category text not null default 'general',
  customer_id uuid references public.customers(customer_id) on delete set null,
  title text not null,
  body text,
  config_json jsonb not null default '{}'::jsonb,
  status text not null default 'draft' check (status in ('draft','active','pending_review','approved','archived','disabled','blacklisted','frozen')),
  created_by uuid,
  updated_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.customer_center_records enable row level security;

create index if not exists customer_center_records_section_key_idx on public.customer_center_records(section_key);
create index if not exists customer_center_records_category_idx on public.customer_center_records(category);
create index if not exists customer_center_records_customer_id_idx on public.customer_center_records(customer_id);
create index if not exists customer_center_records_status_idx on public.customer_center_records(status);
create index if not exists customer_center_records_updated_at_idx on public.customer_center_records(updated_at);

create table if not exists public.customer_center_versions (
  version_id uuid primary key default gen_random_uuid(),
  record_id uuid references public.customer_center_records(record_id) on delete set null,
  customer_id uuid references public.customers(customer_id) on delete set null,
  section_key text not null default 'general',
  version_no integer not null default 1,
  status text not null default 'approved' check (status in ('draft','approved','published','archived','cancelled')),
  snapshot_json jsonb not null default '{}'::jsonb,
  published_by uuid,
  published_at timestamptz default now(),
  created_at timestamptz not null default now()
);

alter table public.customer_center_versions enable row level security;

create index if not exists customer_center_versions_record_id_idx on public.customer_center_versions(record_id);
create index if not exists customer_center_versions_customer_id_idx on public.customer_center_versions(customer_id);
create index if not exists customer_center_versions_section_key_idx on public.customer_center_versions(section_key);
create index if not exists customer_center_versions_status_idx on public.customer_center_versions(status);
create index if not exists customer_center_versions_created_at_idx on public.customer_center_versions(created_at);
