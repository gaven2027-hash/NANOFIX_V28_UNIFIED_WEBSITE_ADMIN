# NANOFIX V28 Final Deployment QA Report - 2026-05-23

## Final patch applied in this QA round
- GitHub Actions workflow changed from `actions/checkout@v6` to stable `actions/checkout@v4`.
- `tools/deploy-readiness-check.mjs` now checks the GitHub Actions workflow for `actions/checkout@v4`, `actions/setup-node@v4`, `.nvmrc`, and `npm run quality:gate`.

## Commands executed
- `npm ci` ✅
- `npm run validate:predeploy` ✅
- `npm run quality:gate` ✅
  - `sync:seo-assets` ✅ 105 URLs
  - `npm audit --omit=dev` ✅ 0 vulnerabilities
  - `tsc --noEmit` ✅
  - `eslint . --max-warnings=0` ✅
  - `verify-anchors-v28` ✅ 37 anchors in each legacy body
  - `validate-unified-package` ✅
  - `audit-v28` ✅ warning only: legacy CSP allows unsafe-inline
  - `validate:platform` ✅
  - `build:ci` ✅ 108 static pages generated
  - `verify` ✅ public routes, protected routes, APIs, sitemap and robots
  - `test:e2e:smoke` ✅
- Manual API smoke:
  - `/api/health` -> 200 ✅
  - `/api/ready` -> 503 locally because production env/Supabase secrets are intentionally not configured ✅ expected
  - `POST /api/public-repair-request {}` -> 400 validation error, no crash ✅
  - `/api/system/module-health-worker` without secret -> 401 ✅

## Remaining platform-side checks
- Configure Vercel environment variables from `.env.example`.
- Apply Supabase SQL migrations to staging/production.
- Create Supabase Auth users and profile roles.
- Confirm `/api/ready` returns 200 after real Supabase and environment variables are configured.
- Run Supabase advisors after migrations.
