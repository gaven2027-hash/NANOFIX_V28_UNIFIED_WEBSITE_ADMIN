# NANOFIX V28 Deployment Status - 2026-05-23

## Completed by ChatGPT

- Local dependency installation: PASSED (`npm ci`, 0 vulnerabilities)
- TypeScript check: PASSED (`npm run typecheck`)
- ESLint: PASSED (`npm run lint`)
- Anchor verification: PASSED (`npm run verify:anchors`)
- Unified package validation: PASSED (`npm run validate:package`)
- V28 audit: PASSED (`npm run audit:v28`)
- Next.js production build: PASSED (`npm run build:standard`)
- E2E smoke test: PASSED (`npm run test:e2e:smoke`)
- GitHub repository bootstrap: CREATED (`gaven2027-hash/NANOFIX_V28_UNIFIED_WEBSITE_ADMIN`)
- Supabase project: CREATED

## Supabase Project

- Project name: `nanofix-v28-unified`
- Project ref: `qjwcjttdyzsgexswbygt`
- Region: `ap-southeast-1`
- Project URL: `https://qjwcjttdyzsgexswbygt.supabase.co`
- Publishable key: use the Supabase dashboard key shown for this project.

## Database Migration Status

The migration SQL files are included in `supabase/migrations/` and must be applied in this order:

1. `20260521_central_admin_backend.sql`
2. `20260521_v28_security_seo_hardening.sql`
3. `20260522_v28_enhancements.sql`
4. `20260522_v28_status_transition_logs.sql`
5. `20260523_0000_unified_website_admin_schema_bridge.sql`
6. `20260523_v28_production_hardening.sql`

Automatic SQL migration application was blocked by the platform safety layer, so use Supabase SQL Editor or Supabase CLI to apply the above files.

## Vercel Deployment Status

The Vercel connector did not expose an active team/project for direct deployment. Use either:

1. GitHub integration: push this project to GitHub and import it in Vercel; or
2. Vercel CLI from project root: `vercel deploy --prod`.

## Required Vercel Environment Variables

Use `.env.example` as the complete source of truth. Minimum production variables:

```env
NEXT_PUBLIC_SITE_URL=https://www.nanofixsg.com
NEXT_PUBLIC_SUPABASE_URL=https://qjwcjttdyzsgexswbygt.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<SUPABASE_ANON_OR_PUBLISHABLE_KEY>
SUPABASE_URL=https://qjwcjttdyzsgexswbygt.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<SUPABASE_SERVICE_ROLE_KEY_FROM_DASHBOARD>
NANOFIX_ADMIN_TOKEN_FALLBACK_ENABLED=false
NANOFIX_ADMIN_PUBLIC_PREVIEW=false
NANOFIX_ALLOW_TEST_ADMIN_HEADERS=false
NANOFIX_ALLOW_FORM_WITHOUT_SUPABASE=false
NANOFIX_WEBHOOK_SECRET=<LONG_RANDOM_SECRET>
PAYMENT_WEBHOOK_SECRET=<LONG_RANDOM_SECRET>
SOCIAL_WEBHOOK_SECRET=<LONG_RANDOM_SECRET>
NANOFIX_BACKUP_ENCRYPTION_KEY=<32+ CHARACTER_RANDOM_SECRET>
CRON_SECRET=<LONG_RANDOM_SECRET>
NANOFIX_SYSTEM_WORKER_TOKEN=<LONG_RANDOM_SECRET>
NEXT_TELEMETRY_DISABLED=1
```

## Recommended Deployment Command

```bash
npm ci
npm run typecheck
npm run lint
npm run build:standard
npm run test:e2e:smoke
vercel deploy --prod
```
