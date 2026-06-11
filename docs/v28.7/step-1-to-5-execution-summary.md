# NANOFIX V28.7 Admin Menu Simplification Step 1 to 5

Date: 2026-06-11
Branch: v28-7-admin-menu-simplify
Base commit: 0168ae9179bdffee27b221e26aa779d106cb6565

## Completed

1. Created the working branch v28-7-admin-menu-simplify.
2. Scanned the current admin menu source. The sidebar reads data/adminNavigation.ts through components/AdminShell.tsx.
3. Confirmed the current module pages: admin, dashboard, website management, service operations, customer center, social media, advertising center, AI intelligence, and system settings.
4. Added docs/v28.7/current-menu-map.json as the old-to-new menu merge map.
5. Added data/v28.7-admin-navigation.ts as the simplified V28.7 backend menu.
6. Updated data/adminNavigation.ts to re-export the simplified V28.7 menu.

## Before and after child counts

- Admin Home: 6 to 4
- Dashboard: 12 to 6
- Website Management: 21 to 8
- Service and Order Operations: 25 to 9
- Customer Center: 29 to 8
- Social Media Management: 16 to 8
- Advertising and Promotion Center: 19 to 8
- AI Intelligence Center: 17 to 7
- System Settings: 30 to 8

## Next batch

Continue Step 5 to Step 10: verify rendering and click chain, add old anchor fallback handling where needed, check bilingual labels on desktop and mobile sidebar, run typecheck, lint and build when execution environment is available, then begin Website CMS real editing repair.
