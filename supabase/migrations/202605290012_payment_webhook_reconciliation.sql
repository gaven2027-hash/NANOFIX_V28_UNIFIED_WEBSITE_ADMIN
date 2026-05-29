-- NANOFIX V28.2 Service Operations Phase C.4
-- Payment webhook idempotency and reconciliation flow.

alter table public.payment_intents
  add column if not exists provider_external_id text,
  add column if not exists last_webhook_event_id uuid;

create table if not exists public.payment_webhook_events (
  webhook_event_id uuid primary key default gen_random_uuid(),
  provider text not null,
  provider_event_id text not null,
  event_type text,
  provider_external_id text,
  payment_intent_id uuid references public.payment_intents(payment_intent_id) on delete set null,
  invoice_id uuid references public.invoices(invoice_id) on delete set null,
  payment_id uuid references public.payments(payment_id) on delete set null,
  amount numeric(12,2),
  currency text default 'SGD',
  processing_status text not null default 'received' check (processing_status in ('received','duplicate','matched','processed','ignored','failed','unmatched')),
  signature_valid boolean,
  signature_hash text,
  payload_json jsonb not null default '{}'::jsonb,
  error_message text,
  processed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (provider, provider_event_id)
);

create index if not exists payment_intents_provider_external_idx on public.payment_intents(provider, provider_external_id);
create index if not exists payment_webhook_events_provider_created_idx on public.payment_webhook_events(provider, created_at desc);
create index if not exists payment_webhook_events_status_idx on public.payment_webhook_events(processing_status, created_at desc);
create index if not exists payment_webhook_events_intent_idx on public.payment_webhook_events(payment_intent_id, created_at desc);

alter table public.payment_webhook_events enable row level security;

drop policy if exists "internal roles can read payment webhook events" on public.payment_webhook_events;
create policy "internal roles can read payment webhook events"
on public.payment_webhook_events for select
using (public.current_profile_role() in ('super_admin','operations_admin','finance','support'));

drop policy if exists "service role can write payment webhook events" on public.payment_webhook_events;
create policy "service role can write payment webhook events"
on public.payment_webhook_events for all
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');
