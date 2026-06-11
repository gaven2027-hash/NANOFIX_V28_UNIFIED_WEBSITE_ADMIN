# NANOFIX V28.8 Phase 3 — Jobs Real Module Baseline

Date: 2026-06-11
Branch: `v28-8-phase-3-jobs`
Base: post V28.8 Phase 2 merge commit `4d060ff138d5fc57bbd8f5a3b4795720fd343721`

## Goal

Phase 3 continues the real business-module hardening sequence after Service Requests. Jobs / 工单 is the first execution module after a repair request has entered Service Operations.

中文目标：在报修单真实链路完成后，锁定工单模块的真实基础，包括报修单到工单、派单、工程师边界、状态流转、全链路连接和生产健康表检查。

## Why Jobs after Service Requests

A service request is the customer or public entry point. A job is the operational execution record.

The expected business chain is:

1. Service Request / 报修单
2. Job / 工单
3. Engineer assignment / 工程师派单
4. Inspection and repair execution / 检测维修执行
5. Quotation / 报价
6. Invoice / 发票
7. Payment / 付款
8. Warranty / 保修

If Jobs are not stable, the system cannot reliably move from customer intake into actual repair execution.

## Locked Jobs chain

### 1. Admin Service Operations job chain

The backend Service Operations API must continue to:

- include `job` in the supported machines list;
- list `jobs` from the real `jobs` table;
- select `job_id`, `service_request_id`, `quotation_id`, `customer_id`, `engineer_id`, `status`, `scheduled_at`, `notes`, `created_at`, and `updated_at`;
- keep `job` writable fields whitelisted;
- allow admin/operations/support/finance general writes, but not customer or general engineer writes;
- allow creation of job records through the guarded API;
- allow field updates through the guarded API;
- require valid UUID object IDs for detail/update/status operations;
- write audit logs for detail, create, update, and status patch actions;
- use `transition_status_tx` for status transitions.

### 2. Engineer boundary baseline

The general Service Operations write role list must not include `engineer`.

Engineer role may retain assigned-job permissions in the RBAC map:

- `job.assigned.read`
- `job.assigned.update`

This means general admin writes stay protected, while a separate assigned-job engineer flow can be built or verified without giving engineers broad backend write access.

### 3. Service Operations UI baseline

The Service Operations Live Core UI must continue to:

- expose Jobs / 工单 as a first-class group;
- use `machine: job`;
- identify rows by `job_id`;
- show status field as `status`;
- transition Jobs toward `en_route` from the board;
- call `/api/admin/service-operations` for read, detail, create, update, and status patch flows;
- show degraded state instead of crashing when API calls fail.

### 4. Full-chain baseline

The Service Operations full-chain API must continue to:

- read `service_requests`, `jobs`, `quotations`, `invoices`, `payments`, `warranties`, and `status_transition_logs`;
- link jobs to service requests by `service_request_id`;
- link invoices and warranties through `job_id`, quotation, and invoice references;
- report `orphan_jobs` when jobs are not connected to known service requests;
- validate out-of-window service request references before reporting orphan jobs;
- remain read-only for business records;
- write a read audit log.

### 5. Production readiness baseline

The production `/api/ready` endpoint must continue checking the tables needed by Jobs:

Core:

- `service_requests`
- `jobs`
- `service_inspections`
- `service_upload_reviews`
- `quotations`
- `invoices`
- `payments`
- `warranties`
- `status_transition_logs`
- `audit_logs`

Optional but important:

- `internal_inbox_messages`
- `notification_outbox`

## Phase 3 command

Run this locally before opening or updating the PR:

```powershell
cd "C:\Users\Amelindo\Documents\NANOFIX_V28_UNIFIED_WEBSITE_ADMIN"
pwd
git status

npm.cmd run verify:v28-8-phase-3-jobs
```

## Completion criteria

Phase 3 Jobs baseline is complete when:

- the verifier passes locally;
- git status is clean;
- PR is opened from the repair branch;
- Vercel preview succeeds;
- PR is merged only after checks pass;
- production `/api/ready` stays healthy after merge.

## Next module after this phase

After Jobs are locked, continue with:

1. Quotations / 报价
2. Invoices / 发票
3. Payments / 付款
4. Warranties / 保修
5. Customer Reviews / 客户评价
6. Website Publish Approval / 网站发布审核
