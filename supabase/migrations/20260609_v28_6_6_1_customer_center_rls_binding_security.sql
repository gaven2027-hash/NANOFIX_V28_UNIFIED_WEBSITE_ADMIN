-- V28.6.6.1 Customer Center RLS + Binding Security Repair
-- Scope:
-- - Enable RLS on customer_account_claims and customer_record_links.
-- - Add customer own-record read policies.
-- - Keep direct anonymous access denied.
-- - Preserve Admin API writes through server-side Supabase service role.
-- - Do not grant fake public access.
-- - Do not disable RLS.

alter table public.customer_account_claims enable row level security;
alter table public.customer_record_links enable row level security;

create index if not exists idx_customer_account_claims_customer_id
  on public.customer_account_claims(customer_id);

create index if not exists idx_customer_account_claims_claimed_auth_user_id
  on public.customer_account_claims(claimed_auth_user_id);

create index if not exists idx_customer_account_claims_status
  on public.customer_account_claims(status);

create index if not exists idx_customer_record_links_customer_id
  on public.customer_record_links(customer_id);

create index if not exists idx_customer_record_links_record_table_record_id
  on public.customer_record_links(record_table, record_id);

create index if not exists idx_customer_record_links_link_status
  on public.customer_record_links(link_status);

drop policy if exists "customer_account_claims_customer_own_read" on public.customer_account_claims;
drop policy if exists "customer_record_links_customer_own_read" on public.customer_record_links;

create policy "customer_account_claims_customer_own_read"
on public.customer_account_claims
for select
to authenticated
using (
  auth.uid() is not null
  and (
    claimed_auth_user_id = auth.uid()
    or exists (
      select 1
      from public.customers c
      where c.customer_id = customer_account_claims.customer_id
        and (
          c.auth_user_id = auth.uid()
          or c.claimed_auth_user_id = auth.uid()
        )
    )
  )
);

create policy "customer_record_links_customer_own_read"
on public.customer_record_links
for select
to authenticated
using (
  auth.uid() is not null
  and exists (
    select 1
    from public.customers c
    where c.customer_id = customer_record_links.customer_id
      and (
        c.auth_user_id = auth.uid()
        or c.claimed_auth_user_id = auth.uid()
      )
  )
);

comment on policy "customer_account_claims_customer_own_read" on public.customer_account_claims
is 'V28.6.6.1: authenticated customers can read only their own account-claim rows; admin mutations must use server-side API/service role.';

comment on policy "customer_record_links_customer_own_read" on public.customer_record_links
is 'V28.6.6.1: authenticated customers can read only their own record-link rows; admin binding mutations must use server-side API/service role.';
