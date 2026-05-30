-- NANOFIX V28.2 Phase D.2
-- Warranty years follow the confirmed customer order / quotation / job value.
-- Warranty document is generated automatically after completed repair.
-- Admin/Finance/Operations can find customer warranties, quotations and invoices by customer ID/account/phone/email.

alter table public.quotations
  add column if not exists warranty_years numeric(5,2),
  add column if not exists warranty_terms text,
  add column if not exists warranty_confirmed_at timestamptz,
  add column if not exists warranty_confirmed_by uuid references public.profiles(profile_id) on delete set null;

alter table public.quotation_versions
  add column if not exists warranty_years numeric(5,2),
  add column if not exists warranty_terms text;

alter table public.jobs
  add column if not exists confirmed_warranty_years numeric(5,2),
  add column if not exists confirmed_warranty_terms text,
  add column if not exists repair_completed_at timestamptz,
  add column if not exists warranty_generated_at timestamptz,
  add column if not exists warranty_generated_by uuid references public.profiles(profile_id) on delete set null;

alter table public.invoices
  add column if not exists customer_id uuid references public.customers(customer_id) on delete set null,
  add column if not exists quotation_id uuid references public.quotations(quotation_id) on delete set null,
  add column if not exists visible_to_customer boolean not null default false,
  add column if not exists customer_visible_at timestamptz,
  add column if not exists customer_visible_by uuid references public.profiles(profile_id) on delete set null;

alter table public.warranties
  add column if not exists customer_id uuid references public.customers(customer_id) on delete set null,
  add column if not exists quotation_id uuid references public.quotations(quotation_id) on delete set null,
  add column if not exists invoice_id uuid references public.invoices(invoice_id) on delete set null,
  add column if not exists warranty_years numeric(5,2),
  add column if not exists warranty_no text,
  add column if not exists warranty_terms text,
  add column if not exists generated_from text not null default 'manual' check (generated_from in ('manual','repair_completion','admin_override')),
  add column if not exists visible_to_customer boolean not null default false,
  add column if not exists customer_visible_at timestamptz,
  add column if not exists customer_visible_by uuid references public.profiles(profile_id) on delete set null,
  add column if not exists pdf_storage_path text,
  add column if not exists metadata_json jsonb not null default '{}'::jsonb;

create unique index if not exists warranties_unique_job_repair_completion_idx
on public.warranties(job_id)
where generated_from = 'repair_completion';

create index if not exists quotations_warranty_years_idx on public.quotations(warranty_years, warranty_confirmed_at desc);
create index if not exists jobs_warranty_generation_idx on public.jobs(status, repair_completed_at desc, warranty_generated_at desc);
create index if not exists invoices_customer_lookup_idx on public.invoices(customer_id, created_at desc);
create index if not exists invoices_quotation_lookup_idx on public.invoices(quotation_id, created_at desc);
create index if not exists warranties_customer_lookup_idx on public.warranties(customer_id, created_at desc);
create index if not exists warranties_no_idx on public.warranties(warranty_no);

-- Backfill customer_id into warranties from jobs where possible.
update public.warranties w
set customer_id = j.customer_id
from public.jobs j
where w.job_id = j.job_id
  and w.customer_id is null
  and j.customer_id is not null;

-- Backfill customer_id into invoices from jobs where possible.
update public.invoices i
set customer_id = j.customer_id
from public.jobs j
where i.job_id = j.job_id
  and i.customer_id is null
  and j.customer_id is not null;
