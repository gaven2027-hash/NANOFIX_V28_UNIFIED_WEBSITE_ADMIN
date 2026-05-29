-- NANOFIX V28.2 Customer Portal Phase B.1
-- Bridge customer-owned service records for customer portal visibility.

alter table public.service_requests
  add column if not exists customer_id uuid references public.customers(customer_id) on delete set null;

alter table public.jobs
  add column if not exists customer_id uuid references public.customers(customer_id) on delete set null;

create index if not exists service_requests_customer_idx on public.service_requests(customer_id, created_at desc);
create index if not exists jobs_customer_idx on public.jobs(customer_id, created_at desc);
create index if not exists jobs_service_request_idx on public.jobs(service_request_id, created_at desc);
create index if not exists invoices_job_idx on public.invoices(job_id, created_at desc);
create index if not exists warranties_job_idx on public.warranties(job_id, created_at desc);
