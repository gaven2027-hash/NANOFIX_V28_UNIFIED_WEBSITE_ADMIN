# NANOFIX V28.7 Dashboard Workflow Legacy Anchor Fix

Date: 2026-06-11
Branch: v28-7-admin-menu-simplify

## Local failure

After the V28.2 workflow verifier was updated to read V28.7 navigation, `npm.cmd run validate:predeploy` still reported three missing Dashboard anchors:

```text
/dashboard#automation-notification-engine
/dashboard#internal-inbox
/dashboard#unified-task-engine
```

## Root cause

This time the issue was not only the verifier. The real V28.7 navigation did not preserve these three old V28.2 Dashboard anchors inside `legacyFrom`.

The V28.7 Dashboard visible menu is simplified to:

- Executive Overview
- Urgent Action Queue
- Intake & Lead Summary
- Operations Summary
- Channel Performance Snapshot
- System Health Summary

The old workflow engine anchors should remain reachable as hidden legacy anchors under the closest V28.7 daily-work item.

## Batch fix

Updated:

```text
data/v28.7-admin-navigation.ts
```

The `Urgent Action Queue` child now preserves:

```text
automation-notification-engine
internal-inbox
unified-task-engine
```

through `legacyFrom`.

Because `MenuAnchorSections` already renders `legacyFrom` as safe hidden fallback anchors, old V28.2 links remain compatible without adding visible menu clutter.

## Local log cleanup

Updated:

```text
.gitignore
```

Added:

```text
v28-7-validate*.log
```

This keeps local PowerShell validation logs out of Git status.

## Safety

- No production data changes.
- No Supabase reset.
- No RLS changes.
- No new top-level Automation menu.
- V28.7 simplified Dashboard menu remains unchanged visually.
- Old V28.2 workflow links remain reachable through hidden fallback anchors.

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
npm.cmd run validate:predeploy 2>&1 | Tee-Object -FilePath ".\v28-7-validate-predeploy-after-dashboard-anchor-fix.log"
```
