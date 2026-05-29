-- NANOFIX V28.2 Customer Portal Phase B.3
-- Customer Portal submit repair/warranty claim bridge fields for linked customer submissions.

alter table public.unified_intake
  add column if not exists extracted_data jsonb default '{}'::jsonb,
  add column if not exists priority text,
  add column if not exists urgency_score integer,
  add column if not exists created_at timestamptz not null default now();

alter table public.leads
  add column if not exists intake_id uuid references public.unified_intake(intake_id) on delete set null,
  add column if not exists source_platform text,
  add column if not exists source_type text,
  add column if not exists source_medium text,
  add column if not exists binding_status text not null default 'pending',
  add column if not exists priority text,
  add column if not exists urgency_score integer,
  add column if not exists status text not null default 'new',
  add column if not exists ai_extracted_data jsonb default '{}'::jsonb,
  add column if not exists created_at timestamptz not null default now();

alter table public.service_requests
  add column if not exists intake_id uuid references public.unified_intake(intake_id) on delete set null,
  add column if not exists lead_id uuid references public.leads(lead_id) on delete set null,
  add column if not exists customer_id uuid references public.customers(customer_id) on delete set null,
  add column if not exists request_type text,
  add column if not exists issue_type text,
  add column if not exists source_platform text,
  add column if not exists source_type text,
  add column if not exists source_medium text,
  add column if not exists priority text,
  add column if not exists status text not null default 'pending_review',
  add column if not exists binding_status text not null default 'linked',
  add column if not exists warranty_id text,
  add column if not exists warranty_code text,
  add column if not exists created_at timestamptz not null default now();

create index if not exists unified_intake_owner_created_idx on public.unified_intake(owner_id, created_at desc);
create index if not exists leads_intake_idx on public.leads(intake_id, created_at desc);
create index if not exists service_requests_intake_idx on public.service_requests(intake_id, created_at desc);
create index if not exists service_requests_lead_idx on public.service_requests(lead_id, created_at desc);
