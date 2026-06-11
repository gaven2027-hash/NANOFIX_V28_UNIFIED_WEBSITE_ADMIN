# NANOFIX V28.7 Admin Reality Contract Coverage Fix

Date: 2026-06-11
Branch: v28-7-admin-menu-simplify

## Local failure

After the admin reality verifier was updated to read V28.7 navigation, `npm.cmd run validate:predeploy` reached `verify:admin-reality` and failed only three coverage items:

```text
adminModuleReality missing menu href or legacy contract: /social-media#multi-platform-video-generator
adminModuleReality missing menu href or legacy contract: /admin/advertising-center#tiktok-ads
adminModuleReality missing menu href or legacy contract: /admin/advertising-center#x-ads
```

## Root cause

These were real V28.7 visible menu items that did not yet have matching entries in `data/adminModuleReality.ts` and did not have old `legacyFrom` anchors pointing to an existing registry contract.

This was no longer a verifier compatibility issue; it was a missing reality-contract coverage issue.

## Batch fix

Updated:

```text
data/adminModuleReality.ts
```

Added contract coverage for:

- `/social-media#multi-platform-video-generator`
- `/admin/advertising-center#tiktok-ads`
- `/admin/advertising-center#x-ads`

The Social Media contract bucket now includes video generation tables/actions:

```text
media_transform_jobs
media_renditions
generate_platform_video
media_transform_audit
```

The Advertising contract bucket now includes platform-specific ad sync fields/actions:

```text
integration_credentials
sync_platform_ads
ad_platform_sync_audit
```

## Safety

- No production data changes.
- No Supabase reset.
- No RLS changes.
- No menu expansion.
- No verifier weakening.
- The fix adds reality contracts for visible V28.7 menus that actually exist.

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
npm.cmd run validate:predeploy 2>&1 | Tee-Object -FilePath ".\v28-7-validate-predeploy-after-reality-contract-fix.log"
```
