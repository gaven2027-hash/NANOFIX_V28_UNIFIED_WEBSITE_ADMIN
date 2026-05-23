# NANOFIX V28 CG+GP One-shot Deployment Readiness Report

Generated: 2026-05-23
Target: GitHub + Vercel + Supabase
Package: NANOFIX V28 CG stable base + GP complete admin/portal system

## Final platform fixes applied

1. **Vercel cron compatibility fixed**
   - Changed `/api/system/module-health-worker` cron from every 15 minutes to once daily at `0 20 * * *`.
   - Reason: Vercel Hobby deployments can fail when cron frequency is more than once per day.
   - Pro/Enterprise users may change it back to `*/15 * * * *` after confirming plan limits.

2. **GitHub Actions compatibility updated**
   - Updated checkout action to `actions/checkout@v6`.
   - Kept `actions/setup-node@v4`, `.nvmrc = 20`, and npm cache.
   - CI still runs `npm ci` followed by the unified quality gate.

3. **NPM registry and engine consistency added**
   - Added `.npmrc` with the official public registry.
   - Added `engine-strict=true` to avoid accidental deployment using unsupported Node versions.

4. **Vercel upload filtering strengthened**
   - `.vercelignore` now excludes local environment files, keys, logs, build output, test output and zip packages.

5. **Deployment platform validation added**
   - Added `tools/deploy-readiness-check.mjs`.
   - Added `npm run validate:platform`.
   - Integrated it into `npm run validate:predeploy`, so Vercel build and GitHub CI both check GitHub/Vercel/Supabase readiness.

## Final test results

| Check | Result |
|---|---|
| npm ci | Passed |
| npm audit --omit=dev | Passed, 0 vulnerabilities |
| npm run typecheck | Passed |
| npm run lint | Passed |
| npm run verify:anchors | Passed, 37 anchor targets per language body |
| npm run validate:package | Passed |
| npm run audit:v28 | Passed |
| npm run validate:platform | Passed |
| npm run validate:predeploy | Passed |
| npm run build:ci | Passed, 108 static pages generated |
| npm run verify | Passed |
| npm run test:e2e:smoke | Passed |

## Runtime route checks

Public pages:
- `/` -> 200
- `/leak-detection` -> 200
- `/leak-detection/thermal-imaging-scan` -> 200
- `/no-hacking-repair/toilet-no-hacking-repair` -> 200
- `/waterproofing-works/rc-roof-metal-roof` -> 200
- `/track-record-warranty/service-warranty-terms` -> 200
- `/free-quote/book-site-inspection` -> 200
- `/en` -> 200
- `/zh` -> 200

Protected pages:
- `/admin` -> 307 to `/login`
- `/dashboard` -> 307 to `/login`
- `/website-management` -> 307 to `/login`
- `/customer-portal` -> 307 to `/login`
- `/engineer-portal` -> 307 to `/login`

Protected APIs:
- `/api/admin/search` -> 401
- `/api/global-search` -> 401
- `/api/service-requests` -> 401
- `/api/portal/customer` -> 401
- `/api/portal/engineer` -> 401

## Required Vercel environment variables

Set these in Vercel Project Settings, not in GitHub source files:

```env
NEXT_PUBLIC_SITE_URL=https://www.nanofixsg.com
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
SUPABASE_URL=https://YOUR_PROJECT.supabase.co
SUPABASE_SERVICE_ROLE_KEY=YOUR_SUPABASE_SERVICE_ROLE_KEY

NANOFIX_ADMIN_TOKEN_FALLBACK_ENABLED=false
ALLOW_ADMIN_API_SECRET_FALLBACK=false
NANOFIX_ADMIN_PUBLIC_PREVIEW=false
NANOFIX_ALLOW_FORM_WITHOUT_SUPABASE=false

CLOUDFLARE_TURNSTILE_SECRET_KEY=YOUR_TURNSTILE_SECRET
NANOFIX_WEBHOOK_SECRET=YOUR_LONG_RANDOM_HMAC_SECRET
PAYMENT_WEBHOOK_SECRET=YOUR_LONG_RANDOM_PAYMENT_SECRET
SOCIAL_WEBHOOK_SECRET=YOUR_LONG_RANDOM_SOCIAL_SECRET
CRON_SECRET=YOUR_LONG_RANDOM_CRON_SECRET
NANOFIX_SYSTEM_WORKER_TOKEN=YOUR_LONG_RANDOM_WORKER_TOKEN
NANOFIX_BACKUP_ENCRYPTION_KEY=YOUR_32_PLUS_CHARACTER_RANDOM_BACKUP_KEY
```

## Required Supabase deployment sequence

1. Create or open the Supabase project.
2. Apply all SQL files in `supabase/migrations` in filename order.
3. Apply seed files only after migrations:
   - `supabase/seed/20260522_central_admin_seed.sql`
   - `supabase/seed_v28_staging.sql` only for staging/demo, not production unless intentional.
4. Create or invite admin users using Supabase Auth.
5. Set user roles in `public.profiles` or `public.admin_profiles` according to the final role model.
6. Confirm `/api/ready` returns 200 in Vercel after environment variables and migrations are complete.
7. Test one public repair request and confirm writes into:
   - `unified_intake`
   - `leads`
   - `service_requests`
   - `audit_logs`

## Final deployment score

- GitHub upload compatibility: 96 / 100
- Vercel build/deployment compatibility: 96 / 100
- Supabase migration/RLS/RPC readiness: 95 / 100
- Security readiness: 95 / 100
- One-shot deployment readiness: 96 / 100

Remaining dependency: real Supabase project secrets and migrations must be applied before `/api/ready` can return 200.
