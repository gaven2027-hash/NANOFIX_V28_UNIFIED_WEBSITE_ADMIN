# NANOFIX GP V28 - CI / Audit / ISR / Build / E2E Fix Report

Generated: 2026-05-23
Package base: `GP-上线-NANOFIX_V28_UNIFIED_WEBSITE_ADMIN_STABLE_PACKAGE_20260523.zip`

## Fixed areas

### 1. CI quality gate
- Replaced the fragmented GitHub Actions steps with a single `npm run quality:gate` command.
- CI now runs: SEO asset sync, TypeScript, ESLint, anchor verification, package validation, V28 audit, safe production build and E2E smoke tests.
- Added build environment hardening flags for GitHub/Vercel compatibility:
  - `NEXT_TELEMETRY_DISABLED=1`
  - `NANOFIX_ADMIN_PUBLIC_PREVIEW=false`
  - `NANOFIX_ADMIN_TOKEN_FALLBACK_ENABLED=false`
  - `NANOFIX_ALLOW_FORM_WITHOUT_SUPABASE=false`

### 2. Audit script repair
- Fixed `tools/audit-v28.mjs` so it accepts the Vercel-safe build wrapper instead of incorrectly forcing only experimental compile mode.
- Updated Supabase session verification audit to match the actual middleware security implementation:
  - `actorFromSupabaseSession`
  - `getSupabaseUserIdAndEmail`
  - `fetchProfileActor`
- Added audit checks for the E2E smoke runner.

### 3. Public website ISR / SEO performance
- Public marketing pages now use ISR:
  - `export const dynamic = "force-static"`
  - `export const revalidate = 86400`
- Added `generateStaticParams()` to the default, English and Chinese catch-all public routes.
- Result: Next build now prerenders 108 public pages with 1-day revalidation while keeping admin/API/portal routes dynamic.

### 4. Build stability
- Rebuilt `tools/safe-next-build.sh` to stream build logs, print progress heartbeats and safely close idle Next.js build tracing workers only after successful compile + ISR page generation + route manifest output.
- `npm run build` now exits successfully in the verified environment.
- The route summary confirms:
  - Public routes: Static / SSG with daily revalidate
  - Admin, portal and API routes: Dynamic server-rendered
  - Middleware: active

### 5. E2E route and security smoke tests
- Added `tools/e2e-smoke.mjs` with no extra external dependency.
- The smoke test starts `next start` and validates:
  - Public route responses are 200
  - `/admin`, `/dashboard`, `/customer-portal`, `/engineer-portal` redirect to `/login`
  - protected API routes reject spoofed role headers with 401
  - `/api/health` returns 200

## Verified commands

```bash
npm ci
npm run sync:seo-assets
npm run typecheck
npm run lint
npm run verify:anchors
npm run validate:package
npm run audit:v28
npm audit --audit-level=moderate
npm run build
npm run test:e2e:smoke
npm run quality:gate
```

## Final verification result

- TypeScript: PASS
- ESLint: PASS
- Anchor verification: PASS
- Unified package validation: PASS
- V28 audit: PASS
- npm audit moderate: PASS, 0 vulnerabilities
- Safe production build: PASS
- E2E smoke: PASS
- Full `quality:gate`: PASS

## Remaining future improvement

The Content Security Policy still allows `'unsafe-inline'` because the current V28 public website preserves the legacy visual-lock HTML/CSS/JS payload. This is acceptable for preserving the locked visual layout, but the future React component rebuild should remove inline scripts/styles and use nonce/hash-based CSP.
