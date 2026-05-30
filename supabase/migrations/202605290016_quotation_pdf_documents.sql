-- NANOFIX V28.2 Service Operations Phase C.8
-- Quotation PDF generation and storage linkage records.

create table if not exists public.quotation_pdf_documents (
  quotation_pdf_id uuid primary key default gen_random_uuid(),
  quotation_id uuid not null references public.quotations(quotation_id) on delete cascade,
  job_id uuid references public.jobs(job_id) on delete set null,
  customer_id uuid references public.customers(customer_id) on delete set null,
  quotation_version integer,
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
  unique (quotation_id, storage_path)
);

create index if not exists quotation_pdf_documents_quotation_idx on public.quotation_pdf_documents(quotation_id, created_at desc);
create index if not exists quotation_pdf_documents_customer_idx on public.quotation_pdf_documents(customer_id, created_at desc);
create index if not exists quotation_pdf_documents_visible_idx on public.quotation_pdf_documents(visible_to_customer, created_at desc);

alter table public.quotation_pdf_documents enable row level security;

drop policy if exists "internal roles can read quotation pdf documents" on public.quotation_pdf_documents;
create policy "internal roles can read quotation pdf documents"
on public.quotation_pdf_documents for select
using (public.current_profile_role() in ('super_admin','operations_admin','finance','support'));

drop policy if exists "customers can read own visible quotation pdf documents" on public.quotation_pdf_documents;
create policy "customers can read own visible quotation pdf documents"
on public.quotation_pdf_documents for select
using (visible_to_customer = true and public.owns_customer(customer_id));

drop policy if exists "service role can write quotation pdf documents" on public.quotation_pdf_documents;
create policy "service role can write quotation pdf documents"
on public.quotation_pdf_documents for all
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');
