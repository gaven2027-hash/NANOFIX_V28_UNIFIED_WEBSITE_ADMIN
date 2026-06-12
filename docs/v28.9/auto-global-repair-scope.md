# NANOFIX V28.9 Auto Global Repair Scope

Date: 2026-06-12
Branch: `v28-9-auto-global-repair`

## Purpose

This scope starts the V28.9 compressed repair sprint. It increases automated coverage while keeping the V28.8 production baseline intact.

## Repair scope

The first V28.9 step covers:

- admin API route scan;
- customer and portal route scan;
- broad role/header pattern scan;
- broad Supabase query pattern scan;
- readiness endpoint coverage scan;
- final V28.8 document set coverage scan;
- route and workflow evidence scan;
- release command coverage scan.

## Files introduced in this step

- `tools/v28-9-auto-global-repair.mjs`
- `tools/verify-v28-9-auto-global-repair.mjs`
- `docs/v28.9/auto-global-repair-scope.md`

## Local command

```powershell
cd "C:\Users\Amelindo\Documents\NANOFIX_V28_UNIFIED_WEBSITE_ADMIN"
pwd
git status

node tools/v28-9-auto-global-repair.mjs
node tools/verify-v28-9-auto-global-repair.mjs
git status
```

## Quality rule

This step is only complete when:

- the auto global repair check returns `ok: true`;
- the verifier returns `ok: true`;
- failures are empty;
- local working tree is clean;
- Vercel Preview is Ready;
- production `/api/ready` remains healthy after merge.
