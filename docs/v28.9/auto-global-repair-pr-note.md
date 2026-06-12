# NANOFIX V28.9 Auto Global Repair PR Note

Date: 2026-06-12
Branch: `v28-9-auto-global-repair`
Target base: `main`

## Summary

This PR starts V28.9 Step 1 by expanding the automatic global scanner. It does not restart V28.8 documentation work.

## Change set

- Adds and enhances `tools/v28-9-auto-global-repair.mjs`.
- Adds and enhances `tools/verify-v28-9-auto-global-repair.mjs`.
- Adds V28.9 scope and static review documentation under `docs/v28.9/`.

## Coverage added

- Admin API route scan.
- Customer / portal route scan.
- AI Intelligence Center scan.
- Social Media Management scan.
- Advertising Center / campaign / promotion scan.
- Website Management / CMS / publish approval scan.
- Service Operations scan.
- Customer Portal scan.
- Role/header spoofing markers.
- Supabase `select("*")` broad query markers.
- Service-role key placement markers.
- Browser token / role storage markers.
- AI/social/ad direct publish bypass markers.
- Direct paid campaign activation bypass markers.
- Customer feedback auto-publish markers.
- `/api/ready` required and optional table coverage.
- V28.8 final document set coverage.

## Safety boundary

No production Supabase reset. No RLS disable. No production data mutation. No direct publish. No paid ad activation. No direct merge to `main`.

## Required local verification before Ready-for-review

```powershell
cd "C:\Users\Amelindo\Documents\NANOFIX_V28_UNIFIED_WEBSITE_ADMIN"
pwd
git status
git fetch origin
git checkout -B v28-9-auto-global-repair origin/v28-9-auto-global-repair
git status

node tools/v28-9-auto-global-repair.mjs
node tools/verify-v28-9-auto-global-repair.mjs
git status
```

## Merge gate

Do not merge unless:

- `node tools/v28-9-auto-global-repair.mjs` returns `ok: true`;
- `node tools/verify-v28-9-auto-global-repair.mjs` returns `ok: true`;
- failures are `[]`;
- local `git status` is clean;
- Vercel Preview is Ready;
- PR review confirms no runtime regression;
- production `/api/ready` is checked after merge.
