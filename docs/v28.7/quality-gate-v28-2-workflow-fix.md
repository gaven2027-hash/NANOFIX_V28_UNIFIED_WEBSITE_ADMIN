# NANOFIX V28.7 Quality Gate V28.2 Workflow Fix

Date: 2026-06-11
Branch: v28-7-admin-menu-simplify

## Local failure

After the portal boundary verifier was fixed, `npm.cmd run validate:predeploy` advanced to:

```bash
npm run verify:v28-2-workflow
```

The V28.2 workflow verifier failed six admin navigation anchor checks:

- `/dashboard#automation-notification-engine`
- `/dashboard#internal-inbox`
- `/dashboard#unified-task-engine`
- `/system-settings#automation-rule-settings`
- `/system-settings#notification-channel-settings`
- `/system-settings#unified-task-sla-settings`

## Root cause

The V28.2 verifier still read only:

```text
data/adminNavigation.ts
```

V28.7 changed this file into a compatibility shim. The real menu source is now:

```text
data/v28.7-admin-navigation.ts
```

Legacy workflow anchors remain preserved through the V28.7 navigation configuration, but the old verifier could not see them.

## Batch fix

Updated:

```text
tools/verify-v28-2-workflow-engine.mjs
```

The verifier now checks the effective navigation source made of:

```text
data/adminNavigation.ts
data/v28.7-admin-navigation.ts
```

For each old V28.2 workflow anchor, it accepts either:

```text
/dashboard#automation-notification-engine
```

or the V28.7 legacy anchor form:

```text
'automation-notification-engine'
```

The verifier still rejects new first-level automation menus, so the 0-8 admin structure remains protected.

## Safety

- No production data changes.
- No Supabase reset.
- No RLS changes.
- No workflow feature weakening.
- Only the old verifier source path was updated to understand V28.7 navigation architecture.

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
npm.cmd run validate:predeploy 2>&1 | Tee-Object -FilePath ".\v28-7-validate-predeploy-after-v28-2-workflow-fix.log"
```
