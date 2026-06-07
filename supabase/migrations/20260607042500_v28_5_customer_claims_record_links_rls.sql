-- V28.5 staged security migration for Customer Account Claiming / Customer Record Linking.
-- This migration is intentionally committed to the PR branch first.
-- Do not run directly on production until reviewed against Customer Center and Customer Portal flows.
-- Reason: Supabase advisor reports RLS disabled on these public-schema tables.

alter table public.customer_account_claims enable row level security;
alter table public.customer_record_links enable row level security;

-- Admin / operations / support users may manage customer account claims.
drop policy if exists customer_account_claims_admin_all on public.customer_account_claims;
create policy customer_account_claims_admin_all
on public.customer_account_claims
for all
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.auth_user_id = auth.uid()
      and p.is_active = true
      and p.role = any (array['super_admin'::text, 'operations_admin'::text, 'support'::text])
  )
)
with check (
  exists (
    select 1
    from public.profiles p
    where p.auth_user_id = auth.uid()
      and p.is_active = true
      and p.role = any (array['super_admin'::text, 'operations_admin'::text, 'support'::text])
  )
);

-- Customers may read only their own account claim records.
drop policy if exists customer_account_claims_customer_select_own on public.customer_account_claims;
create policy customer_account_claims_customer_select_own
on public.customer_account_claims
for select
to authenticated
using (
  exists (
    select 1
    from public.customers c
    where c.customer_id = customer_account_claims.customer_id
      and c.auth_user_id = auth.uid()
  )
);

-- Admin / operations / support users may manage customer record links.
drop policy if exists customer_record_links_admin_all on public.customer_record_links;
create policy customer_record_links_admin_all
on public.customer_record_links
for all
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.auth_user_id = auth.uid()
      and p.is_active = true
      and p.role = any (array['super_admin'::text, 'operations_admin'::text, 'support'::text])
  )
)
with check (
  exists (
    select 1
    from public.profiles p
    where p.auth_user_id = auth.uid()
      and p.is_active = true
      and p.role = any (array['super_admin'::text, 'operations_admin'::text, 'support'::text])
  )
);

-- Customers may read only linked records that belong to their own customer profile.
drop policy if exists customer_record_links_customer_select_own_linked on public.customer_record_links;
create policy customer_record_links_customer_select_own_linked
on public.customer_record_links
for select
to authenticated
using (
  link_status = 'linked'
  and exists (
    select 1
    from public.customers c
    where c.customer_id = customer_record_links.customer_id
      and c.auth_user_id = auth.uid()
  )
);
