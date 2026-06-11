# NANOFIX V28.7 Quality Gate Portal Boundary Fix

Date: 2026-06-11
Branch: v28-7-admin-menu-simplify

## Local failure

After the no-residue gate was fixed, `npm.cmd run validate:predeploy` advanced to:

```bash
npm run verify:v28-1-6-portals
```

The legacy V28.1.6 verifier failed five checks:

1. Customer Portal includes New Repair Request and Warranty Claim
2. Customer Portal includes reviews and privacy settings
3. PortalShell no longer exposes standalone engineer portal menu
4. Admin navigation restored review/testimonial final menu items
5. Admin navigation restored login/registration settings

## Root cause

The old verifier expected the pre-V28.7 structure:

- Customer Portal labels hardcoded directly in `components/PortalShell.tsx`
- No `EngineerPortalAnchors` export inside PortalShell
- Admin menu items directly present inside `data/adminNavigation.ts`

V28.7 changed these intentionally:

- Customer Portal visible menu is now simplified to five menus in `data/v28.7-customer-portal-navigation.ts`
- Old customer anchors such as `new-repair-request`, `warranty-claim`, `submit-review-link` and `review-privacy-settings` are preserved as legacy anchors in the navigation config
- Engineer portal compatibility is isolated as `type="engineer"` support, not exposed as a public registration/login flow
- `data/adminNavigation.ts` is now a compatibility shim that re-exports `data/v28.7-admin-navigation.ts`

## Batch fix

Updated:

```text
tools/verify-v28-1-6-portal-boundaries.mjs
```

The verifier now checks the effective V28.7 sources:

- `components/PortalShell.tsx`
- `data/v28.7-customer-portal-navigation.ts`
- `data/adminNavigation.ts`
- `data/v28.7-admin-navigation.ts`
- `app/portal/engineer/page.tsx`

## Safety

This does not weaken portal safety. It still verifies:

- login/register only expose admin/customer contexts
- legacy `/engineer-portal` redirects to internal admin login/dashboard
- `/api/portal/engineer` remains protected as admin API
- customer portal remains outside AdminShell
- public service request supports new repair and warranty claim
- public registration has no standalone engineer role
- no standalone engineer register/login page exists

It only updates the old verifier to understand V28.7's simplified menu and compatibility architecture.

## Validation to rerun

Correct directory first:

```powershell
cd "C:\Users\Amelindo\Documents\NANOFIX_V28_UNIFIED_WEBSITE_ADMIN"
pwd
git status
```

Then:

```powershell
git fetch origin
git pull origin v28-7-admin-menu-simplify
npm.cmd run validate:predeploy 2>&1 | Tee-Object -FilePath ".\v28-7-validate-predeploy-after-portal-boundary-fix.log"
```
