# GP V28 Final Deployment Compatibility Fix Report — 2026-05-23

This package was rechecked and patched for GitHub + Vercel + Supabase production deployment readiness.

## Fixes applied

1. Updated `tools/verify-v28.mjs` so protected pages are expected to redirect to `/login` while protected APIs are expected to return `401`. This matches the actual production auth design.
2. Protected the legacy generic `/api/service-requests` endpoint through middleware and route-level `requireAdmin(...)` checks. Public no-login intake remains available only through the canonical public repair request endpoints.
3. Routed `/api/public/repair-request` to the hardened canonical public repair handler, removing inconsistent duplicate behaviour.
4. Added explicit Vercel `installCommand`, `buildCommand`, and `devCommand` so Vercel runs the same predeploy quality gate before build.
5. Added `.gitignore` and `.vercelignore` to avoid committing secrets, `.next`, `node_modules`, build logs, and generated zip files.
6. Expanded `.env.example` with all missing production/staging variables used by the code, including webhook secrets, fallback controls, OTP preview control, and build timeout controls.
7. Added `validate:predeploy` script and made `quality:gate` / `validate:ci` reuse the same deployment gate.

## Required production settings

- `NANOFIX_ADMIN_TOKEN_FALLBACK_ENABLED=false`
- `ALLOW_ADMIN_API_SECRET_FALLBACK=false`
- `NANOFIX_ADMIN_PUBLIC_PREVIEW=false`
- Real `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_URL`, and `SUPABASE_SERVICE_ROLE_KEY` must be configured in Vercel.
- Apply Supabase migrations in order before switching production traffic.
- Create real Supabase Auth users and matching `public.profiles` rows for admin/customer/engineer testing.

## Final local checks to run

```bash
npm ci
npm run validate:predeploy
npm run build
npm run verify
npm run test:e2e:smoke
```

