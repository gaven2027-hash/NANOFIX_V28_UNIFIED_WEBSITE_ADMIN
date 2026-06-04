# NANOFIX V28.4.1 Preflight Repair Report

Generated: 2026-06-04
Branch target: `v28-4-1-batch-repair`
Source package: `NANOFIX_V28_4_1_BATCH_REPAIR_SOURCE.zip`
Repair package: `NANOFIX_V28_4_1_PREFLIGHT_REPAIRED_FULL.zip`

## Executive Result

Status: **Conditional Pass for Vercel Preview** / **Not yet direct Production Deploy**.

The code package was repaired according to the NANOFIX OA/ERP deployment preflight checklist. The package is suitable for pushing to the repair branch and running Vercel Preview / GitHub CI. It should not be deployed directly to Production until the real-browser Smoke Test confirms Admin login, Dashboard, Service Operations, Customer Center, Website Management, Customer Portal, Public Repair Request, and audit/status logs.

No Supabase production database reset, drop, truncate, or blind migration repair was executed.

## Main Repairs Applied

### 1. Preflight / platform gate repair

- Added `.env.example` with placeholders only, no real secrets.
- Replaced `.npmrc` with public npm registry and strict safe settings.
- Updated `vercel.json` so Vercel build runs `npm run validate:predeploy && npm run build:ci`.
- Updated platform/readiness verifiers to match V28.4.1 operational backend expectations.

### 2. Admin level-1 / level-2 menu operational repair

- Converted Admin submodule workspace from visible static explanation blocks to operational controls.
- Level-2 menu areas now use real operation patterns: live data refresh, API probes, audit write checks, follow-up task creation, linked workspace navigation.
- Repaired old `/admin/[module]` static routes to redirect into live primary module routes.
- Hidden or removed backend-unrelated explanatory subtitles and workflow text in operational screens.

### 3. Service Operations real workflow repair

Added shared live route handlers:

- `lib/nanofix/service-operations-live-routes.ts`

Added API routes:

- `app/api/admin/service-operations/service-request-list/route.ts`
- `app/api/admin/service-operations/service-request-detail/route.ts`
- `app/api/admin/service-operations/create-job-from-request/route.ts`
- `app/api/admin/service-operations/assign-engineer/route.ts`
- `app/api/admin/service-operations/inspection-result/route.ts`
- `app/api/admin/service-operations/quotation-live/route.ts`
- `app/api/admin/service-operations/quotation-acceptance-bridge/route.ts`
- `app/api/admin/service-operations/invoice-live/route.ts`
- `app/api/admin/service-operations/payment-live/route.ts`

These routes enforce server-side actor checks via shared handlers, use explicit field selection, write audit logs, and write `status_transition_logs` for status-changing operations.

### 4. Fake/demo/fallback data cleanup

- Removed Advertising Center seeded fallback campaign/account/suggestion business data.
- Removed old `sampleAd*` / `seededFallbackAd*` data exports.
- Advertising Center now shows empty live-state messages when no real records exist.
- Removed obsolete patch tool that reintroduced seeded fallback names.
- Updated validation scripts so checks verify real API/data/audit controls instead of requiring visible static explanation text.

### 5. API / audit / role gate repairs

- Confirmed Admin APIs use server-side auth markers such as `requireActorApi`, `requireAdmin`, `requirePermission`, or shared guarded route handlers.
- Updated static scanner to treat `requirePermission` as valid server-side admin API protection.
- Added audit logging to payment reconciliation flow.
- Confirmed Public Service Request fails closed if Supabase is unavailable and does not fake success.

### 6. Validation script modernization

Updated these scripts to match the new operational backend standard:

- `tools/deploy-readiness-check.mjs`
- `tools/static-v28-2-issue-scan.mjs`
- `tools/validate-unified-package.mjs`
- `tools/audit-v28.mjs`
- `tools/verify-admin-module-reality.mjs`
- `tools/oa-erp-readiness-audit.mjs`
- `tools/verify-phase-e-core-business-oa.mjs`
- `tools/verify-phase-e-service-ops-main-chain.mjs`
- `tools/verify-phase-e-api-migration-rls-readiness.mjs`
- `tools/verify-service-operations-live-core.mjs`
- `tools/verify-ad-center.mjs`
- Multiple customer portal / quote / warranty verification scripts.

## Commands Executed

| Check | Result |
|---|---|
| `npm install --ignore-scripts --no-audit --no-fund` | PASS |
| `npm run typecheck` | PASS |
| `npm run lint` | PASS, 0 errors / 26 warnings |
| `npm audit --omit=dev --audit-level=high` | PASS, 0 vulnerabilities |
| `npm run audit:oa-erp` | PASS |
| `npm run verify:admin-reality` | PASS |
| `npm run verify:service-ops-core` | PASS |
| `npm run verify:phase-e-core-business-oa` | PASS |
| `npm run verify:phase-e-service-ops-main-chain` | PASS |
| `npm run verify:phase-e-api-migration-rls-readiness` | PASS, no blocking failures |
| `npm run validate:platform` | PASS, warning: CSP still allows `'unsafe-inline'` for legacy visual-lock HTML |
| `npm run scan:v28-2-static` | PASS |
| `npm run verify:ad-center` | PASS |
| `npm run validate:package` | PASS |
| `npm run audit:v28` | PASS, warnings only |
| `npm run validate:predeploy` | All individual subchecks were run and passed across split runs; the single full command timed out in sandbox before finishing because it is very long. |
| `npm run build:ci` | Started `next build`, but sandbox timed out during `Creating an optimized production build ...`; no code error was printed before timeout. Must be rerun locally / Vercel Preview. |

## Known Remaining Warnings

- `npm run lint` has 26 warnings and 0 errors. Existing warning types include unused vars and React hook dependency warnings.
- CSP still includes `'unsafe-inline'` because the legacy visual-lock HTML still requires it. This is marked as acceptable for current visual-lock mode, but should be removed in a future pure-component rewrite.
- Full `npm run build:ci` must be confirmed in local Windows machine, GitHub Actions, or Vercel Preview because the sandbox build timed out without reaching a pass/fail result.
- Real browser Smoke Test is still required before Production.

## Recommended Next Step

1. Replace local branch files with this repaired package.
2. Run:

```powershell
npm install --ignore-scripts --no-audit --no-fund
npm run validate:predeploy
npm run build:ci
```

3. Push only to repair branch:

```powershell
git checkout v28-4-1-batch-repair
git add .
git commit -m "V28.4.1 preflight repair admin operational modules"
git push origin v28-4-1-batch-repair
```

4. Use Vercel Preview for real-browser Smoke Test.
5. Only after Preview passes, create PR into `main`, then Production Deploy.

## Explicit No-Touch Production Rules

- Do not run `supabase db reset` on production.
- Do not run blind migration repair against production.
- Do not run drop/truncate on production tables.
- Do not re-enable `typescript.ignoreBuildErrors`.
- Do not re-enable `eslint.ignoreDuringBuilds`.
- Do not directly push to `main` before Preview and Smoke Test.
