# NANOFIX V28.7 Typecheck and Windows Build Fix

Date: 2026-06-11
Branch: v28-7-admin-menu-simplify

## Local validation errors received

PowerShell validation reported:

1. `tools/verify-v28-7-customer-portal-menu.mjs`
   - False failure: expected the literal string `type === 'engineer'` inside PortalShell.
   - Actual implementation uses `navForType(type)` with `engineerPortalNavigation`.

2. `npm.cmd run typecheck`
   - 15 errors in `app/api/admin/customer-review-links/route.ts`.
   - Existing `requireAdminApi()` returns `{ ok: false, response }` or `{ ok: true, role, actor }`.
   - New code incorrectly used `actor.error`, `actor.status`, and `actor.user.id`.
   - Existing `writeAuditLog()` accepts one payload argument, not `(supabase, payload)`.

3. `components/PortalShell.tsx`
   - TypeScript treated `'shortTitle' in link ? link.shortTitle : link.title` as `unknown` for React children.

4. `npm.cmd run build`
   - Windows local shell does not have `bash` installed.
   - `package.json` build script calls `bash tools/safe-next-build.sh`.

5. `git status`
   - Local untracked `.env.vercel.production` appeared.

## Batch fixes applied

### 1. Review link Admin API type fixes

Updated:

- `app/api/admin/customer-review-links/route.ts`

Fixes:

- returns `auth.response` when `requireAdminApi()` fails
- uses `auth.actor.authUserId` for created_by / updated_by
- uses `auth.actor.profileId` for audit actorId
- calls `writeAuditLog(payload)` with the existing audit helper signature
- uses a discriminated `PayloadResult` union to avoid undefined payload.error

### 2. PortalShell typing fix

Updated:

- `components/PortalShell.tsx`

Fixes:

- imports `CustomerPortalNavItem`
- adds `PortalLink` union type
- adds optional `shortTitle` / `shortZh` to engineer links
- adds `mobileTitle()` and `mobileZh()` helper functions returning strings

### 3. Verification script alignment

Updated:

- `tools/verify-v28-7-customer-portal-menu.mjs`

Fixes:

- no longer requires the literal `type === 'engineer'`
- verifies actual engineer support through `engineerPortalNavigation` and `EngineerPortalAnchors`

### 4. Windows build compatibility

Added:

- `bash.cmd`

Purpose:

- lets Windows PowerShell/CMD handle `npm.cmd run build`
- when npm calls `bash tools/safe-next-build.sh`, Windows resolves local `bash.cmd`
- the shim runs `npx.cmd next build`

Linux/Vercel behavior remains unchanged because they use real bash.

### 5. Local env secret protection

Updated:

- `.gitignore`

Adds:

- `.env.*`
- keeps `.env.example` and `.env*.example` allowed

This prevents `.env.vercel.production` from being accidentally committed.

## Updated PowerShell validation command

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

node tools/verify-v28-7-admin-menu.mjs
node tools/verify-v28-7-real-backend-foundation.mjs
node tools/verify-v28-7-customer-review-links.mjs
node tools/verify-v28-7-customer-portal-menu.mjs
node tools/verify-v28-7-prerelease-stability.mjs

npm.cmd run typecheck
npm.cmd run lint
npm.cmd run build
```
