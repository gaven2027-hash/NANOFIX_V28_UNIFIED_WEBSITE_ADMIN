# NANOFIX V28 Backend Production Fix v2 Report

## Scope
This v2 repair continues from the first Production Fix package and focuses on the high-risk production blockers identified in the re-audit.

## Completed Fixes

### 1. package-lock external compatibility
- Regenerated `package-lock.json` for the upgraded dependency tree.
- Removed internal/private registry tarball URLs.
- Confirmed no `packages.applied-caas-gateway` or `internal.api.openai` references remain.

### 2. Dependency and audit hardening
- Upgraded core app stack:
  - `next` to `^16.2.6`
  - `react` / `react-dom` to `^19.2.6`
  - `postcss` to `^8.5.15`
  - `eslint-config-next` to `^16.2.6`
  - `eslint` to `^9.39.4`
- Added `overrides.postcss = ^8.5.15` to eliminate Next internal PostCSS audit findings.
- `npm audit --omit=dev` now reports `found 0 vulnerabilities`.

### 3. Supabase new-user trigger hardening
- `handle_new_auth_user()` now always assigns new users as `customer`.
- User-supplied `raw_user_meta_data.role` is no longer trusted.
- Admin role assignment must be done by an existing Super Admin through the backend.

### 4. Protected Global Search RPC
- `search_all_records()` now checks service-role/API context or admin role before returning data.
- Direct customer/engineer calls cannot search the full database.
- Execute privileges are revoked from `public`, `anon`, and `authenticated`, then granted only to `service_role`.

### 5. Transactional status transition RPC
- Added `transition_status_tx()` as one database transaction.
- It validates actor role, locks the target record, validates allowed transition, updates the business table, writes `status_transition_logs`, and writes `audit_logs` together.
- The API route now calls this RPC instead of performing separate non-transactional update/log/audit calls.

### 6. Real data-loop APIs
- Added `/api/portal/customer`: profile → customers → service requests / quotations / invoices / payments / warranties.
- Added `/api/portal/engineer`: profile → jobs/job assignments → checklists / photos / signatures.
- Enhanced `/api/admin/backup`: queues encrypted backup jobs through `create_backup_job_tx()` and audits the request.
- Enhanced `/api/admin/ai-draft`: saves content drafts and AI logs through `create_ai_draft_tx()`; AI cannot auto-publish.
- Enhanced `/api/webhooks/social`: webhook → social_messages → unified_intake → leads → audit_logs through `ingest_social_message_tx()`.
- Enhanced `/api/webhooks/payment`: webhook_events → payments → payment_transactions → invoices → receipts → audit_logs through `reconcile_payment_webhook_tx()`.
- Enhanced public repair request flow: no-login requests always remain `binding_status = pending`; the API now also creates linked `leads` and `service_requests` for backend intake.

### 7. Portal UI data-loop visibility
- Customer Portal now includes a live data-loop component calling `/api/portal/customer`.
- Engineer Portal now includes a live data-loop component calling `/api/portal/engineer`.
- Admin Global Search was removed from portal shell to avoid admin-search leakage into customer/engineer spaces.

### 8. Vercel / GitHub compatibility
- `vercel.json` now uses `npm ci`.
- `buildCommand` is now `npm run validate:ci`.
- `validate:ci` runs lint, typecheck, build, and package validation.
- `NEXT_PRIVATE_BUILD_WORKER=1` and Next build worker limits are used to avoid Vercel/container worker stalls.

## Known Follow-Up
- Next.js 16 warns that `middleware.ts` is deprecated in favour of the newer `proxy` convention. The current build still passes and Next 16 treats it as Proxy/Middleware. A later cleanup can migrate the file name/function once the project standardises fully on Next 16.
- Supabase migrations must be run and tested in a real Supabase staging project to validate RLS and RPC execution with real JWT/service-role contexts.
- Backup worker encryption and external storage signing are queued by API/database now, but the worker implementation must be connected to the production scheduler.
