-- NANOFIX V28.2 Customer Portal Phase B.5
-- Customer-facing quotation, invoice and payment visibility/link fields.

alter table public.quotations
  add column if not exists visible_to_customer boolean not null default false,
  add column if not exists customer_visible_at timestamptz,
  add column if not exists customer_visible_by uuid references public.profiles(profile_id) on delete set null,
  add column if not exists customer_visibility_notes text,
  add column if not exists pdf_storage_path text,
  add column if not exists public_ref text;

alter table public.invoices
  add column if not exists visible_to_customer boolean not null default false,
  add column if not exists customer_visible_at timestamptz,
  add column if not exists customer_visible_by uuid references public.profiles(profile_id) on delete set null,
  add column if not exists customer_visibility_notes text,
  add column if not exists pdf_storage_path text,
  add column if not exists payment_url text,
  add column if not exists public_ref text;

alter table public.payments
  add column if not exists payment_url text,
  add column if not exists visible_to_customer boolean not null default true;

create index if not exists quotations_customer_visible_idx on public.quotations(visible_to_customer, approval_status, job_id, created_at desc);
create index if not exists invoices_customer_visible_idx on public.invoices(visible_to_customer, status, job_id, created_at desc);
create index if not exists payments_customer_visible_idx on public.payments(visible_to_customer, status, invoice_id, created_at desc);
