# NANOFIX V28.4.1 Batch Repair — Admin Menu Operations

Date: 2026-06-04
Branch target: `v28-4-1-batch-repair`
Production baseline: `v28.4-production-live-20260604`

## Repair Goal

Convert the admin first-level and second-level menu workspace from static explanation panels into real operational modules. All admin submenu entries now have a live operation surface with authenticated backend checks and write actions.

## Main Changes

### 1. New live submenu operation API

Added `app/api/admin/module-operations/route.ts`.

- Uses `requireActorApi()` for admin/operations/finance/content/support/engineer access.
- Resolves submenu hrefs from `data/adminNavigation.ts`.
- Checks mapped Supabase tables for each top-level route.
- Probes linked admin APIs with the current auth cookie/authorization header.
- Reads recent audit records.
- Writes audit logs on live reads and operations.
- Supports real write actions:
  - `record_audit_check`
  - `create_followup_task`
  - `api_probe`
  - `refresh_live_data`
- Creates follow-up records in `unified_tasks`.
- Records module operations into `entity_events` when available.

### 2. Replaced static submenu workspace

Replaced `components/AdminSubmoduleWorkspace.tsx`.

- Removed the old static reality/status workspace pattern.
- Every second-level menu item renders as an operation card.
- Each card has real buttons:
  - Refresh Live Data / 刷新实时数据
  - Write Audit Check / 写入审计
  - Create Follow-up Task / 新建跟进任务
  - Open Linked API / 打开关联接口
  - Open Main Workspace / 打开主模块
- URL hash navigation remains supported.
- If a page anchor is missing, the submenu scrolls to the operation card instead of showing a dead static page.

### 3. Redirect legacy static admin module pages

Replaced `app/admin/[module]/page.tsx`.

- Legacy `/admin/<module>` pages now redirect to the real workspace routes:
  - `/dashboard`
  - `/service-operations`
  - `/website-management`
  - `/social-media`
  - `/admin/advertising-center`
  - `/ai-intelligence`
  - `/customer-center`
  - `/system-settings`

### 4. Hidden non-operational backend descriptions

Adjusted shared admin UI containers:

- `components/PageHeader.tsx`
- `components/SectionCard.tsx`
- `components/AdminShell.tsx`
- `app/admin/page.tsx`
- `app/admin/advertising-center/page.tsx`

Visible backend explanatory paragraphs were removed or made screen-reader-only. The UI focuses on actual controls, data, tables, buttons, and operating cards.

### 5. Removed static production-rule panels

Removed visible static “Production rule / 生产规则” explanation blocks from Service Operations live workspaces, including assignment, job creation, inspection result, quotation, invoice, payment, quote acceptance bridge, and service request detail panels.

### 6. Advertising center no longer shows seeded fake data as live data

Updated `components/AdvertisingCenterWorkspace.tsx`.

- Initial state is empty, not seeded fallback data.
- If advertising tables are unavailable, the UI shows an unavailable state instead of showing sample campaigns as if they were real.
- Removed static workflow/menu/role explanatory sections.
- Kept real operations: refresh, create campaign draft, review/approve/takeover, connected accounts, and AI suggestion rows when live data exists.

### 7. AI draft output changed from placeholder contract to operational draft

Updated `app/api/admin/ai/drafts/route.ts`.

- Removed placeholder/contract wording.
- Generated draft output is now deterministic operational content based on task, module, risk and submitted input.
- Human review remains required before customer-facing use.

### 8. Linux build compatibility improvement

Converted shell files under `tools/*.sh` to LF line endings to avoid Linux build failures such as:

```text
set: -\r: invalid option
```

## Validation Completed in Sandbox

```text
npm install --ignore-scripts --no-audit --no-fund --prefer-offline -> PASS
npm run lint -> PASS, 0 errors, 26 existing warnings
npm run typecheck -> PASS
static grep for removed static phrases -> PASS
```

`npm run build:ci` started successfully but did not finish within the sandbox time limit during optimized Next.js production build. It did not report a code error before timeout. Run it locally before pushing/deploying.

## Required Local Verification Before GitHub Push

```powershell
npm install --ignore-scripts --no-audit --no-fund
npm run lint
npm run typecheck
npm run build:ci
npm run validate:predeploy
```

## Deployment Rule

Do not push directly to `main`. Commit this repair to `v28-4-1-batch-repair`, push the branch, verify Vercel Preview, then merge only after browser smoke test passes.

Do not reset Supabase production. Do not blindly run migration repair. Do not re-enable TypeScript or ESLint build bypass.
