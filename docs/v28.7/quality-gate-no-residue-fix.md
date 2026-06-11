# NANOFIX V28.7 Quality Gate No-Residue Fix

Date: 2026-06-11
Branch: v28-7-admin-menu-simplify

## Local failure

`npm.cmd run validate:predeploy` failed in the legacy full gate at:

```bash
npm run verify:clean-release-no-residue
```

The failing check was:

```text
clean routed admin navigation includes advertising center module and submodules
```

## Root cause

The V28.7 admin menu simplification changed `data/adminNavigation.ts` into a compatibility shim that re-exports the real menu from:

```text
data/v28.7-admin-navigation.ts
```

The old no-residue verifier only read:

```text
data/adminNavigation.ts
```

So it could not see the V28.7 advertising center menu and the `budgets-strategy` legacy anchor preserved inside `legacyFrom`.

## Batch fix

Updated:

```text
tools/verify-clean-release-no-residue.mjs
```

The verifier now reads both:

```text
data/adminNavigation.ts
data/v28.7-admin-navigation.ts
```

and checks the effective navigation source.

It also accepts either:

```text
/admin/advertising-center#budgets-strategy
```

or the V28.7-compatible legacy anchor:

```text
'budgets-strategy'
```

## Safety

- No production data changes.
- No Supabase reset.
- No RLS changes.
- No weakening of the old quality gate; only the source path was updated to follow the new V28.7 navigation architecture.

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
npm.cmd run validate:predeploy 2>&1 | Tee-Object -FilePath ".\v28-7-validate-predeploy-after-no-residue-fix.log"
```
