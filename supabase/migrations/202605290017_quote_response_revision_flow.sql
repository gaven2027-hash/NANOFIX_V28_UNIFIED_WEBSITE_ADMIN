-- NANOFIX V28.2 Service Operations Phase C.9
-- Customer quote response, revision request and accepted snapshot locking.
-- Customers can view / accept / decline / request revision with message.
-- Customers cannot edit quotation or invoice content.
-- Admin / Finance can review response, create a new quotation version, generate a new PDF and push it again.

alter table public.quotation_acceptances
  add column if not exists quotation_pdf_id uuid references public.quotation_pdf_documents(quotation_pdf_id) on delete set null,
  add column if not exists accepted_pdf_storage_path text,
  add column if not exists customer_message text;

create table if not exists public.quotation_customer_responses (
  response_id uuid primary key default gen_random_uuid(),
  quotation_id uuid not null references public.quotations(quotation_id) on delete cascade,
  quotation_version integer,
  quotation_pdf_id uuid references public.quotation_pdf_documents(quotation_pdf_id) on delete set null,
  customer_id uuid references public.customers(customer_id) on delete set null,
  responded_by_profile_id uuid references public.profiles(profile_id) on delete set null,
  response_type text not null check (response_type in ('accepted','declined','revision_requested')),
  response_status text not null default 'submitted' check (response_status in ('submitted','reviewed','resolved','superseded')),
  quoted_total numeric(12,2) not null default 0,
  quoted_pdf_storage_path text,
  customer_message text,
  internal_review_notes text,
  reviewed_by uuid references public.profiles(profile_id) on delete set null,
  reviewed_at timestamptz,
  superseded_by_response_id uuid references public.quotation_customer_responses(response_id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists quotation_customer_responses_quotation_idx on public.quotation_customer_responses(quotation_id, created_at desc);
create index if not exists quotation_customer_responses_customer_idx on public.quotation_customer_responses(customer_id, created_at desc);
create index if not exists quotation_customer_responses_type_idx on public.quotation_customer_responses(response_type, response_status, created_at desc);
create index if not exists quotation_acceptances_pdf_idx on public.quotation_acceptances(quotation_pdf_id, created_at desc);

alter table public.quotation_customer_responses enable row level security;

drop policy if exists "internal roles can read quotation customer responses" on public.quotation_customer_responses;
create policy "internal roles can read quotation customer responses"
on public.quotation_customer_responses for select
using (public.current_profile_role() in ('super_admin','operations_admin','finance','support'));

drop policy if exists "customers can read own quotation customer responses" on public.quotation_customer_responses;
create policy "customers can read own quotation customer responses"
on public.quotation_customer_responses for select
using (public.owns_customer(customer_id));

drop policy if exists "service role can write quotation customer responses" on public.quotation_customer_responses;
create policy "service role can write quotation customer responses"
on public.quotation_customer_responses for all
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');
