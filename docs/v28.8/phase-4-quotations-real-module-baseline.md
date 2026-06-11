# NANOFIX V28.8 Phase 4 — Quotations Real Module Baseline

Date: 2026-06-11
Branch: `v28-8-phase-4-quotations`
Base: post V28.8 Phase 3 merge commit `f2acdff7c3a74ccd7fe6f748c6a9da99f29eebb8`

## Goal

Phase 4 continues the real business-module hardening sequence after Jobs. Quotations / 报价 is the commercial confirmation module that connects repair execution planning to customer acceptance, invoicing, payment and warranty.

中文目标：在报修单与工单基线完成后，锁定报价模块真实链路，包括报价记录、报价版本、报价 PDF、客户接受/拒绝/要求修改、后台修改再推送、付款意向、任务通知、权限边界与生产健康表检查。

## Why Quotations after Jobs

The expected chain is:

1. Service Request / 报修单
2. Job / 工单
3. Quotation / 报价
4. Quotation Version / 报价版本
5. Quotation PDF / 报价 PDF
6. Customer Response / 客户确认、拒绝或要求修改
7. Invoice / 发票
8. Payment / 付款
9. Warranty / 保修

If Quotations are unstable, the company cannot reliably convert inspections and repairs into approved commercial work.

## Locked Quotations chain

### 1. Admin Service Operations quotation chain

The backend Service Operations API must continue to:

- include `quotation` in the supported machines list;
- list `quotations` from the real `quotations` table;
- select `quotation_id`, `service_request_id`, `customer_id`, `version`, `total_amount`, `currency`, `status`, `created_at`, and `updated_at`;
- keep quotation writable fields whitelisted;
- create guarded draft quotation records;
- support detail, create, update and status patch flows through the guarded API;
- use `transition_status_tx` for quotation status transitions;
- write audit logs and status transition logs.

### 2. Customer Portal quote response chain

The customer quote response API must continue to:

- allow only the customer role;
- support `accepted`, `declined`, and `revision_requested` response types;
- load only quotations that are visible to the authenticated customer's linked jobs;
- load latest visible quotation PDF;
- write `quotation_customer_responses` for every customer response;
- require customer message when declining or requesting revision;
- create `quotation_acceptances` only when accepted;
- create `payment_intents` when accepted;
- update quotation approval status to customer accepted/declined/revision requested;
- create task, inbox and customer notification records;
- write audit logs.

### 3. Admin quote response revision chain

The admin quote response API must continue to:

- restrict read access to internal roles;
- restrict write access to super admin, operations and finance roles;
- read `quotation_customer_responses` with a field whitelist;
- support review and resolve actions;
- support `create_revised_quotation_version`;
- write a new `quotation_versions` row for revised quotations;
- update `quotations` to the next version, revised total and `revised_pending_customer` status;
- set revised quotation visible to customer;
- create task, inbox and customer notification records;
- write audit logs.

### 4. Quotation PDF chain

The quotation PDF API must continue to:

- run in Node runtime;
- generate PDF bytes server-side;
- load `document_company_settings`;
- load quotation and latest quotation version;
- write `quotation_pdf_documents`;
- upload PDF to Supabase Storage;
- update quotation `pdf_storage_path` and customer visibility fields;
- create task, inbox and notification records;
- write success/failure audit logs.

### 5. Customer Portal financial UI baseline

The customer financial UI must continue to:

- call `/api/customer-portal/quote-acceptance`;
- let customers accept, decline or request revision with a message;
- prevent customer-side editing of quotation or invoice content;
- avoid browser localStorage/sessionStorage workflow state.

### 6. Service Operations quotation UI baseline

The Service Operations UI must continue to include:

- quote response review/revision panel;
- quotation PDF generation panel;
- guarded API calls with same-origin credentials;
- no fake success and no browser storage workflow state.

### 7. Production readiness baseline

The production `/api/ready` endpoint must continue checking the tables needed by Quotations:

Core:

- `quotations`
- `quotation_versions`
- `quotation_acceptances`
- `quotation_customer_responses`
- `quotation_pdf_documents`
- `jobs`
- `invoices`
- `payments`
- `payment_intents`
- `warranties`
- `status_transition_logs`
- `audit_logs`
- `document_company_settings`

Optional but important:

- `unified_tasks`
- `task_events`
- `internal_inbox_messages`
- `notification_outbox`

## Phase 4 command

Run this locally before opening or updating the PR:

```powershell
cd "C:\Users\Amelindo\Documents\NANOFIX_V28_UNIFIED_WEBSITE_ADMIN"
pwd
git status

node tools/verify-v28-8-phase-4-quotations.mjs
```

## Completion criteria

Phase 4 Quotations baseline is complete when:

- the verifier passes locally;
- git status is clean;
- PR is opened from the repair branch;
- Vercel preview succeeds;
- PR is merged only after checks pass;
- production `/api/ready` stays healthy after merge.

## Next module after this phase

After Quotations are locked, continue with:

1. Invoices / 发票
2. Payments / 付款
3. Warranties / 保修
4. Customer Reviews / 客户评价
5. Website Publish Approval / 网站发布审核
