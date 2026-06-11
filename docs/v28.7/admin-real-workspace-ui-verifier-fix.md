# NANOFIX V28.7 Admin Real Workspace UI Verifier Fix

Date: 2026-06-11
Branch: v28-7-admin-menu-simplify

## Local failure

After `verify:admin-reality` passed, `npm.cmd run validate:predeploy` advanced to:

```bash
npm run verify:admin-real-workspace-ui
```

The verifier failed with nine missing routes:

```text
adminNavigation.ts missing route /admin
adminNavigation.ts missing route /dashboard
adminNavigation.ts missing route /service-operations
adminNavigation.ts missing route /website-management
adminNavigation.ts missing route /social-media
adminNavigation.ts missing route /admin/advertising-center
adminNavigation.ts missing route /ai-intelligence
adminNavigation.ts missing route /customer-center
adminNavigation.ts missing route /system-settings
```

## Root cause

The old verifier only read:

```text
data/adminNavigation.ts
```

V28.7 changed this file into a compatibility shim. The real navigation source is now:

```text
data/v28.7-admin-navigation.ts
```

Therefore the old verifier could not see any first-level admin routes.

## Batch fix

Updated:

```text
tools/verify-admin-real-workspace-ui.mjs
```

The verifier now builds an effective admin navigation source from:

```text
data/adminNavigation.ts
data/v28.7-admin-navigation.ts
```

It still checks:

- daily admin routes exist
- each daily admin page renders `MenuAnchorSections`
- daily admin pages do not render `AdminSubmoduleWorkspace`
- diagnostic card clusters stay out of daily pages
- `/system-settings` remains the only diagnostics entry
- `MenuAnchorSections` remains server-safe and exposes safe fallback anchors

## Safety

- No production data changes.
- No Supabase reset.
- No RLS changes.
- No visible menu expansion.
- No diagnostic UI moved into daily workspaces.
- The verifier is still strict; it now reads the correct V28.7 navigation source.

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
npm.cmd run validate:predeploy 2>&1 | Tee-Object -FilePath ".\v28-7-validate-predeploy-after-real-workspace-ui-fix.log"
```
