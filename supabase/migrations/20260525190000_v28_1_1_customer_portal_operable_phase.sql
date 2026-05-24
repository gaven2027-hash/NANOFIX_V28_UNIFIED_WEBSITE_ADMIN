create table if not exists public.customer_portal_versions (
  version_id uuid primary key default gen_random_uuid(),
  customer_id uuid references public.customers(customer_id) on delete set null,
  section_key text not null default 'general',
  entity_type text not null default 'portal_record',
  entity_id uuid,
  version_no integer not null default 1,
  status text not null default 'approved' check (status in ('draft','approved','published','archived','cancelled')),
  snapshot_json jsonb not null default '{}'::jsonb,
  published_by uuid,
  published_at timestamptz default now(),
  created_at timestamptz not null default now()
);

alter table public.customer_portal_versions enable row level security;

create index if not exists customer_portal_versions_customer_id_idx on public.customer_portal_versions(customer_id);
create index if not exists customer_portal_versions_section_key_idx on public.customer_portal_versions(section_key);
create index if not exists customer_portal_versions_entity_idx on public.customer_portal_versions(entity_type, entity_id);
create index if not exists customer_portal_versions_status_idx on public.customer_portal_versions(status);
create index if not exists customer_portal_versions_created_at_idx on public.customer_portal_versions(created_at);
