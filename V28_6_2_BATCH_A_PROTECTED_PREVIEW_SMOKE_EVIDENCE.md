# NANOFIX V28.6.2 Batch A Protected Preview Smoke Evidence

Generated at: 2026-06-08 21:06:35
Branch: v28-6-2-service-ops-public-rbac-repair
Commit: 156ce41 fix(v28.6): support Vercel protection bypass in preview smoke

Preview URL:
https://nanofix-v28-unified-iv9bztytx-gavens-projects-4b79c70b.vercel.app

## Technical Smoke Result

PASS by authenticated Vercel CLI.

### Verified

- /api/ready returned ok:true, env_ready:true, database_ready:true, optional_database_ready:true.
- /api/system/health returned ok:true, readiness_score:83, database.configured:true, database.reachable:true.
- /api/customer-portal/activity-timeline rejected anonymous access.
- /api/admin/service-operations rejected anonymous access.
- /api/global-search?q=leak rejected anonymous access.

## Explanation

Plain Node smoke runner returns 401 for /api/ready and /api/system/health because Vercel Preview Protection blocks unauthenticated Node fetch. Authenticated Vercel CLI curl confirms the app endpoints are healthy.

## Next Manual Business Chain Smoke

Pending browser verification:

1. Public Submit Request page loads.
2. Public repair request form can submit a test request.
3. Request appears in Admin Service Operations / Unified Intake / Service Requests.
4. Customer Center can match or bind customer.
5. Customer Portal Timeline shows related activity.
6. No unauthenticated customer/admin/global-search data exposure.

## Production Rule

Do not merge PR #22 to main.
Do not deploy production.
Keep PR #22 as Draft until manual browser business-chain smoke is complete.
