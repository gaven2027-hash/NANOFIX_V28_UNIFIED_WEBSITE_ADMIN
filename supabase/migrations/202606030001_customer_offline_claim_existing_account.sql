-- NANOFIX V28.2 Customer Center: Offline Customer / Unclaimed Profile / Claim Existing Account
-- Purpose: allow internal admins to create offline unclaimed profiles, allow customers to request claim review, and keep the full flow auditable.

alter table public.customers
  add column if not exists portal_status text not null default 'unclaimed' check (portal_status in ('unclaimed','claim_pending','claimed','active','blocked','archived')),
  add column if not exists created_source text not null default 'public_or_admin',
  add column if not exists claim_phone text,
  add column if not exists claim_email text,
  add column if not exists claimed_auth_user_id uuid,
  add column if not exists metadata_json jsonb not null default '{}'::jsonb;

create index if not exists customers_portal_status_created_idx on public.customers(portal_status, created_at desc);
create index if not exists customers_claim_phone_idx on public.customers(claim_phone) where claim_phone is not null;
create index if not exists customers_claim_email_idx on public.customers(claim_email) where claim_email is not null;
create index if not exists customers_claimed_auth_user_idx on public.customers(claimed_auth_user_id) where claimed_auth_user_id is not null;

create table if not exists public.customer_account_claims (
  customer_account_claim_id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(customer_id) on delete cascade,
  claim_method text not null check (claim_method in ('phone','email')),
  claim_identifier text not null,
  status text not null default 'pending' check (status in ('pending','verified','approved','rejected','expired')),
  otp_verified boolean not null default false,
  claimed_auth_user_id uuid,
  reviewed_by uuid,
  reviewed_at timestamptz,
  rejection_reason text,
  source_ip text,
  user_agent text,
  metadata_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.customer_account_claims
  add column if not exists otp_verified boolean not null default false,
  add column if not exists claimed_auth_user_id uuid,
  add column if not exists reviewed_by uuid,
  add column if not exists reviewed_at timestamptz,
  add column if not exists rejection_reason text,
  add column if not exists source_ip text,
  add column if not exists user_agent text,
  add column if not exists metadata_json jsonb not null default '{}'::jsonb,
  add column if not exists updated_at timestamptz not null default now();

create index if not exists customer_account_claims_customer_status_idx on public.customer_account_claims(customer_id, status, created_at desc);
create index if not exists customer_account_claims_identifier_idx on public.customer_account_claims(claim_method, claim_identifier, status, created_at desc);
create index if not exists customer_account_claims_reviewer_idx on public.customer_account_claims(reviewed_by, reviewed_at desc) where reviewed_by is not null;

create table if not exists public.customer_record_links (
  customer_record_link_id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(customer_id) on delete cascade,
  record_table text not null,
  record_id uuid not null,
  link_status text not null default 'linked' check (link_status in ('pending','manual_review','linked','unlinked','rejected')),
  linked_by uuid,
  linked_at timestamptz,
  metadata_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists customer_record_links_unique_record_idx on public.customer_record_links(record_table, record_id, customer_id);
create index if not exists customer_record_links_customer_idx on public.customer_record_links(customer_id, link_status, created_at desc);

alter table public.service_requests
  add column if not exists request_origin text not null default 'public_website',
  add column if not exists portal_customer_notes text,
  add column if not exists portal_attachment_urls jsonb not null default '[]'::jsonb;

create index if not exists service_requests_customer_binding_idx on public.service_requests(customer_id, binding_status, created_at desc);
