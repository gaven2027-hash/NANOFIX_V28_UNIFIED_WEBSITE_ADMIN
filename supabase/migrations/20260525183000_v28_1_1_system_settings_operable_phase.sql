create table if not exists public.system_setting_records (
  record_id uuid primary key default gen_random_uuid(),
  section_key text not null,
  category text not null default 'general',
  title text not null,
  body text,
  config_json jsonb not null default '{}'::jsonb,
  status text not null default 'draft' check (status in ('draft','active','pending_review','approved','archived','disabled','failed','healthy','degraded')),
  is_sensitive boolean not null default false,
  created_by uuid,
  updated_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.system_setting_records enable row level security;

create index if not exists system_setting_records_section_key_idx on public.system_setting_records(section_key);
create index if not exists system_setting_records_category_idx on public.system_setting_records(category);
create index if not exists system_setting_records_status_idx on public.system_setting_records(status);
create index if not exists system_setting_records_updated_at_idx on public.system_setting_records(updated_at);

create table if not exists public.system_setting_versions (
  version_id uuid primary key default gen_random_uuid(),
  record_id uuid references public.system_setting_records(record_id) on delete set null,
  section_key text not null default 'general',
  version_no integer not null default 1,
  status text not null default 'approved' check (status in ('draft','approved','published','archived','cancelled')),
  snapshot_json jsonb not null default '{}'::jsonb,
  published_by uuid,
  published_at timestamptz default now(),
  created_at timestamptz not null default now()
);

alter table public.system_setting_versions enable row level security;

create index if not exists system_setting_versions_record_id_idx on public.system_setting_versions(record_id);
create index if not exists system_setting_versions_section_key_idx on public.system_setting_versions(section_key);
create index if not exists system_setting_versions_status_idx on public.system_setting_versions(status);
create index if not exists system_setting_versions_created_at_idx on public.system_setting_versions(created_at);
