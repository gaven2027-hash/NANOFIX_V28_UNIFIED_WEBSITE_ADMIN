# NANOFIX V28.7 OA/ERP Readiness Audit Navigation Fix

Date: 2026-06-11
Branch: v28-7-admin-menu-simplify

## Local failure

After the admin real workspace UI verifier fix, `npm.cmd run validate:predeploy` advanced further to:

```bash
npm run audit:oa-erp
```

The generated `OA_ERP_READINESS_REPORT.json` showed:

```json
{
  "menu_primary_count": 0,
  "submodule_count": 0,
  "expected_primary_orders_0_to_8": false,
  "primary_routes": [],
  "blockers": [
    "Primary admin orders are not exactly 0,1,2,3,4,5,6,7,8."
  ]
}
```

## Root cause

The old OA/ERP readiness audit only read:

```text
data/adminNavigation.ts
```

V28.7 changed this file into a compatibility shim. The real navigation source is now:

```text
data/v28.7-admin-navigation.ts
```

Therefore the audit saw `menu: []` and incorrectly reported that the 0–8 primary admin order was missing.

## Batch fix

Updated:

```text
tools/oa-erp-readiness-audit.mjs
```

The audit now builds the effective navigation source from:

```text
data/adminNavigation.ts
data/v28.7-admin-navigation.ts
```

It still checks:

- 0–8 primary admin route order
- all primary admin pages exist
- each primary route has expected workspace markers
- each daily route uses `MenuAnchorSections`
- submodule hrefs stay under their parent routes
- duplicate child hrefs are blocked
- selected live APIs require auth and avoid `select('*')`
- internal admin blue style remains intact
- `AdminSubmoduleWorkspace` keeps real operation controls

## Safety

- No production data changes.
- No Supabase reset.
- No RLS changes.
- No visible menu expansion.
- The audit is not weakened; it now reads the correct V28.7 menu source.

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
npm.cmd run validate:predeploy 2>&1 | Tee-Object -FilePath ".\v28-7-validate-predeploy-after-oa-erp-audit-fix.log"
```
