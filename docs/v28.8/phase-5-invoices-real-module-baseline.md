# NANOFIX V28.8 Phase 5 — Invoices Real Module Baseline

Date: 2026-06-11
Branch: `v28-8-phase-5-invoices`
Base: post V28.8 Phase 4 merge commit `6a485a041440361f9572a66faa9fe552ce553b5b`

## Goal

Phase 5 continues the real business-module hardening sequence after Quotations. Invoices / 发票 is the billing module that converts accepted quotation work into customer-visible payable records, invoice PDFs and payment linkage.

中文目标：在报价基线完成后，锁定发票模块真实链路，包括发票记录、发票 PDF、客户可见性、付款链接、客户门户展示、后台权限边界、状态流转、任务通知、审计日志和生产健康表检查。

## Why Invoices after Quotations

The expected business chain is:

1. Service Request / 报修单
2. Job / 工单
3. Quotation / 报价
4. Quotation Acceptance / 报价接受
5. Invoice / 发票
6. Invoice PDF / 发票 PDF
7. Payment / 付款
8. Warranty / 保修

If Invoices are unstable, accepted quotations cannot become payable customer documents and downstream payment/warranty automation will be unreliable.

## Locked Invoices chain

### 1. Admin Service Operations invoice chain

The backend Service Operations API must continue to:

- include `invoice` in the supported machines list;
- list `invoices` from the real `invoices` table;
- select `invoice_id`, `invoice_no`, `customer_id`, `job_id`, `quotation_id`, `total_amount`, `currency`, `status`, `visible_to_customer`, and `created_at`;
- keep invoice writable fields whitelisted;
- create guarded draft invoice records;
- support detail, create, update and status patch flows through the guarded API;
- use `transition_status_tx` for invoice status transitions;
- write audit logs and status transition logs.

### 2. Invoice PDF chain

The invoice PDF API must continue to:

- run in Node runtime;
- build PDF bytes server-side;
- load invoice and invoice items;
- load document company settings;
- write `invoice_pdf_documents`;
- upload PDF into Supabase Storage `service-uploads`;
- update invoice `pdf_storage_path`, `visible_to_customer`, `customer_visible_at`, and `customer_visible_by`;
- create task and task event records;
- create internal inbox message records;
- queue customer notifications when invoice is visible to customer;
- write success/failure audit logs.

### 3. Customer Portal invoice visibility baseline

The Customer Portal financial API must continue to:

- allow customer access through authenticated actor checks;
- resolve active customers for the logged-in profile;
- resolve job IDs through customer-owned service requests and direct customer jobs;
- load only invoices linked to customer job IDs;
- require `visible_to_customer = true`;
- create signed download URLs for invoice PDF paths;
- load related payments from visible invoices;
- write a customer financial read audit log.

### 4. Customer Portal financial UI baseline

The customer financial UI must continue to:

- call `/api/customer-portal/financial`;
- show Invoices / 发票 as a first-class section;
- show customer-visible invoice PDF download buttons when available;
- show payment links when available;
- prevent customer-side editing of quotation, invoice, warranty or payment content;
- avoid browser localStorage/sessionStorage workflow state.

### 5. Service Operations invoice UI baseline

The Service Operations UI must continue to include:

- Invoices / 发票 as a first-class group in the live core board;
- `machine: invoice`;
- `idField: invoice_id`;
- `statusField: status`;
- `nextStatus: sent`;
- invoice PDF generation panel;
- guarded API calls with same-origin credentials;
- degraded/error state handling.

### 6. Full-chain baseline

The Service Operations full-chain API must continue to:

- read `invoices` from the real `invoices` table;
- link invoices to jobs by `job_id`;
- link invoices to quotations by `quotation_id`;
- link payments to invoices by `invoice_id`;
- link warranties to invoices by `invoice_id`;
- include invoice presence in chain completeness;
- remain read-only for business records;
- write a read audit log.

### 7. Production readiness baseline

The production `/api/ready` endpoint must continue checking the tables needed by Invoices:

Core:

- `invoices`
- `invoice_pdf_documents`
- `payments`
- `payment_intents`
- `payment_webhook_events`
- `payment_checkout_sessions`
- `jobs`
- `quotations`
- `quotation_acceptances`
- `warranties`
- `status_transition_logs`
- `audit_logs`
- `document_company_settings`

Optional but important:

- `unified_tasks`
- `task_events`
- `internal_inbox_messages`
- `notification_outbox`

## Phase 5 command

Run this locally before opening or updating the PR:

```powershell
cd "C:\Users\Amelindo\Documents\NANOFIX_V28_UNIFIED_WEBSITE_ADMIN"
pwd
git status

node tools/verify-v28-8-phase-5-invoices.mjs
```

## Completion criteria

Phase 5 Invoices baseline is complete when:

- the verifier passes locally;
- git status is clean;
- PR is opened from the repair branch;
- Vercel preview succeeds;
- PR is merged only after checks pass;
- production `/api/ready` stays healthy after merge.

## Next module after this phase

After Invoices are locked, continue with:

1. Payments / 付款
2. Warranties / 保修
3. Customer Reviews / 客户评价
4. Website Publish Approval / 网站发布审核
