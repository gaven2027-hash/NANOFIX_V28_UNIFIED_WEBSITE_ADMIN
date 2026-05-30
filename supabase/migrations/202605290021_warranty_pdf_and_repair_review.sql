-- NANOFIX V28.2 Phase D.3
-- Warranty PDF documents and warranty repair active/expired review.

create table if not exists public.warranty_pdf_documents (
  warranty_pdf_id uuid primary key default gen_random_uuid(),
  warranty_id uuid not null references public.warranties(warranty_id) on delete cascade,
  job_id uuid references public.jobs(job_id) on delete set null,
  customer_id uuid references public.customers(customer_id) on delete set null,
  quotation_id uuid references public.quotations(quotation_id) on delete set null,
  invoice_id uuid references public.invoices(invoice_id) on delete set null,
  storage_bucket text not null default 'service-uploads',
  storage_path text not null,
  file_name text not null,
  file_size_bytes integer,
  generation_status text not null default 'generated' check (generation_status in ('generated','uploaded','failed','superseded')),
  visible_to_customer boolean not null default false,
  generated_by uuid references public.profiles(profile_id) on delete set null,
  generation_notes text,
  metadata_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (warranty_id, storage_path)
);

create index if not exists warranty_pdf_documents_warranty_idx on public.warranty_pdf_documents(warranty_id, created_at desc);
create index if not exists warranty_pdf_documents_customer_idx on public.warranty_pdf_documents(customer_id, created_at desc);
create index if not exists warranty_pdf_documents_visible_idx on public.warranty_pdf_documents(visible_to_customer, created_at desc);

alter table public.service_requests
  add column if not exists warranty_review_status text check (warranty_review_status in ('not_applicable','active_warranty','expired_warranty','manual_review_required')),
  add column if not exists warranty_charge_recommendation text check (warranty_charge_recommendation in ('free_repair','chargeable','manual_review')),
  add column if not exists warranty_review_notes text;

create index if not exists service_requests_warranty_review_idx on public.service_requests(warranty_review_status, warranty_charge_recommendation, created_at desc);

alter table public.warranty_pdf_documents enable row level security;

drop policy if exists "internal roles can read warranty pdf documents" on public.warranty_pdf_documents;
create policy "internal roles can read warranty pdf documents"
on public.warranty_pdf_documents for select
using (public.current_profile_role() in ('super_admin','operations_admin','finance','support'));

drop policy if exists "customers can read own visible warranty pdf documents" on public.warranty_pdf_documents;
create policy "customers can read own visible warranty pdf documents"
on public.warranty_pdf_documents for select
using (visible_to_customer = true and public.owns_customer(customer_id));

drop policy if exists "service role can write warranty pdf documents" on public.warranty_pdf_documents;
create policy "service role can write warranty pdf documents"
on public.warranty_pdf_documents for all
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');
