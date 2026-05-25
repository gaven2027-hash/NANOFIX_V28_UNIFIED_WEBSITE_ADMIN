alter table public.invoices add column if not exists quotation_id uuid;
alter table public.invoices add column if not exists source_json jsonb default '{}'::jsonb;

create index if not exists invoices_quotation_id_idx on public.invoices(quotation_id);
create index if not exists invoices_customer_status_idx on public.invoices(customer_id, status, created_at);
