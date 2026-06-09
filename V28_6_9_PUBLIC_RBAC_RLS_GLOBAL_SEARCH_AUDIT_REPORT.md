# V28.6.9 Public / RBAC / RLS / Global Search Audit Report

Generated: 2026-06-09T12:05:00.000Z

OK: true

## Summary

- Files checked: 9
- Findings total: 4
- P0 findings: 0
- P1 findings: 3
- P2 findings: 1

## Audit Result

No blocking P0 issue was found. This branch is ready for the focused V28.6.9 repair batch.

## Next Repair Batch

- V28.6.9.1 Supabase RPC EXECUTE / SECURITY DEFINER / search_path hardening migration
- V28.6.9.2 RLS static evidence and live policy verifier for unified_intake, leads, quotation_versions, audit_logs
- V28.6.9.3 Optional env hardening: Turnstile and ADMIN_REPAIR_REQUEST_URL readiness lift
- V28.6.9.4 Global search RPC retirement or proof-gated allowlist mode

## Findings

- **P1 / global_search_rpc** `app/api/global-search/route.ts`: Global search still calls `search_all_records` RPC when the role is allowed. Recommendation: verify production EXECUTE grants or retire the RPC in favour of explicit allowlisted fallback queries only.
- **P1 / public_turnstile** `lib/public-repair-request.ts`: Turnstile is optional and currently bypasses when `CLOUDFLARE_TURNSTILE_SECRET_KEY` is not configured. Recommendation: configure Turnstile envs to lift readiness toward 94-96.
- **P1 / rls_static_evidence** `tools/verify-supabase-production-audit.mjs`: Static RLS/policy evidence gaps remain for `unified_intake`, `leads`, `quotation_versions` or `audit_logs`. Recommendation: add explicit migration evidence and/or live policy verifier without resetting production.
- **P2 / public_rate_limit** `lib/public-repair-request.ts`: Rate limit may temporarily fall back to memory if Supabase rate-limit storage cannot be read. Recommendation: confirm `form_rate_limits` exists and include it in readiness checks before calling the public form fully hardened.
