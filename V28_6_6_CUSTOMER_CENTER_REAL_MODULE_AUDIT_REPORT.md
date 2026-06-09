# V28.6.6 Customer Center Real Module Audit Report

Generated: 2026-06-09T07:30:52.648Z

OK: false

## Summary

- Required files checked: 13
- API files checked: 5
- Findings total: 2
- P0 findings: 2
- P1 findings: 0

## Live Supabase Confirmation

- `customer_account_claims`: RLS disabled in live Supabase.
- `customer_record_links`: RLS disabled in live Supabase.
- `pg_policies`: no policies found for both tables.

## Findings

- **P0 / live_supabase_rls** customer_account_claims: Live Supabase check confirms RLS is disabled on public.customer_account_claims. pg_policies returned no policies.
- **P0 / live_supabase_rls** customer_record_links: Live Supabase check confirms RLS is disabled on public.customer_record_links. pg_policies returned no policies.

## Best Repair Direction

Open a focused repair branch v28-6-6-1-customer-center-rls-binding-security-repair. Best repair path: enable RLS for customer_account_claims and customer_record_links, add deny-by-default ownership/admin policies, preserve service-role admin API writes, add verifier evidence, then run validate/build/preview smoke.
