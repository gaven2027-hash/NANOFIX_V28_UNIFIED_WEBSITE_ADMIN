-- NANOFIX Website V28 hardening additions
-- Keeps the existing UI unchanged while strengthening OTP, forms, webhook idempotency and auditability.

create extension if not exists "pgcrypto";

create table if not exists public.otp_verifications (
  otp_id uuid primary key default gen_random_uuid(),
  email text,
  phone text,
  channel text not null default 'whatsapp' check (channel in ('email','sms','whatsapp')),
  verification_token text unique not null,
  status text not null default 'pending' check (status in ('pending','verified','expired','locked')),
  attempts int not null default 0,
  expires_at timestamptz not null,
  verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_otp_verifications_contact on public.otp_verifications(email, phone, status, expires_at);
create index if not exists idx_otp_verifications_token on public.otp_verifications(verification_token, status, expires_at);

alter table public.otp_verifications enable row level security;

do $$
begin
  if exists (
    select 1 from information_schema.tables
    where table_schema='public' and table_name='integration_outbox'
  ) then
    alter table public.integration_outbox
      drop constraint if exists integration_outbox_status_check;
    alter table public.integration_outbox
      add constraint integration_outbox_status_check
      check (status in ('queued','sent','failed','dead_letter'));
  end if;
end $$;

comment on table public.otp_verifications is 'Server-side OTP verification records. Customer registration must verify against this table or Supabase Auth, never a client-provided boolean.';
