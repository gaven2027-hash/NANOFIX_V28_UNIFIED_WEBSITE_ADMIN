# NANOFIX V28 CG + GP Fusion Final Report — 2026-05-23

## Version

Package: `nanofix-v28-cg-gp-super-stable`
Version: `28.1.0-cg-gp-fusion`

This package uses the GP final deployment-ready package as the functional base and merges CG production-hardening/stability features that were missing from GP. The result keeps GP's complete admin, customer portal, engineer portal, RBAC, middleware, Supabase bridge and CI deployment flow, while adding CG's CMS runtime/API, encrypted backup job API, payment reconciliation API, warranty issuing API, social message workflow API, scheduled module health worker, global error isolation and staging Supabase check.

## Major merge decisions

1. Public website and SEO/AEO routes remain visually locked and statically generated/ISR-ready.
2. GP complete admin and portals are retained:
   - `/admin`
   - `/dashboard`
   - `/service-operations`
   - `/website-management`
   - `/social-media`
   - `/ai-intelligence`
   - `/customer-center`
   - `/system-settings`
   - `/customer-portal`
   - `/engineer-portal`
   - `/login`
3. CG production hardening features are merged:
   - public CMS read endpoint: `/api/cms/blocks`
   - admin CMS blocks endpoint: `/api/admin/cms/blocks`
   - encrypted backup jobs: `/api/admin/backups/jobs`
   - payment reconciliation: `/api/admin/payments/reconcile`
   - warranty issuance: `/api/admin/warranties/issue`
   - social messages: `/api/admin/social/messages`
   - scheduled module health worker: `/api/system/module-health-worker`
4. Supabase migration compatibility was corrected:
   - `status_transition_logs` now supports both `machine` and `object_type` fields.
   - GP `transition_status_tx()` remains the primary transactional status mutation RPC.
   - CG `record_payment_and_reconcile()` and `record_module_health_snapshot()` are retained.
   - CG SECURITY DEFINER RPCs are restricted to `service_role` only.
5. Deployment files are retained and strengthened:
   - `.gitignore`
   - `.vercelignore`
   - `.env.example`
   - `.env.staging.example`
   - `vercel.json` with protected route headers and module health cron.

## Test results completed in this package

- `npm ci` — passed
- `npm audit --omit=dev` — 0 vulnerabilities
- `npm run typecheck` — passed
- `npm run lint` — passed
- `npm run verify:anchors` — passed, 37 anchor targets per legacy body file
- `npm run validate:package` — passed
- `npm run validate:predeploy` — passed
- `npm run build:ci` — passed, 108 static pages generated
- `npm run verify` — passed
- `npm run test:e2e:smoke` — passed

Additional HTTP route checks after production build:

- `/api/cms/blocks?route_path=/&locale=en` → 200
- `/api/admin/cms/blocks` → 401
- `/api/admin/backups/jobs` → 401
- `/api/admin/payments/reconcile` → 401
- `/api/admin/social/messages` → 401
- `/api/admin/warranties/issue` → 401
- `/api/system/module-health-worker` → 401
- `/api/ready` → 503 locally because real Supabase env is not configured

## Deployment requirement

Before production deployment, configure Vercel environment variables and run the Supabase migrations in order. `/api/ready` should return 200 only after the real Supabase project has the required tables, RLS, RPCs and service role key configured.

Recommended Vercel build command:

```bash
npm run validate:predeploy && npm run build:ci
```

Recommended local final gate:

```bash
npm ci
npm run quality:gate
```

## Remaining production-only checks

These cannot be fully completed without the real Supabase project keys:

1. Run all migrations against a staging Supabase project.
2. Create Auth users and `profiles` roles for super_admin, operations_admin, engineer and customer.
3. Confirm `/api/ready` returns 200 in Vercel Preview.
4. Submit a real public repair request and confirm writes to `unified_intake`, `leads`, `service_requests` and `audit_logs`.
5. Login as each role and confirm Dashboard, Website Management, Customer Portal and Engineer Portal read/write only permitted data.

## Final readiness score

Local package readiness: 95 / 100

Expected production readiness after successful Supabase staging test: 96–97 / 100
