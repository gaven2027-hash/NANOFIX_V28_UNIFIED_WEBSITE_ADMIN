# NANOFIX V28 Final Backend UI Repair Report - 20260523

## Fixed items

1. **Right-side backend content title numbering**
   - Added the same first-level menu order label used in the left sidebar to the main content header.
   - Page title text now displays order prefixes such as `1. Dashboard, Analytics & Alerts`, `2. Service & Order Operations`, etc.
   - Submenu anchor cards now display parent menu order and child order labels such as `2.1`, `3.4`, etc.

2. **Left sidebar first-level menu expand / collapse**
   - The left first-level navigation sections remain full and are not reduced.
   - Each first-level section has a clear collapse/expand control with arrow and Chinese label: `收起 / 展开`.
   - Collapsed state hides only the child submenu items; the first-level menu entry remains visible.

3. **Admin login browser address bar logo / favicon**
   - Added explicit metadata for `/login` with favicon, PNG icon and Apple touch icon.
   - Root metadata already includes favicon links for the whole site; this repair makes the login route explicit.

## Verified commands

- npm ci
- npm audit --omit=dev
- npm run validate:predeploy
- npm run build:ci
- npm run verify
- npm run test:e2e:smoke

## Notes

- Backend and portal routes remain protected by middleware and redirect to `/login` when unauthenticated.
- API routes remain protected and return 401 when unauthenticated.
- Legacy visual-lock CSP still allows `unsafe-inline`; this was already accepted as a future pure-component rewrite item.
