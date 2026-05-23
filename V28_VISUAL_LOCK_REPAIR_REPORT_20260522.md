# NANOFIX V28 Visual-Lock Repair Report — 2026-05-22

## Repair principle

This repair pass preserves the approved public website visual display, layout, images, animations, carousel behaviour, mobile visual lock CSS and Legacy HTML rendering. The repair only changes production foundation, validation, SEO/AEO output, deployment quality gates and form/security handling.

## Fixed items

1. **Package validation fixed**
   - `tools/validate-unified-package.mjs` no longer looks for the removed `app/sitemap.ts`.
   - It validates `public/sitemap.xml`, layout hreflang alternates, admin middleware protection, map iframe stability and upload/security checks.

2. **GitHub Actions CI added**
   - Added `.github/workflows/ci.yml`.
   - CI runs install, SEO asset sync, typecheck, lint, anchor verification, package validation, V28 audit and compile build.

3. **Public route rendering improved without visual change**
   - Public marketing routes now use `force-static` with `revalidate = 86400`.
   - Dynamic route pages expose `generateStaticParams()` from the existing SEO route map.
   - Admin and API routes remain dynamic.

4. **SEO/AEO strengthened**
   - JSON-LD structured data is output with normal server-rendered `<script type="application/ld+json">` tags.
   - `tools/sync-static-seo-assets-v28.mjs` now generates sitemap `xhtml:link` hreflang alternates for `x-default`, `en-SG` and `zh-SG`.
   - `public/sitemap.xml` has been regenerated with 105 URLs and hreflang alternates.

5. **Public repair form security improved**
   - Existing in-memory rate limit remains as a fast first gate.
   - Added Supabase-backed persistent rate limiting using `public.form_rate_limits` when Supabase is configured.
   - This improves production stability across Vercel/serverless instances.

6. **Upload experience improved without layout change**
   - Public form bridge now auto-compresses supported image uploads in the browser using Canvas when available.
   - Compression is controlled by `NEXT_PUBLIC_UPLOAD_IMAGE_MAX_WIDTH`, `NEXT_PUBLIC_UPLOAD_IMAGE_QUALITY` and `NEXT_PUBLIC_UPLOAD_IMAGE_MIN_COMPRESS_BYTES`.
   - Server-side magic-byte validation and file-size limits remain enforced.

7. **Documentation consistency repaired**
   - README migration file references now match the actual Supabase migration files.
   - README verification commands now include validation/audit scripts.
   - `.env.example` now documents upload compression variables.

## Files changed

- `.github/workflows/ci.yml`
- `.env.example`
- `README.md`
- `app/page.tsx`
- `app/[...slug]/page.tsx`
- `app/en/page.tsx`
- `app/en/[...slug]/page.tsx`
- `app/zh/page.tsx`
- `app/zh/[...slug]/page.tsx`
- `components/LegacyWebsitePage.tsx`
- `lib/public-repair-request.ts`
- `package.json`
- `public/sitemap.xml`
- `tools/audit-v28.mjs`
- `tools/sync-static-seo-assets-v28.mjs`
- `tools/validate-unified-package.mjs`
- `VALIDATION_REPORT_V28.json`

## Validation completed in this environment

Passed:

```bash
npm run typecheck
npm run lint
node tools/validate-unified-package.mjs
node tools/audit-v28.mjs
node tools/verify-anchors-v28.mjs
```

Notes:

- `next build --experimental-build-mode=compile` began compiling but exceeded this sandbox command runtime limit during the optimized build phase. TypeScript and ESLint passed, and the package-level Node validators passed.
- `npm ci --omit=optional` was used first to keep installation within sandbox time, then `@next/swc-linux-x64-gnu@15.5.18` was installed for local Next.js compile attempts. `node_modules` and `.next` are not included in the final code package.

## Visual lock confirmation

The following visual files were not changed:

- `lib/legacy/body.html`
- `lib/legacy/body.en.html`
- `lib/legacy/body.zh.html`
- `lib/legacy/inline.css`
- `public/assets/images/*`
- `public/static/nanofix-tailwind.css`
- `public/vendor/nanofix-icons.css`

This means approved page layout, spacing, images, carousel, animations, colours and mobile visual CSS remain preserved.
