-- V28.5 staged security migration for Customer Account Claiming / Customer Record Linking.
-- This migration is intentionally committed to the PR branch first.
-- Do not run directly on production until reviewed against Customer Center and Customer Portal flows.
-- Reason: Supabase advisor reports RLS disabled on these public-schema tables.
--
-- Design notes:
-- 1) Server-side Next.js APIs that use service_role continue to bypass RLS as expected.
-- 2) Authenticated internal users can manage claims/links only through approved active internal roles.
-- 3) Customers can read only claim/link rows that belong to their own account through any confirmed binding path:
--    customers.auth_user_id, customers.claimed_auth_user_id, or customers.profile_id -> profiles.auth_user_id.

alter table public.customer_account_claims enable row level security;
alter table public.customer_record_links enable row level security;

-- Remove older broad internal policies before creating the narrower admin/customer policies below.
-- PostgreSQL combines permissive RLS policies with OR, so leaving these in place would bypass the staged hardening.
drop policy if exists customer_account_claims_internal_all on public.customer_account_claims;
drop policy if exists customer_record_links_internal_all on public.customer_record_links;

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
      and coalesce(p.profile_status, 'active') <> 'blocked'
      and coalesce(p.approved_role, p.role, p.requested_role) = any (
        array[
          'super_admin'::text,
          'admin'::text,
          'operations_admin'::text,
          'support_admin'::text,
          'support'::text,
          'finance_admin'::text,
          'finance'::text
        ]
      )
  )
  or exists (
    select 1
    from public.admin_profiles ap
    where ap.auth_user_id = auth.uid()
      and ap.status = 'active'
      and ap.role = any (
        array[
          'super_admin'::text,
          'admin'::text,
          'operations_admin'::text,
          'support_admin'::text,
          'support'::text,
          'finance_admin'::text,
          'finance'::text
        ]
      )
  )
)
with check (
  exists (
    select 1
    from public.profiles p
    where p.auth_user_id = auth.uid()
      and p.is_active = true
      and coalesce(p.profile_status, 'active') <> 'blocked'
      and coalesce(p.approved_role, p.role, p.requested_role) = any (
        array[
          'super_admin'::text,
          'admin'::text,
          'operations_admin'::text,
          'support_admin'::text,
          'support'::text,
          'finance_admin'::text,
          'finance'::text
        ]
      )
  )
  or exists (
    select 1
    from public.admin_profiles ap
    where ap.auth_user_id = auth.uid()
      and ap.status = 'active'
      and ap.role = any (
        array[
          'super_admin'::text,
          'admin'::text,
          'operations_admin'::text,
          'support_admin'::text,
          'support'::text,
          'finance_admin'::text,
          'finance'::text
        ]
      )
  )
);

-- Customers may read only their own account claim records.
drop policy if exists customer_account_claims_customer_select_own on public.customer_account_claims;
create policy customer_account_claims_customer_select_own
on public.customer_account_claims
for select
to authenticated
using (
  claimed_auth_user_id = auth.uid()
  or exists (
    select 1
    from public.customers c
    left join public.profiles p on p.profile_id = c.profile_id
    where c.customer_id = customer_account_claims.customer_id
      and (
        c.auth_user_id = auth.uid()
        or c.claimed_auth_user_id = auth.uid()
        or p.auth_user_id = auth.uid()
      )
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
      and coalesce(p.profile_status, 'active') <> 'blocked'
      and coalesce(p.approved_role, p.role, p.requested_role) = any (
        array[
          'super_admin'::text,
          'admin'::text,
          'operations_admin'::text,
          'support_admin'::text,
          'support'::text,
          'finance_admin'::text,
          'finance'::text
        ]
      )
  )
  or exists (
    select 1
    from public.admin_profiles ap
    where ap.auth_user_id = auth.uid()
      and ap.status = 'active'
      and ap.role = any (
        array[
          'super_admin'::text,
          'admin'::text,
          'operations_admin'::text,
          'support_admin'::text,
          'support'::text,
          'finance_admin'::text,
          'finance'::text
        ]
      )
  )
)
with check (
  exists (
    select 1
    from public.profiles p
    where p.auth_user_id = auth.uid()
      and p.is_active = true
      and coalesce(p.profile_status, 'active') <> 'blocked'
      and coalesce(p.approved_role, p.role, p.requested_role) = any (
        array[
          'super_admin'::text,
          'admin'::text,
          'operations_admin'::text,
          'support_admin'::text,
          'support'::text,
          'finance_admin'::text,
          'finance'::text
        ]
      )
  )
  or exists (
    select 1
    from public.admin_profiles ap
    where ap.auth_user_id = auth.uid()
      and ap.status = 'active'
      and ap.role = any (
        array[
          'super_admin'::text,
          'admin'::text,
          'operations_admin'::text,
          'support_admin'::text,
          'support'::text,
          'finance_admin'::text,
          'finance'::text
        ]
      )
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
    left join public.profiles p on p.profile_id = c.profile_id
    where c.customer_id = customer_record_links.customer_id
      and (
        c.auth_user_id = auth.uid()
        or c.claimed_auth_user_id = auth.uid()
        or p.auth_user_id = auth.uid()
      )
  )
);
