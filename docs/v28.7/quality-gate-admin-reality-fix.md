# NANOFIX V28.7 Admin Reality Quality Gate Fix

Date: 2026-06-11
Branch: v28-7-admin-menu-simplify

## Local failure

After the Dashboard workflow legacy anchors were restored, `npm.cmd run validate:predeploy` advanced to:

```bash
npm run verify:admin-reality
```

The admin reality verifier failed with:

```text
Expected broad 0-8 menu coverage; found only 0 child hrefs.
```

## Root cause

The old verifier only read:

```text
data/adminNavigation.ts
```

and extracted visible child hrefs with a `child('...')` regex.

V28.7 changed `data/adminNavigation.ts` into a compatibility shim. The actual menu source is now:

```text
data/v28.7-admin-navigation.ts
```

So the verifier counted zero menu children.

## Batch fix

Updated:

```text
tools/verify-admin-module-reality.mjs
```

The verifier now reads the effective navigation source:

```text
data/adminNavigation.ts
data/v28.7-admin-navigation.ts
```

It also understands the V28.7 simplified menu model:

- visible child hrefs are counted from `data/v28.7-admin-navigation.ts`
- expected coverage is at least 66 V28.7 child menus, matching the approved V28.7 menu simplification
- each visible href must be covered either directly in `adminModuleReality.ts` or through one of its `legacyFrom` anchors

This keeps the reality registry meaningful without forcing the new 66 visible V28.7 menu names to duplicate all older V28.2/V28.4 contract anchors.

## Safety

- No production data changes.
- No Supabase reset.
- No RLS changes.
- No visible menu expansion.
- V28.7 simplified menu remains intact.
- The verifier still requires every V28.7 menu to have direct or legacy contract coverage.

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
npm.cmd run validate:predeploy 2>&1 | Tee-Object -FilePath ".\v28-7-validate-predeploy-after-admin-reality-fix.log"
```
