# V28.6.9.4 Global Search RPC Retirement Report

Generated: 2026-06-10T16:20:00.000Z

OK: true

## Summary

- P0: 0
- P1: 0
- P2: 0
- Routes checked: 3
- Allowlisted tables: 11
- Field whitelists checked: 11

## Evidence

- Runtime route: `app/api/global-search/route.ts`
- Admin global-search route: `app/api/admin/global-search/route.ts`
- Admin search route: `app/api/admin/search/route.ts`
- Search engine: `explicit_table_allowlist`
- Service role server-only: true
- RPC retired: true
- Wildcard select forbidden: true
- Forgeable headers forbidden: true

## Key Repairs

- Removed runtime Supabase RPC search path from `app/api/global-search/route.ts`.
- Replaced broad RPC search with `GLOBAL_SEARCH_TABLE_ALLOWLIST`.
- Kept service-role Supabase usage server-side behind `requireAdminApi(request)`.
- Kept customer and engineer roles outside the admin global search boundary.
- Added per-table field whitelist selectors and avoided `select('*')`.
- Added normalized search input, normalized category input, role-scoped table selection and audited runtime evidence.
- Returned `searchEngine:'explicit_table_allowlist'` and `rpcRetired:true` so preview/production can prove the active path.

## Findings

- No findings.
