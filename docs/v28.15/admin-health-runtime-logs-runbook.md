# NANOFIX V28.15 Admin Authenticated Health Probe & Runtime Logs Access Runbook

## Scope

V28.15 verifies admin health protection, authenticated health probe readiness, and runtime logs access posture.

This phase does not change business API logic, Supabase schema, RLS policy, public website visuals, or admin workflow behavior.

## Local Quality Baseline

- npm.cmd run lint: Passed
- npm.cmd run typecheck: Passed
- npm.cmd run build:ci: Passed
- npm.cmd run validate:predeploy: Passed
- npm.cmd run verify: Passed

## Production Health Baseline

| Endpoint | Result | Meaning |
|---|---:|---|
| /api/health | 200 | Public health endpoint is healthy |
| /api/ready | 200 | Production readiness is healthy |
| /api/system/health | 200 | Unified system health endpoint is reachable |
| /api/system/modules | 200 | Module registry endpoint is reachable |
| /api/admin/module-health | 401 | Protected admin health endpoint blocks unauthenticated access |
| /api/admin/dashboard | 401 | Protected admin dashboard API blocks unauthenticated access |
| /api/admin/global-search | 401 | Protected admin search API blocks unauthenticated access |
| /api/admin/internal-inbox | 401 | Protected internal inbox API blocks unauthenticated access |
| /api/admin/unified-tasks | 401 | Protected unified tasks API blocks unauthenticated access |
| /api/webhooks/payment | 405 | Webhook GET is rejected as expected |
| /api/webhooks/social | 405 | Webhook GET is rejected as expected |
| /api/webhooks/payments | 405 | Webhook GET is rejected as expected |

## Admin Health Route Review

The admin module health endpoint is implemented at:

- app/api/admin/module-health/route.ts

GET uses:

- requirePermission(request, "module_health.read")

POST uses:

- requirePermission(request, "module_health.write")

The permission guard returns:

- 401 when no authenticated Supabase admin context is present.
- 403 when an authenticated actor lacks the required permission.

This matches the observed production behavior.

## Auth Map Baseline

Admin API auth map was generated for app/api/admin route handlers.

- Admin auth map lines: 221
- Auth library map lines: 47

The map confirms that admin APIs are guarded by one of the project auth helpers, including:

- requireAdmin
- requireAdminApi
- requireActorApi
- requirePermission

## Runtime Logs Access

Vercel runtime error/fatal logs could not be read through the connected Vercel API because the API returned 403 Forbidden.

Impact:

- No code failure was found.
- Production health endpoints are healthy.
- Required follow-up is Vercel account/team/token permission review for runtime logs access.

## Authenticated Admin Health Probe Runbook

To perform a true authenticated admin health check later:

1. Log in to production admin portal with a real Super Admin or operations admin account.
2. Capture a valid Supabase access token or use the authenticated browser session cookie.
3. Call /api/admin/module-health with the authenticated session.
4. Expected result:
   - 200 for a valid admin actor with module_health.read permission.
   - 403 for a valid actor without module_health.read.
   - 401 for no valid authenticated session.

## Follow-up Recommendations

1. Add a protected CI/manual smoke step for authenticated /api/admin/module-health.
2. Confirm Vercel runtime logs permission for the active team/project.
3. Keep unauthenticated 401 checks in the production release checklist.
4. Keep /api/health, /api/ready, /api/system/health, and /api/system/modules as release go/no-go checks.
5. Do not weaken module-health protection to make monitoring easier; use a real admin session or a dedicated secure internal probe.

## Final Status

V28.15 baseline status: Passed.

Admin health protection is correct. Runtime logs access limitation is an external permission issue, not a production code failure.
