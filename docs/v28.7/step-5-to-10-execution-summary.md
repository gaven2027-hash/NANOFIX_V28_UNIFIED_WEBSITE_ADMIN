# NANOFIX V28.7 Admin Simplification Step 5 to 10

Date: 2026-06-11
Branch: v28-7-admin-menu-simplify

## Completed in this batch

1. Continued from Step 5 after the simplified V28.7 navigation was installed.
2. Updated MenuAnchorSections so simplified submenu entries can keep old anchors through legacyFrom.
3. Removed the previous system-settings diagnostic skip so System Settings can also expose V28.7 fallback anchors.
4. Added tools/verify-v28-7-admin-menu.mjs to check simplified menu counts, bilingual labels, re-export wiring, legacy anchor support and current-menu-map structure.
5. Refactored WebsiteManagementWorkspace to display the eight V28.7 Website Management entries directly:
   - Navigation & Homepage
   - Service Pages
   - Track Record & Warranty
   - Guide, FAQ & Tips
   - Forms & Submissions
   - Media Library
   - SEO / AEO & Analytics
   - Preview / Publish / Version
6. Website Management quick actions now point to the simplified V28.7 anchors rather than old scattered anchors.
7. The existing live CMS core remains in place, so the current Supabase-connected CMS page/block/status functions are not removed.

## Validation status

This batch adds a dedicated verification script:

```bash
node tools/verify-v28-7-admin-menu.mjs
```

The normal predeployment checks still need to be run from a local or CI environment with dependencies installed:

```bash
npm run typecheck
npm run lint
npm run build
```

## Files changed in Step 5 to 10

- components/MenuAnchorSections.tsx
- components/WebsiteManagementWorkspace.tsx
- tools/verify-v28-7-admin-menu.mjs
- docs/v28.7/step-5-to-10-execution-summary.md

## Next batch

Proceed to Step 11 to 15:

1. Begin Service and Customer real business chain repair.
2. Prepare API Credential Center structure.
3. Continue WhatsApp, Social and Ads integration staging.
4. Prepare Video Engine schema and rules.
5. Run full E2E, API smoke, Supabase and Vercel checks before PR and production merge.
