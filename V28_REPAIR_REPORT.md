# NANOFIX Website V28 Repair Report

## Scope completed

1. Fixed Next.js build blockers
   - Replaced internal admin `<a href="/admin...">` links with `next/link` in `app/admin/[module]/page.tsx`.
   - Removed the unused `canonicalPath` warning in `tools/build-preview-package.mjs`.
   - Kept the local SVG icon stylesheet as a public stylesheet and disabled only `@next/next/no-css-tags` because this package intentionally serves the local icon subset from `/public/vendor/nanofix-icons.css`.
   - Set Next.js build to skip duplicate in-build linting; `npm run lint` remains mandatory and passes independently.

2. Fixed language anchors and route anchors
   - Replaced obsolete anchors:
     - `#knowledge-base-faq` -> `#waterproofing-faqs`
     - `#latest-insights-guides` -> `#projects-industry-insights`
   - Resolved duplicated/misplaced Free Quote anchors by moving route-level IDs into the Free Quote section:
     - `#whatsapp-photo-consult`
     - `#book-site-inspection`
     - `#track-my-repair-progress`
   - Verified no duplicate IDs in `body.html`, `body.en.html`, and `body.zh.html`.

3. Upgraded admin authentication
   - Middleware now supports Supabase Auth admin sessions.
   - Middleware verifies the Supabase user, then checks `public.admin_profiles` for active admin status and role.
   - Verified admin role/context is forwarded to admin API routes using protected internal request headers.
   - Temporary `NANOFIX_ADMIN_API_TOKEN` fallback is still available for controlled migration and can be disabled with `NANOFIX_ADMIN_TOKEN_FALLBACK_ENABLED=false`.
   - API-level `requireAdmin()` now accepts verified middleware context and role-based permissions.

4. Added route-level rendering / CMS contract layer
   - Added `lib/nanofix/legacy-renderer.ts` so non-home routes render only the matching service section plus common header/footer, instead of always outputting the full legacy body.
   - Added `lib/nanofix/cms.ts` to define CMS-editable blocks for Home, service pages, quote/contact forms, SEO/AEO schema, header, footer and service detail cards.
   - `LegacyWebsitePage` now exposes CMS route metadata via data attributes:
     - `data-cms-route`
     - `data-cms-route-hash`
     - `data-cms-editable-blocks`

## Verification completed

- `npm run typecheck` ✅ passed
- `npm run lint` ✅ passed
- `npm run build:css` ✅ passed
- Anchor validation ✅ passed
- Duplicate ID validation ✅ passed

Note: In this sandbox, long `next build` commands are killed by the execution time wrapper after static page generation. The build progressed through successful compile and static page generation without source-code errors. Run `npm run build` again in local/Vercel environment to confirm final packaging step.

## Deployment notes

Required production environment variables:

- `NEXT_PUBLIC_SITE_URL`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NANOFIX_ADMIN_TOKEN_FALLBACK_ENABLED`
- `NANOFIX_ADMIN_API_TOKEN` during migration only
- `NANOFIX_WEBHOOK_SECRET`
- `NEXT_PUBLIC_MEMBER_PORTAL_URL`

Recommended production setting after Supabase admin login is active:

```env
NANOFIX_ADMIN_TOKEN_FALLBACK_ENABLED=false
NANOFIX_ADMIN_PUBLIC_PREVIEW=false
NANOFIX_ALLOW_TEST_ADMIN_HEADERS=false
```
