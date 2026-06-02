-- NANOFIX V28 Offline Customer / Unclaimed Customer Profile support
-- Adds low-risk fields for admin-created offline customer profiles and future customer self-claim flow.

create extension if not exists pgcrypto;

alter table if exists public.customers
  add column if not exists portal_status text not null default 'active',
  add column if not exists created_source text not null default 'unknown',
  add column if not exists claim_phone text,
  add column if not exists claim_email text,
  add column if not exists claimed_at timestamptz,
  add column if not exists claimed_auth_user_id uuid,
  add column if not exists address_text text,
  add column if not exists metadata_json jsonb not null default '{}'::jsonb;

alter table if exists public.customers
  drop constraint if exists customers_portal_status_check;

alter table if exists public.customers
  add constraint customers_portal_status_check
  check (portal_status in ('unclaimed','claim_pending','claimed','active','blocked','archived'));

alter table if exists public.customers
  drop constraint if exists customers_created_source_check;

alter table if exists public.customers
  add constraint customers_created_source_check
  check (created_source in ('unknown','admin_offline_entry','public_form','customer_register','claim_existing_account','manual_import','system_migration'));

create table if not exists public.customer_account_claims (
  customer_account_claim_id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(customer_id) on delete cascade,
  claim_method text not null check (claim_method in ('phone','email','whatsapp','admin_assisted')),
  claim_identifier text not null,
  otp_verified boolean not null default false,
  claimed_auth_user_id uuid,
  status text not null default 'pending' check (status in ('pending','otp_sent','otp_verified','approved','rejected','expired','cancelled')),
  requested_at timestamptz not null default now(),
  verified_at timestamptz,
  approved_at timestamptz,
  claimed_at timestamptz,
  reviewed_by uuid,
  source_ip text,
  user_agent text,
  metadata_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.nanofix_touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists customer_account_claims_touch_updated_at on public.customer_account_claims;
create trigger customer_account_claims_touch_updated_at
before update on public.customer_account_claims
for each row execute function public.nanofix_touch_updated_at();

create index if not exists customers_portal_status_idx on public.customers(portal_status, created_at desc);
create index if not exists customers_created_source_idx on public.customers(created_source, created_at desc);
create index if not exists customers_claim_phone_idx on public.customers(claim_phone);
create index if not exists customers_claim_email_idx on public.customers(claim_email);
create index if not exists customers_claimed_auth_user_idx on public.customers(claimed_auth_user_id);
create index if not exists customer_account_claims_customer_idx on public.customer_account_claims(customer_id, created_at desc);
create index if not exists customer_account_claims_identifier_idx on public.customer_account_claims(claim_method, claim_identifier, status);
create index if not exists customer_account_claims_auth_user_idx on public.customer_account_claims(claimed_auth_user_id);

create or replace function public.nanofix_is_internal_actor()
returns boolean
language sql
stable
as $$
  select coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') in ('super_admin','admin','operations_admin','operations','finance','marketing_admin','content_admin','support','service_admin')
    or coalesce(auth.jwt() -> 'user_metadata' ->> 'role', '') in ('super_admin','admin','operations_admin','operations','finance','marketing_admin','content_admin','support','service_admin')
    or coalesce(auth.jwt() -> 'user_metadata' ->> 'requested_role_group', '') in ('super_admin','admin','operations','finance','marketing_admin','content_admin','support');
$$;

alter table public.customer_account_claims enable row level security;

drop policy if exists customer_account_claims_internal_all on public.customer_account_claims;
create policy customer_account_claims_internal_all
on public.customer_account_claims
for all to authenticated
using (public.nanofix_is_internal_actor())
with check (public.nanofix_is_internal_actor());

drop policy if exists customer_account_claims_customer_read_own on public.customer_account_claims;
create policy customer_account_claims_customer_read_own
on public.customer_account_claims
for select to authenticated
using (claimed_auth_user_id = auth.uid());

comment on column public.customers.portal_status is 'Customer portal account status: unclaimed, claim_pending, claimed/active, blocked or archived.';
comment on column public.customers.created_source is 'How this customer profile was created, e.g. admin_offline_entry, public_form or customer_register.';
comment on column public.customers.claim_phone is 'Phone number used for future account claim matching.';
comment on column public.customers.claim_email is 'Email used for future account claim matching.';
comment on column public.customers.claimed_auth_user_id is 'Supabase Auth user id after customer self-claims this offline/unclaimed profile.';
comment on table public.customer_account_claims is 'Records customer requests to claim existing offline/unclaimed customer profiles by phone, email or admin-assisted verification.';
