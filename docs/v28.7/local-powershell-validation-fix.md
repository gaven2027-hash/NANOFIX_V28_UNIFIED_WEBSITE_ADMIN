# NANOFIX V28.7 Local PowerShell Validation Fix

Date: 2026-06-11
Branch: v28-7-admin-menu-simplify

## Local PowerShell errors received

The first local validation pass showed:

1. `node tools/verify-v28-7-customer-review-links.mjs`
   - Failed because the script still expected `submit-review-link` to be hardcoded inside `components/PortalShell.tsx`.
   - Current architecture moved old customer portal anchors into `data/v28.7-customer-portal-navigation.ts`.

2. `node tools/verify-v28-7-prerelease-stability.mjs`
   - Failed because it required:
     - `app/portal/engineer/page.tsx`
     - `app/portal/customer/page.tsx`
   - Those routes were expected by the prerelease guardrail but were not yet present locally.

3. `npm run typecheck`, `npm run lint`, `npm run build`
   - PowerShell blocked `npm.ps1` because of Windows execution policy.
   - Use `npm.cmd` instead of `npm` in PowerShell without changing system execution policy.

## Batch fixes applied

### 1. Added missing standalone portal routes

Added:

- `app/portal/customer/page.tsx`
- `app/portal/engineer/page.tsx`

These restore standalone customer and engineer portal routes used by the prerelease stability guardrail.

### 2. Aligned review link verification with new five-menu architecture

Updated:

- `tools/verify-v28-7-customer-review-links.mjs`

The script now checks:

- `PortalShell.tsx` renders `CustomerReviewLinkButton`
- `data/v28.7-customer-portal-navigation.ts` preserves the `submit-review-link` legacy anchor
- `Support & Account` keeps `includesReviewLink: true`

It no longer incorrectly requires `submit-review-link` to be a visible or hardcoded PortalShell menu item.

## PowerShell command update

Use `npm.cmd` in PowerShell:

```powershell
npm.cmd run typecheck
npm.cmd run lint
npm.cmd run build
```

Do not change global Windows execution policy unless intentionally required by the local machine administrator.
