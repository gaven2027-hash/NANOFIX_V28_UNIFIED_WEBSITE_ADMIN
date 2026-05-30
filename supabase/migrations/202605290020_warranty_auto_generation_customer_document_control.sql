-- NANOFIX V28.2 Phase D.2
-- Warranty years are confirmed in customer order / accepted quotation.
-- After full repair completion, warranty documents can be auto-generated from the accepted quotation snapshot.
-- Internal Admin can search customer documents by customer id / account / phone / email and revise official documents.

alter table public.quotations
  add column if not exists confirmed_warranty_years numeric(5,2),
  add column if not exists warranty_terms text,
  add column if not exists warranty_confirmed_by uuid references public.profiles(profile_id) on delete set null,
  add column if not exists warranty_confirmed_at timestamptz;

alter table public.quotation_versions
  add column if not exists warranty_years numeric(5,2),
  add column if not exists warranty_terms text;

alter table public.quotation_acceptances
  add column if not exists accepted_warranty_years numeric(5,2),
  add column if not exists accepted_warranty_terms_snapshot text;

alter table public.warranties
  add column if not exists customer_id uuid references public.customers(customer_id) on delete set null,
  add column if not exists warranty_years numeric(5,2),
  add column if not exists source_quotation_id uuid references public.quotations(quotation_id) on delete set null,
  add column if not exists source_acceptance_id uuid references public.quotation_acceptances(acceptance_id) on delete set null,
  add column if not exists source_invoice_id uuid references public.invoices(invoice_id) on delete set null,
  add column if not exists auto_generated boolean not null default false,
  add column if not exists generation_source text default 'manual' check (generation_source in ('manual','job_completion','admin_regenerated')),
  add column if not exists generated_by uuid references public.profiles(profile_id) on delete set null,
  add column if not exists generated_at timestamptz,
  add column if not exists terms_snapshot text,
  add column if not exists metadata_json jsonb not null default '{}'::jsonb;

create index if not exists quotations_warranty_years_idx on public.quotations(confirmed_warranty_years, warranty_confirmed_at desc);
create index if not exists quotation_versions_warranty_years_idx on public.quotation_versions(quotation_id, warranty_years, created_at desc);
create index if not exists quotation_acceptances_warranty_idx on public.quotation_acceptances(job_id, customer_id, accepted_warranty_years, created_at desc);
create index if not exists warranties_customer_idx on public.warranties(customer_id, created_at desc);
create index if not exists warranties_source_quote_idx on public.warranties(source_quotation_id, source_acceptance_id);
create index if not exists warranties_auto_generated_idx on public.warranties(auto_generated, generation_source, created_at desc);
