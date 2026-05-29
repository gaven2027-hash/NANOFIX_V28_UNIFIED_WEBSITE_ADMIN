-- NANOFIX V28.2 Service Operations Phase C.6
-- Invoice PDF generation and storage linkage records.

create table if not exists public.invoice_pdf_documents (
  invoice_pdf_id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.invoices(invoice_id) on delete cascade,
  job_id uuid references public.jobs(job_id) on delete set null,
  customer_id uuid references public.customers(customer_id) on delete set null,
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
  unique (invoice_id, storage_path)
);

create index if not exists invoice_pdf_documents_invoice_idx on public.invoice_pdf_documents(invoice_id, created_at desc);
create index if not exists invoice_pdf_documents_customer_idx on public.invoice_pdf_documents(customer_id, created_at desc);
create index if not exists invoice_pdf_documents_visible_idx on public.invoice_pdf_documents(visible_to_customer, created_at desc);

alter table public.invoice_pdf_documents enable row level security;

drop policy if exists "internal roles can read invoice pdf documents" on public.invoice_pdf_documents;
create policy "internal roles can read invoice pdf documents"
on public.invoice_pdf_documents for select
using (public.current_profile_role() in ('super_admin','operations_admin','finance','support'));

drop policy if exists "customers can read own visible invoice pdf documents" on public.invoice_pdf_documents;
create policy "customers can read own visible invoice pdf documents"
on public.invoice_pdf_documents for select
using (visible_to_customer = true and public.owns_customer(customer_id));

drop policy if exists "service role can write invoice pdf documents" on public.invoice_pdf_documents;
create policy "service role can write invoice pdf documents"
on public.invoice_pdf_documents for all
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');
