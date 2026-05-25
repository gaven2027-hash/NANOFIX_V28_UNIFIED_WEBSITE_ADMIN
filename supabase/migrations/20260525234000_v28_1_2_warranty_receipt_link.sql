alter table public.warranties add column if not exists receipt_id uuid;
alter table public.warranties add column if not exists payment_id uuid;
alter table public.warranties add column if not exists invoice_id uuid;
alter table public.warranties add column if not exists source_json jsonb default '{}'::jsonb;

create index if not exists warranties_receipt_id_idx on public.warranties(receipt_id);
create index if not exists warranties_payment_id_idx on public.warranties(payment_id);
create index if not exists warranties_invoice_id_idx on public.warranties(invoice_id);
create index if not exists warranties_customer_status_idx on public.warranties(customer_id, status, created_at);
