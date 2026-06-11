# NANOFIX V28.8 Phase 7 — Warranties Real Module Baseline

Date: 2026-06-11
Branch: `v28-8-phase-7-warranties`
Base: post V28.8 Phase 6 merge commit `201990acad3ec9bec840f19512b32140cbd57864`

## Goal

Phase 7 continues the real business-module hardening sequence after Payments. Warranties / 保修 is the post-payment assurance module that connects completed jobs, invoices and payments to customer-visible warranty records, warranty PDFs, warranty claims and downstream support operations.

中文目标：在付款基线完成后，锁定保修模块真实链路，包括 warranties、warranty_pdf_documents、warranty_claims、客户可见性、客户 PDF 签名下载、后台保修 PDF 生成、保修索赔入口、任务通知、审计日志和生产健康表检查。

## Why Warranties after Payments

The expected business chain is:

1. Service Request / 报修单
2. Job / 工单
3. Quotation / 报价
4. Quotation Acceptance / 报价接受
5. Invoice / 发票
6. Payment / 付款
7. Warranty / 保修
8. Warranty PDF / 保修单 PDF
9. Warranty Claim / 保修索赔
10. Support / 后续支持

If Warranties are unstable, customers cannot reliably access warranty certificates, internal operations cannot verify warranty claims, and after-sales support cannot depend on official warranty records.

## Locked Warranties chain

### 1. Admin Service Operations warranty chain

The backend Service Operations API must continue to:

- include `warranty` in the supported machines list;
- list `warranties` from the real `warranties` table;
- select `warranty_id`, `job_id`, `customer_id`, `invoice_id`, `quotation_id`, `status`, `coverage`, `starts_on`, `ends_on`, `visible_to_customer`, `public_ref`, and `created_at`;
- keep warranty writable fields whitelisted;
- create guarded draft warranty records;
- support detail, create, update and status patch flows through the guarded API;
- use `transition_status_tx` for warranty status transitions;
- write audit logs and status transition logs.

### 2. Warranty PDF chain

The warranty PDF API must continue to:

- run in Node runtime;
- build PDF bytes server-side;
- load warranty record from `warranties`;
- load document company settings from `document_company_settings`;
- write `warranty_pdf_documents`;
- upload PDF into Supabase Storage `service-uploads`;
- update warranty `pdf_storage_path`, `pdf_generated_at`, `pdf_generated_by`, `visible_to_customer`, `customer_visible_at`, `customer_visible_by`, `customer_visibility_notes`, and `public_ref`;
- create task and task event records;
- create internal inbox message records;
- queue customer notification when visible to customer;
- write success/failure audit logs.

### 3. Customer Portal warranty visibility baseline

The Customer Portal warranty API must continue to:

- allow only customer role;
- resolve active customers for the logged-in profile;
- read only warranties linked to the authenticated customer;
- require `visible_to_customer = true`;
- read only `warranty_pdf_documents` linked to those warranties and customers;
- require PDF documents to be customer-visible;
- require PDF generation status to be generated/uploaded;
- create short-lived signed download URLs from Supabase Storage;
- write a customer warranty read audit log.

### 4. Customer Portal warranty UI baseline

The Customer Portal warranty UI must continue to:

- expose `/customer-portal/warranties` as the Warranty Centre;
- call `/api/customer-portal/warranties`;
- show only customer-visible warranties;
- show only customer-visible warranty PDF download links;
- use short-lived signed links;
- avoid browser localStorage/sessionStorage workflow state.

### 5. Service Operations warranty UI baseline

The Service Operations UI must continue to include:

- Warranties / 保修 as a first-class group in the live core board;
- `machine: warranty`;
- `idField: warranty_id`;
- `statusField: status`;
- `nextStatus: active`;
- Warranty PDF generation panel;
- warranty claim review/routing/message/attachment/closure/follow-up panels;
- guarded same-origin API calls;
- no browser localStorage/sessionStorage workflow state.

### 6. Warranty claim and support baseline

The Service Operations page must continue mounting warranty claim panels:

- claim review;
- claim routing;
- claim message reply;
- claim attachment review;
- claim closure;
- satisfaction follow-up;
- satisfaction notification rules;
- satisfaction audit trail.

The production `/api/ready` endpoint must continue checking `warranty_claims` so the warranty claim module cannot silently disappear from production readiness.

### 7. Full-chain baseline

The Service Operations full-chain API must continue to:

- read `warranties` from the real `warranties` table;
- link warranties to jobs by `job_id`;
- link warranties to quotations by `quotation_id`;
- link warranties to invoices by `invoice_id`;
- include warranty presence in chain completeness;
- remain read-only for business records;
- write a read audit log.

### 8. Production readiness baseline

The production `/api/ready` endpoint must continue checking the tables needed by Warranties:

Core:

- `warranties`
- `warranty_pdf_documents`
- `warranty_claims`
- `jobs`
- `quotations`
- `invoices`
- `payments`
- `customers`
- `status_transition_logs`
- `audit_logs`
- `document_company_settings`

Optional but important:

- `unified_tasks`
- `task_events`
- `internal_inbox_messages`
- `notification_outbox`

## Phase 7 command

Run this locally before opening or updating the PR:

```powershell
cd "C:\Users\Amelindo\Documents\NANOFIX_V28_UNIFIED_WEBSITE_ADMIN"
pwd
git status

node tools/verify-v28-8-phase-7-warranties.mjs
```

## Completion criteria

Phase 7 Warranties baseline is complete when:

- the verifier passes locally;
- git status is clean;
- PR is opened from the repair branch;
- Vercel preview succeeds;
- PR is merged only after checks pass;
- production `/api/ready` stays healthy after merge.

## Next module after this phase

After Warranties are locked, continue with:

1. Customer Reviews / 客户评价
2. Website Publish Approval / 网站发布审核
3. Backup & Recovery / 备份与恢复
4. AI / Social / Advertising production-safe content loop
