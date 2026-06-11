# NANOFIX V28.8 Phase 2 — Service Requests Real Module Baseline

Date: 2026-06-11
Branch: `v28-8-phase-2-service-requests`
Base: post V28.8 Phase 1 merge commit `ead30fb35e9998e3ec1050c14e45e882d35670fa`

## Goal

Phase 2 starts the real business-module hardening sequence from the most important module: Service Requests / 报修单.

中文目标：从报修单开始深化真实业务模块，锁定官网报修、客户门户报修、后台 Service Operations、状态流转、审计日志、任务通知和生产健康表检查之间的闭环。

## Why Service Requests first

Service Requests are the entry point for the whole NANOFIX operating chain:

1. Website public repair request / 官网公开报修
2. Customer Portal repair or warranty repair request / 客户门户报修或保修维修申请
3. Service Operations review / 后台业务审核
4. Engineer inspection and repair execution / 工程师检测维修
5. Quotation / 报价
6. Invoice and payment / 发票与付款
7. Warranty / 保修
8. Customer review / 客户评价

If Service Requests are unstable, every downstream module becomes unstable.

## Locked Service Request chain

### 1. Public website request chain

The public repair request API must continue to:

- accept `new_repair` and `warranty_claim` request types;
- validate name and phone as required public contact fields;
- estimate priority from request content;
- reject storage fallback when Supabase is not configured;
- write real rows to:
  - `unified_intake`
  - `leads`
  - `service_requests`
- return `intakeId`, `leadId`, `serviceRequestId`, `bindingStatus`, and `priority`;
- write a public audit log without leaking sensitive full payload content.

### 2. Customer Portal request chain

The authenticated customer portal service request API must continue to:

- require a customer actor;
- require an active linked customer profile;
- list only the authenticated customer's own service requests;
- filter customer rows by `customer_id` and `request_origin = customer_portal`;
- accept `new_repair` and warranty repair requests;
- validate warranty ownership before creating warranty repair records;
- validate attachment URLs before accepting them;
- write real rows to:
  - `unified_intake`
  - `leads`
  - `service_requests`
- create an internal task and internal inbox message for operations;
- queue customer confirmation notification;
- write an audit log for the submission.

### 3. Admin Service Operations chain

The backend Service Operations API must continue to:

- allow internal read access for `super_admin`, `operations_admin`, `finance`, `support`, and `engineer`;
- allow write access only for `super_admin`, `operations_admin`, `finance`, and `support`;
- keep `engineer` out of general write roles unless a separate assigned-job engineer API handles that action;
- list `service_requests` with customer, lead, intake, contact, origin, warranty, attachments, notes, status, and binding fields;
- allow detail read for real UUID object IDs;
- allow admin creation of `service_request` records through the guarded API;
- allow field updates using a whitelist;
- use `transition_status_tx` RPC for status transitions;
- write audit logs and status transition logs.

### 4. Admin UI baseline

The Service Operations Live Core UI must continue to:

- show Service Requests / 报修请求 as a first-class group;
- read from `/api/admin/service-operations`;
- support create, detail, update, and status transition calls through the guarded API;
- show degraded state instead of crashing when API calls fail.

### 5. Production readiness baseline

The production `/api/ready` endpoint must continue to include the tables needed by Service Requests:

Core:

- `unified_intake`
- `leads`
- `service_requests`
- `customers`
- `jobs`
- `quotations`
- `invoices`
- `payments`
- `warranties`
- `warranty_claims`
- `unified_tasks`
- `task_events`
- `status_transition_logs`
- `audit_logs`

Optional but important:

- `notification_outbox`
- `internal_inbox_messages`
- `customer_record_links`

## Phase 2 command

Run this locally before opening or updating the PR:

```powershell
cd "C:\Users\Amelindo\Documents\NANOFIX_V28_UNIFIED_WEBSITE_ADMIN"
pwd
git status

npm.cmd run verify:v28-8-phase-2-service-requests
```

## Completion criteria

Phase 2 Service Requests baseline is complete when:

- the verifier passes locally;
- git status is clean;
- PR is opened from the repair branch;
- Vercel preview succeeds;
- PR is merged only after checks pass;
- production `/api/ready` stays healthy after merge.

## Next module after this phase

After Service Requests are locked, continue with:

1. Jobs / 工单
2. Quotations / 报价
3. Invoices / 发票
4. Payments / 付款
5. Warranties / 保修
6. Customer Reviews / 客户评价
7. Website Publish Approval / 网站发布审核
