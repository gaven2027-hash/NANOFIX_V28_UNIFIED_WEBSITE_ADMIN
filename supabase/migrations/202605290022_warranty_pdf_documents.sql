-- NANOFIX V28.2 Phase D.3
-- Warranty PDF documents generated from completed warranty records and private service-uploads storage.

create table if not exists public.warranty_pdf_documents (
  warranty_pdf_id uuid primary key default gen_random_uuid(),
  warranty_id uuid not null references public.warranties(warranty_id) on delete cascade,
  job_id uuid references public.jobs(job_id) on delete set null,
  customer_id uuid references public.customers(customer_id) on delete set null,
  storage_bucket text not null default 'service-uploads',
  storage_path text not null,
  file_name text not null,
  file_size_bytes integer not null default 0,
  generation_status text not null default 'uploaded' check (generation_status in ('queued','generated','uploaded','failed')),
  visible_to_customer boolean not null default false,
  generated_by uuid references public.profiles(profile_id) on delete set null,
  generation_notes text,
  metadata_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists warranty_pdf_documents_warranty_idx on public.warranty_pdf_documents(warranty_id, created_at desc);
create index if not exists warranty_pdf_documents_customer_idx on public.warranty_pdf_documents(customer_id, visible_to_customer, created_at desc);
create index if not exists warranty_pdf_documents_job_idx on public.warranty_pdf_documents(job_id, created_at desc);

alter table public.warranties
  add column if not exists pdf_storage_path text,
  add column if not exists visible_to_customer boolean not null default false,
  add column if not exists customer_visible_at timestamptz,
  add column if not exists customer_visible_by uuid references public.profiles(profile_id) on delete set null,
  add column if not exists customer_visibility_notes text;

create index if not exists warranties_customer_visible_idx on public.warranties(customer_id, visible_to_customer, created_at desc);
