-- NANOFIX V28.2 Service Operations Phase C.5
-- Payment checkout session generator records. This stores generated/registered payment links without marking payment as paid.

create table if not exists public.payment_checkout_sessions (
  checkout_session_id uuid primary key default gen_random_uuid(),
  payment_intent_id uuid not null references public.payment_intents(payment_intent_id) on delete cascade,
  provider text not null default 'manual',
  provider_external_id text,
  payment_url text,
  amount numeric(12,2) not null default 0,
  currency text not null default 'SGD',
  status text not null default 'created' check (status in ('created','ready','expired','cancelled','failed','paid')),
  success_url text,
  cancel_url text,
  request_json jsonb not null default '{}'::jsonb,
  response_json jsonb not null default '{}'::jsonb,
  error_message text,
  created_by uuid references public.profiles(profile_id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (provider, provider_external_id)
);

alter table public.payment_intents
  add column if not exists checkout_session_id uuid references public.payment_checkout_sessions(checkout_session_id) on delete set null;

create index if not exists payment_checkout_sessions_intent_idx on public.payment_checkout_sessions(payment_intent_id, created_at desc);
create index if not exists payment_checkout_sessions_provider_idx on public.payment_checkout_sessions(provider, created_at desc);
create index if not exists payment_checkout_sessions_status_idx on public.payment_checkout_sessions(status, created_at desc);
create index if not exists payment_intents_checkout_session_idx on public.payment_intents(checkout_session_id);

create or replace function public.payment_checkout_sessions_touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists payment_checkout_sessions_touch_updated_at on public.payment_checkout_sessions;
create trigger payment_checkout_sessions_touch_updated_at
before update on public.payment_checkout_sessions
for each row execute function public.payment_checkout_sessions_touch_updated_at();

alter table public.payment_checkout_sessions enable row level security;

drop policy if exists "internal roles can read payment checkout sessions" on public.payment_checkout_sessions;
create policy "internal roles can read payment checkout sessions"
on public.payment_checkout_sessions for select
using (public.current_profile_role() in ('super_admin','operations_admin','finance','support'));

drop policy if exists "service role can write payment checkout sessions" on public.payment_checkout_sessions;
create policy "service role can write payment checkout sessions"
on public.payment_checkout_sessions for all
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');
