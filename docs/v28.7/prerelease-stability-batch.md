# NANOFIX V28.7 Prerelease Stability Batch

Date: 2026-06-11
Branch: v28-7-admin-menu-simplify

## Goal

Run one combined stability pass before Draft PR instead of making scattered small fixes.

## Search / scan findings

The global search index did not return reliable file hits, so this batch used direct high-risk file checks against portal, review link and V28.7 verification files.

A build-risk issue was identified:

- app/portal/engineer/page.tsx imports EngineerPortalAnchors and uses <PortalShell type="engineer">.
- The customer portal cleanup had narrowed PortalShell to customer-only support.
- This would likely break typecheck/build because EngineerPortalAnchors was missing and type="engineer" was not accepted.

## Batch fixes applied

### 1. PortalShell customer / engineer compatibility

Updated components/PortalShell.tsx:

- keeps customer portal five-menu cleanup
- restores type support for both customer and engineer
- restores engineerPortalNavigation
- exports EngineerPortalAnchors
- keeps CustomerPortalAnchors
- renders Leave a Review shortcut only for customer mode
- keeps mobile five-tab navigation

### 2. Customer portal verification strengthened

Updated tools/verify-v28-7-customer-portal-menu.mjs:

- verifies customer portal exactly five visible menus
- verifies old customer portal links are preserved as legacy anchors
- verifies Leave a Review remains available
- verifies PortalShell still supports engineer mode
- verifies EngineerPortalAnchors is exported when app/portal/engineer imports it

### 3. Prerelease stability guardrail added

Added tools/verify-v28-7-prerelease-stability.mjs:

- verifies required V28.7 files exist
- verifies adminNavigation shim points to v28.7 navigation
- verifies customer portal exactly five menus
- verifies customer and engineer portal exports
- verifies customer review link settings and APIs
- verifies active-only customer review link exposure
- verifies migration safety guardrails: no RLS disable, no drop, no truncate, no production delete
- verifies required V28.7 validation scripts exist

## Commands for PowerShell

```powershell
node tools/verify-v28-7-admin-menu.mjs
node tools/verify-v28-7-real-backend-foundation.mjs
node tools/verify-v28-7-customer-review-links.mjs
node tools/verify-v28-7-customer-portal-menu.mjs
node tools/verify-v28-7-prerelease-stability.mjs
npm run typecheck
npm run lint
npm run build
```

## Status

Ready for local PowerShell validation. Do not open PR until the commands above pass or the reported errors are batch-fixed.
