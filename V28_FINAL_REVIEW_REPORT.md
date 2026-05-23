# NANOFIX Website V28 Logo + Full Audit Hardened Report

## Version
- Package: `NANOFIX_NextJS_Website_V28_LOGO_AUDIT_HARDENED_CODE_PACKAGE`
- Base: V28 Stable SSR Visual Lock
- Date: 2026-05-22

## 1. Visual lock fixes

### Footer logo animation removed
- Removed the `nanofix-logo-aura` class from the footer bottom-left logo block in:
  - `lib/legacy/body.html`
  - `lib/legacy/body.en.html`
  - `lib/legacy/body.zh.html`
- Added a hard CSS lock to prevent footer logo pseudo-element animation from reappearing:
  - `.nanofix-footer-logo-wrap::before`
  - `.nanofix-footer-logo-wrap::after`
  - `.nanofix-footer-logo-wrap .nanofix-logo-img`

### Header top-left aura shortened by 40%
- Shortened the header logo ray size from `220%` to `132%`.
- Reduced the ray animation scale and blur range so the light projection is visibly shorter and less intrusive.
- The header logo remains animated, but the light reach is approximately 40% shorter than the previous 220% aura design.

## 2. Architecture review and repairs

### Confirmed architecture
- True Next.js App Router project:
  - `app/layout.tsx`
  - `app/page.tsx`
  - `app/[...slug]/page.tsx`
  - `app/en/[...slug]/page.tsx`
  - `app/zh/[...slug]/page.tsx`
  - `app/api/*`
  - `middleware.ts`
  - `next.config.mjs`
  - `supabase/migrations/*`
  - `vercel.json`

### Build strategy
- The default build script remains on stable Next 15 compile mode because the large visual-lock legacy layer can make the normal single-stage build slow in the current sandbox.
- `next start` has been verified after `npm run build`.
- Production route checks passed for public pages, API health, sitemap, robots, and protected admin access.

## 3. Link and route checks

### Anchor verification
- `lib/legacy/body.html`: 37 anchor targets checked and passed.
- `lib/legacy/body.en.html`: 37 anchor targets checked and passed.
- `lib/legacy/body.zh.html`: 37 anchor targets checked and passed.

### Runtime route checks
Verified HTTP status after production start:
- `/` -> 200
- `/leak-detection/thermal-imaging-scan` -> 200
- `/no-hacking-repair/toilet-no-hacking-repair` -> 200
- `/waterproofing-works/rc-roof-metal-roof` -> 200
- `/free-quote/book-site-inspection` -> 200
- `/en/leak-detection` -> 200
- `/zh/free-quote/contact-info-location` -> 200
- `/api/health` -> 200
- `/robots.txt` -> 200
- `/sitemap.xml` -> 200
- `/admin` -> 401 protected

## 4. Security review and repairs

### Improved security headers
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `X-Frame-Options: SAMEORIGIN`
- `Strict-Transport-Security`
- `Permissions-Policy`
- Content Security Policy updated for:
  - Cloudflare Turnstile
  - Google Maps iframe
  - Supabase API access
  - static assets, media, and workers

### Admin protection
- `/admin` and `/api/admin/*` remain protected by middleware.
- Supabase Auth + `admin_profiles` RBAC remains the preferred path.
- `NANOFIX_ADMIN_API_TOKEN` fallback remains available for migration only.
- `.env.example` sets `NANOFIX_ADMIN_TOKEN_FALLBACK_ENABLED=false` as the safer production default.

### Public repair request hardening
- Public lead submission now continues into `service_requests` after intake and lead creation.
- The API returns `service_request_id` and adds it to audit/outbox payloads.
- Upload/file checks and Zod validation remain in place.

### Remaining security caveat
- CSP still requires `'unsafe-inline'` because the website intentionally preserves the original legacy visual layer. Removing this safely requires a future full React component rebuild with visual regression testing.

## 5. SEO / AEO review and repairs

### Static SEO assets
- Generated `public/sitemap.xml` with 105 URLs.
- Added root locale entries:
  - `/`
  - `/en`
  - `/zh`
- `robots.txt` allows public pages and blocks:
  - `/api/`
  - `/admin/`

### Locale-aware metadata
- English pages now use `/en` canonical paths.
- Chinese pages now use `/zh` canonical paths.
- Structured data URLs now respect locale.
- Breadcrumbs, LocalBusiness, Service, FAQ and route-level metadata remain active.

## 6. Supabase compatibility review and repairs

### Migration compatibility added
The Supabase migration set now includes missing operational tables/views used by admin APIs:
- `app_modules`
- `module_health_events`
- `latest_module_health`
- `entity_events`
- `customer_binding_suggestions`
- `global_search_documents`

### Role compatibility
`admin_profiles.role` now supports the role values used by the codebase:
- `super_admin`
- `admin`
- `operations_admin`
- `content_admin`
- `ai_admin`
- `finance_admin`
- `support_admin`
- `finance`
- `support`
- `engineer`

## 7. GitHub / Vercel / Supabase deployment compatibility

### GitHub
- Source package excludes `node_modules` and `.next` for clean GitHub upload.
- Recommended Node runtime: Node 20.11+.
- Recommended commands:
  - `npm ci`
  - `npm run typecheck`
  - `npm run lint`
  - `npm run build`

### Vercel
- `vercel.json` exists.
- Next.js App Router SSR mode is preserved.
- Required environment variables must be configured in Vercel project settings.
- Because this project keeps a large visual-lock legacy rendering layer, the package uses a stable compile-mode build script. Full component conversion can later move back to a standard single-stage Next build.

### Supabase
- Apply migrations in order from `supabase/migrations`.
- Required production environment variables:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `NANOFIX_ADMIN_API_TOKEN`
  - `NANOFIX_ADMIN_TOKEN_FALLBACK_ENABLED=false`
  - `NEXT_PUBLIC_SITE_URL=https://www.nanofixsg.com`
  - optional `TURNSTILE_SECRET_KEY`

## 8. Verification commands passed

```bash
npm run typecheck
npm run lint
npm run build:css
node tools/verify-anchors-v28.mjs
node tools/audit-v28.mjs
npm audit --audit-level=moderate
npm run build
npm run verify
```

Result:
- TypeScript passed.
- ESLint passed.
- CSS build passed.
- Anchor checks passed.
- V28 audit passed.
- `npm audit` found 0 vulnerabilities.
- Production route checks passed.

## 9. Updated estimated score

- Next.js architecture: 91-93
- Visual / layout stability: 93-94
- Link integrity: 92-94
- SEO / AEO: 91-93
- Security: 88-91
- Supabase compatibility: 89-92
- GitHub / Vercel deployment readiness: 88-91
- Overall practical score: 91-93

## 10. Remaining path to 94+

To consistently score above 94, the next upgrade should be a staged, pixel-locked React component rebuild:
- Replace legacy HTML injection with real React components.
- Remove CSP `'unsafe-inline'`.
- Add Playwright screenshot regression tests for desktop/tablet/mobile.
- Move rate limiting from in-memory fallback to Redis/Vercel KV/Supabase rate-limit table.
- Fully connect Website Management CMS to database-driven content editing and publishing.
