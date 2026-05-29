-- NANOFIX V28.2 Service Operations Phase C.2
-- Customer quotation acceptance and payment intent preparation flow.

create table if not exists public.quotation_acceptances (
  acceptance_id uuid primary key default gen_random_uuid(),
  quotation_id uuid not null references public.quotations(quotation_id) on delete cascade,
  job_id uuid references public.jobs(job_id) on delete set null,
  customer_id uuid references public.customers(customer_id) on delete set null,
  accepted_by_profile_id uuid references public.profiles(profile_id) on delete set null,
  acceptance_status text not null default 'accepted' check (acceptance_status in ('accepted','cancelled','superseded')),
  accepted_total numeric(12,2) not null default 0,
  accepted_version integer,
  customer_note text,
  ip_address inet,
  user_agent text,
  created_at timestamptz not null default now(),
  unique (quotation_id, customer_id, acceptance_status)
);

create table if not exists public.payment_intents (
  payment_intent_id uuid primary key default gen_random_uuid(),
  quotation_id uuid references public.quotations(quotation_id) on delete set null,
  acceptance_id uuid references public.quotation_acceptances(acceptance_id) on delete set null,
  invoice_id uuid references public.invoices(invoice_id) on delete set null,
  job_id uuid references public.jobs(job_id) on delete set null,
  customer_id uuid references public.customers(customer_id) on delete set null,
  amount numeric(12,2) not null default 0,
  currency text not null default 'SGD',
  status text not null default 'pending_invoice' check (status in ('pending_invoice','pending_payment_link','ready','paid','cancelled','failed')),
  provider text,
  payment_url text,
  expires_at timestamptz,
  metadata_json jsonb default '{}'::jsonb,
  created_by uuid references public.profiles(profile_id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.invoices
  add column if not exists quotation_id uuid references public.quotations(quotation_id) on delete set null,
  add column if not exists payment_intent_id uuid references public.payment_intents(payment_intent_id) on delete set null;

create index if not exists quotation_acceptances_quotation_idx on public.quotation_acceptances(quotation_id, created_at desc);
create index if not exists quotation_acceptances_customer_idx on public.quotation_acceptances(customer_id, created_at desc);
create index if not exists payment_intents_quotation_idx on public.payment_intents(quotation_id, created_at desc);
create index if not exists payment_intents_customer_idx on public.payment_intents(customer_id, created_at desc);
create index if not exists payment_intents_invoice_idx on public.payment_intents(invoice_id, created_at desc);

alter table public.quotation_acceptances enable row level security;
alter table public.payment_intents enable row level security;

drop policy if exists "internal roles can read quotation acceptances" on public.quotation_acceptances;
create policy "internal roles can read quotation acceptances"
on public.quotation_acceptances for select
using (public.current_profile_role() in ('super_admin','operations_admin','finance','support'));

drop policy if exists "customers can read own quotation acceptances" on public.quotation_acceptances;
create policy "customers can read own quotation acceptances"
on public.quotation_acceptances for select
using (public.owns_customer(customer_id));

drop policy if exists "service role can write quotation acceptances" on public.quotation_acceptances;
create policy "service role can write quotation acceptances"
on public.quotation_acceptances for all
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');

drop policy if exists "internal roles can read payment intents" on public.payment_intents;
create policy "internal roles can read payment intents"
on public.payment_intents for select
using (public.current_profile_role() in ('super_admin','operations_admin','finance','support'));

drop policy if exists "customers can read own payment intents" on public.payment_intents;
create policy "customers can read own payment intents"
on public.payment_intents for select
using (public.owns_customer(customer_id));

drop policy if exists "service role can write payment intents" on public.payment_intents;
create policy "service role can write payment intents"
on public.payment_intents for all
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');
