# NANOFIX Website V28

This package is the V28 performance and production optimization release. It keeps the existing public website layout, carousel, animations, widgets and visual display unchanged while improving production performance and deployment readiness.

## V28 Highlights

- All public website PNG images converted to WebP.
- `public/assets/images` reduced from about 65.33 MB to about 3.55 MB.
- Tailwind runtime CDN removed and replaced with local Tailwind CSS build.
- Static asset cache headers added for images and generated CSS.
- Added `/api/health` and `/api/ready`.
- Added GitHub Actions CI.
- Next.js pinned to `15.5.18`.
- `npm audit --audit-level=moderate` passes with 0 vulnerabilities.
- Added deployment checklist and V28 optimization report.

## Quick Verification

```bash
npm ci
npm audit --audit-level=moderate
npm run typecheck
npm run lint
npm run sync:seo-assets
npm run typecheck
npm run lint
npm run verify:anchors
npm run validate:package
npm run audit:v28
npm run build:css
npm run build
npm run build:preview
```

## Important Files

```text
OPTIMIZATION_REPORT_V28.md
VERIFY_RESULTS_V28.txt
docs-deployment-checklist-v28.md
IMAGE_OPTIMIZATION_MANIFEST_V28.json
.env.example
.github/workflows/ci.yml
```

---

# NANOFIX-V28 Next.js Admin + Website Runtime

This package keeps the existing NANOFIX public website runtime and adds the generated V28 Central Admin Backend contract from `NANOFIX-V28_Central_Admin_Website_Code_Quality_Enhanced.xlsx`.

The generated scope includes Admin Backend, Customer/Engineer workflow contracts, Website Management backend, website-entry APIs, Supabase schema/RLS, AI review flow, webhook queue/DLQ, backup schedules and acceptance gates. The public marketing website frontend remains the preserved legacy-derived website and should be generated from a separate website instruction file if redesigned.

## Run

```bash
npm install
npm run prepare:legacy
npm run dev
```

Open:

- Public website: `http://localhost:3000`
- Admin backend: `http://localhost:3000/admin`

## Deployment

Deploy to Vercel from GitHub. Add the environment variables in `.env.example` to Vercel Project Settings. The generated `lib/legacy` files are committed, so the production build command can be `npm run build`.

## Public Website Entrances

- `⭐️ Get a Free Quote` is the preserved top CTA. It opens the no-login repair intake with backend semantic `Free Leak Inspection & Quote`.
- `Request Free Inspection & Quote` is the form title and `Submit Repair Request` is the form submit action.
- Public forms post to `/api/public-repair-request`; `/api/leads` is kept as a compatibility alias. The server writes Supabase first and can forward to the central admin repair entrance through `ADMIN_REPAIR_REQUEST_URL`.
- `Member Sign Up / Login` is a separate customer account entrance. Configure it with `NEXT_PUBLIC_MEMBER_PORTAL_URL`.
- Keep these flows separate: repair intake stays fast and low-friction; member access is for real-time repair progress, service status and repair records.

## Admin API authentication during integration

Admin routes are server-side only and expect an authenticated admin context. Until Supabase Auth middleware is connected, integration tests can pass:

```text
x-admin-user-id: <uuid-or-test-actor>
x-admin-role: super_admin
```

Production must replace this with Supabase Auth + role lookup from `profiles`, `roles`, `permissions` and `role_permissions`.

## Supabase migration

Apply:

```bash
supabase db push
```

or run the SQL in:

```text
supabase/migrations/20260521_central_admin_backend.sql
supabase/migrations/20260521_v28_security_seo_hardening.sql
supabase/migrations/20260522_v28_enhancements.sql
```

The migration creates the core tables, enums, indexes and RLS policies for customers, leads, service requests, jobs, quotations, invoices, payments, warranties, AI drafts/logs, inbound events, retry/DLQ, backups, audit logs and search logs.

## Key generated routes

- `POST /api/public/repair-requests`
- `POST /api/customer/register`
- `GET /api/admin/search`
- `GET /api/admin/customer-binding/pending`
- `POST /api/admin/customer-binding/bind`
- `POST /api/admin/service-requests/[id]/create-job`
- `POST /api/admin/ai/drafts`
- `POST /api/admin/ai/drafts/[id]/review`
- `POST /api/webhooks/[source]`
- `PATCH /api/admin/backups/schedules`

## Original lead table compatibility

```sql
create table if not exists website_leads (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text not null,
  postal_code text,
  address text,
  service_type text,
  message text,
  source text default 'website',
  user_agent text,
  created_at timestamptz default now()
);
```


## V28 Stability + SEO + Security Optimized

This package preserves the existing NANOFIX page layout, visual display, carousel cards, small widgets and animation behavior. The optimization focuses on the production foundation underneath the current UI.

Key V28 upgrades:

- Full route SEO map in `lib/nanofix/seo.ts` for first-level and second-level pages.
- Expanded `sitemap.xml` and route-specific metadata/canonical/Open Graph support.
- Structured data generation for LocalBusiness, BreadcrumbList, Service and FAQPage.
- Public repair form response checking, rate limiting, upload validation and production Supabase requirement.
- Admin/API protection through `middleware.ts` and `NANOFIX_ADMIN_API_TOKEN`.
- Server-side OTP verification contract through `otp_verifications`; production should not trust a client-side `otp_verified` boolean.
- HMAC signature validation for inbound webhooks.
- ESLint CLI config replacing deprecated `next lint`.

Production environment variables must be configured from `.env.example` before accepting real customer submissions.

See `OPTIMIZATION_REPORT_V28.md` for the full optimization summary.

## V28 Quality Repair Note
This package includes a visual-safe Next.js repair pass: package validation, GitHub Actions CI, daily ISR/static public marketing routes, sitemap hreflang alternates, CMS route metadata, protected admin middleware, Supabase-backed public form rate limiting, client-side image upload compression, and defensive mobile overflow guards. Use `npm run verify` before deployment and `npm run build:full` only when a full normal Next.js build is required in an environment where trace workers exit cleanly.

## V28 Stable SSR Visual Lock Note
This package uses Next.js App Router with visual-locked Legacy rendering for the large approved public visual pages. Public marketing routes are configured as force-static with daily ISR to improve SEO and Vercel performance without changing layout. The default production build is `next build --experimental-build-mode=compile`, followed by `npm run verify` for TypeScript, lint, CSS, anchor, build-artifact and production route checks. This keeps the approved NANOFIX layout stable while maintaining live App Router API routes and Supabase integration points.
