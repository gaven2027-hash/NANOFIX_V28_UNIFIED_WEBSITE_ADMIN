# NANOFIX V28 Website + Central Admin Unified Report

## Scope

This package merges the V28 public website production package with central admin backend data and system APIs.

## Added / connected

- Central admin seed data: `data/admin_backend_seed.json`
- Supabase seed SQL: `supabase/seed/20260522_central_admin_seed.sql`
- Admin APIs:
  - `/api/admin/global-search`
  - `/api/admin/entity-events`
  - `/api/admin/module-health`
  - `/api/admin/customer-binding-suggestions`
  - `/api/admin/backup-schedules`
- System APIs:
  - `/api/system/health`
  - `/api/system/modules`
- Customer portal tracking API:
  - `/api/portal/repair-tracking`
- Supporting backend modules:
  - `lib/nanofix/rbac.ts`
  - `lib/nanofix/module-contracts.ts`
  - `lib/nanofix/system-events.ts`
  - `lib/nanofix/health.ts`

## Port linkage

- Production public/admin Next.js app: one deployment, default `PORT=3000`
- Public website base: `https://www.nanofixsg.com`
- Admin base: `https://www.nanofixsg.com/admin`
- Customer portal route: `https://www.nanofixsg.com/member-sign-up-login`
- Static preview server: `http://127.0.0.1:4328`

## Security

- `/admin` and `/api/admin` are protected by middleware.
- Admin APIs require `NANOFIX_ADMIN_API_TOKEN` or future Supabase Auth integration.
- Public forms include rate limiting, honeypot, submit-time checks, optional Turnstile and magic-byte upload validation.
- Admin routes are disallowed in `robots.txt` and preview admin pages use `noindex,nofollow`.

## SEO / AEO

- Route-level metadata is centralized in `lib/nanofix/seo.ts`.
- Sitemap includes English and Chinese alternates.
- LocalBusiness and FAQPage structured data are preserved.
- Preview package includes a static SEO/AEO route coverage page under `/admin/`.

## Validation

Run:

```text
npm run repair:maps
node tools/validate-unified-package.mjs
node tools/build-preview-package.mjs
```

The generated `VALIDATION_REPORT_V28.json` records file, map, chain, security and SEO/AEO checks.
