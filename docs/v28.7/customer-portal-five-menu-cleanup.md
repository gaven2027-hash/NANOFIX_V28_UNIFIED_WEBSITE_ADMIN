# NANOFIX V28.7 Customer Portal Five-Menu Cleanup

Date: 2026-06-11
Branch: v28-7-admin-menu-simplify

## Goal

Simplify the customer-facing portal from many operational/internal links into five self-service menus that customers can understand and use daily.

## Final Customer Portal menus

1. Dashboard / 我的首页
2. My Repairs / 我的维修
3. Quotes & Payments / 报价与付款
4. Warranty & Documents / 保修与文件
5. Support & Account / 支持与账号

## What changed

- Added data/v28.7-customer-portal-navigation.ts as the single source of truth for customer portal navigation.
- Refactored components/PortalShell.tsx to render from customerPortalNavigation instead of hardcoded 13-item links.
- Added mobile bottom navigation with five tabs:
  - Home / 首页
  - Repairs / 维修
  - Payments / 付款
  - Warranty / 保修
  - Support / 客服
- Kept legacy anchors so old links do not break.
- Moved Leave a Review / 我要评论 into Support & Account while keeping a shortcut on the customer portal dashboard.

## Legacy anchor compatibility

Old anchors now map into the five simplified sections:

- customer-register, customer-login -> Dashboard
- submit-request, new-repair-request, warranty-claim, my-repair-requests -> My Repairs
- my-quotations, my-invoices, my-payments-receipts -> Quotes & Payments
- my-warranties -> Warranty & Documents
- submit-review-link, my-reviews, review-privacy-settings, my-profile -> Support & Account

## Verification

Added:

```bash
node tools/verify-v28-7-customer-portal-menu.mjs
```

The script checks:

- exactly five customer portal menus
- required English and Chinese menu labels
- old menu items are not visible as first-level customer menus
- legacy anchors are preserved
- Leave a Review remains available
- mobile five-tab navigation exists

## PR validation command set

```bash
node tools/verify-v28-7-admin-menu.mjs
node tools/verify-v28-7-real-backend-foundation.mjs
node tools/verify-v28-7-customer-review-links.mjs
node tools/verify-v28-7-customer-portal-menu.mjs
npm run typecheck
npm run lint
npm run build
```
