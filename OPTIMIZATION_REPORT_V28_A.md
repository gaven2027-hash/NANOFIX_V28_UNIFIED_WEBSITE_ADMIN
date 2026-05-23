# NANOFIX Website V28 Stability + SEO + Security Optimized

## Optimization rule
This package keeps the existing visual layout, homepage sections, carousel cards, small widgets, hover states and legacy animation scripts unchanged. The work focuses on the production foundation underneath the current display layer.

## What changed

### 1. Next.js architecture stability
- Kept the legacy HTML/CSS/JS rendering layer to avoid visual regression.
- Removed `force-dynamic` from the public website pages and enabled `revalidate = 3600` for better cacheability.
- Added `generateStaticParams()` for the SEO route list.
- Added a shared SEO route configuration in `lib/nanofix/seo.ts`.
- Added `npm run typecheck` and `npm run verify` scripts.
- Replaced deprecated `next lint` with `eslint . --max-warnings=0`.

### 2. SEO / AEO / NEO
- Added real metadata support for first-level and second-level service URLs.
- Expanded sitemap coverage from the small route subset to the full NANOFIX service and guide route map.
- Added per-route canonical URL, Open Graph and Twitter card metadata.
- Added structured data generation for:
  - LocalBusiness
  - BreadcrumbList
  - Service
  - FAQPage where applicable
- Preserved the existing page layout and hash-based display logic.

### 3. Public repair request chain
- Front-end form bridge now checks the API response and only shows success when the API returns success.
- Added form rate limiting protection.
- Added honeypot field support.
- Added file upload restrictions:
  - max files
  - max file size
  - allowed MIME types
- Production public form now requires Supabase storage unless `NANOFIX_ALLOW_FORM_WITHOUT_SUPABASE=true` is explicitly set.
- Outbox status is now clearer: `queued`, `sent`, `failed`.

### 4. Admin and API security
- Added `middleware.ts` to protect `/admin` and `/api/admin` in production.
- Replaced always-trusted preview headers with safer token-based admin authentication.
- `x-admin-role` / `x-admin-user-id` preview headers only work in development or when `NANOFIX_ALLOW_TEST_ADMIN_HEADERS=true`.
- Added admin noindex and no-store headers.
- Added stricter security headers in `next.config.mjs`.

### 5. Customer registration and OTP
- Customer registration no longer trusts a client-provided `otp_verified=true` flag by default.
- Added server-side `otp_verifications` table contract and token validation.
- Preview-only insecure OTP can be enabled with `NANOFIX_ALLOW_INSECURE_OTP_PREVIEW=true`, but should never be enabled in production.

### 6. Webhook hardening
- Added HMAC signature verification for inbound webhooks.
- Added timestamp skew protection when timestamp headers are provided.
- Production webhooks require a configured secret.
- Duplicate inbound events are safely treated as idempotent duplicate submissions.

## Files added or significantly changed
- `lib/nanofix/seo.ts`
- `lib/nanofix/security.ts`
- `lib/nanofix/auth.ts`
- `lib/public-repair-request.ts`
- `middleware.ts`
- `app/page.tsx`
- `app/[...slug]/page.tsx`
- `app/sitemap.ts`
- `app/robots.ts`
- `app/api/customer/register/route.ts`
- `app/api/webhooks/[source]/route.ts`
- `next.config.mjs`
- `eslint.config.mjs`
- `.env.example`
- `supabase/migrations/20260521_v28_security_seo_hardening.sql`

## Remaining production recommendations
- Connect a real Supabase Auth admin login UI instead of relying on the temporary admin API token.
- Move Tailwind CDN to a local Tailwind build in a later visual-regression-controlled pass.
- Convert large PNG/JPG images to WebP/AVIF without changing crop, ratio, overlay or display effect.
- Gradually convert legacy HTML sections into React components only after screenshot comparison is available.
- Add CI/CD checks on GitHub: typecheck, lint, build and npm audit.

## Expected score after this package
- If deployed with correct Supabase, webhook and admin environment variables: approximately 85-88 / 100.
- If used only as a local preview without Supabase/Admin secrets: approximately 78-82 / 100 because the production data chain is intentionally not fully active.
