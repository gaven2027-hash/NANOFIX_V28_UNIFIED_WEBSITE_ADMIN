# NANOFIX V28.8 Phase 8 — Customer Reviews & Feedback Real Module Baseline

Date: 2026-06-11
Branch: `v28-8-phase-8-customer-reviews`
Base: post V28.8 Phase 7 merge commit `1be9ab9dc78fa2d6f497b8e0ce39633d18e05b5f`

## Goal

Phase 8 continues the real business-module hardening sequence after Warranties. Customer Reviews / 客户评价 is treated as the controlled customer feedback layer before any public publishing, testimonial reuse, service recovery or AI/social promotion workflow.

中文目标：在保修基线完成后，锁定客户评价与反馈真实链路，包括客户单据反馈、后台审核、客户不能直接修改报价/发票/保修/付款文件、满意度回访、保修索赔不满意跟进、任务通知、审计日志和生产健康表检查。

## Why Customer Reviews after Warranties

The expected post-service customer chain is:

1. Service Request / 报修单
2. Job / 工单
3. Quotation / 报价
4. Invoice / 发票
5. Payment / 付款
6. Warranty / 保修
7. Warranty Claim / 保修索赔
8. Customer Feedback / 客户反馈
9. Customer Satisfaction Follow-up / 满意度回访
10. Admin Review / 后台审核
11. Future Public Review / 后续公开评价或案例引用

If Customer Reviews are unstable, customers may edit official documents directly, negative feedback may not reach operations, and public content workflows may accidentally publish unreviewed customer comments.

## Locked Customer Reviews & Feedback chain

### 1. Customer document feedback baseline

The Customer Portal document feedback API must continue to:

- allow only customer role;
- support document types `quotation`, `invoice`, `warranty`, `payment`, and `other`;
- support feedback types `comment`, `change_request`, `dispute`, and `clarification`;
- resolve active customer profile;
- verify document ownership for quotations, invoices and warranties;
- prevent direct customer edits to official quotation, invoice, payment or warranty documents;
- insert real `customer_document_feedback` rows;
- create task and internal inbox records;
- queue customer confirmation notification;
- write customer submit/read audit logs.

### 2. Customer feedback UI baseline

The Customer Portal feedback UI must continue to:

- call `/api/customer-portal/document-feedback`;
- expose `Feedback on Quotation, Invoice or Warranty`;
- clearly tell customers that they cannot edit quotations, invoices or warranty documents directly;
- let customers submit comment/change request/clarification/dispute;
- display customer’s own feedback history;
- display admin response when available;
- avoid browser localStorage/sessionStorage workflow state.

### 3. Service Operations feedback review baseline

The admin feedback review API must continue to:

- allow internal read roles;
- restrict write to super admin, operations, finance and support;
- read real `customer_document_feedback` rows;
- support review statuses `reviewing`, `resolved`, `rejected`, and `superseded`;
- update internal response, reviewed_by and reviewed_at;
- create task records for follow-up;
- queue customer notification when reviewed;
- write read/review audit logs.

The admin feedback review UI must continue to:

- call `/api/admin/service-operations/customer-document-feedback`;
- show latest feedback;
- support selecting feedback and saving review response;
- warn that document content must be changed only through Quotation PDF / Invoice PDF / Warranty template modules;
- avoid browser localStorage/sessionStorage workflow state.

### 4. Warranty satisfaction follow-up baseline

The warranty satisfaction follow-up API must continue to:

- allow internal read roles;
- restrict write to super admin, operations and support;
- read customer-submitted warranty claim satisfaction from `service_requests`;
- filter not_satisfied / reopened / satisfied claims;
- read recent `warranty_claim_messages`;
- reject invalid service request IDs;
- restrict follow-up actions to not_satisfied or reopened warranty claims;
- update warranty claim next action and routing status;
- insert customer-visible or internal-only reply messages;
- create task, task event and internal inbox records;
- queue customer notification for visible replies;
- write read/submit audit logs.

### 5. Warranty satisfaction follow-up UI baseline

The Service Operations satisfaction follow-up UI must continue to:

- call `/api/admin/service-operations/warranty-claim-satisfaction`;
- prioritise not_satisfied warranty claims;
- show satisfaction rating, confirmation and reopen status;
- allow internal follow-up status changes;
- allow customer-visible replies and internal notes;
- clearly state that follow-up does not edit quotations, invoices, warranties or payments;
- avoid browser localStorage/sessionStorage workflow state.

### 6. Service Operations page mounting baseline

The Service Operations page must continue mounting:

- `ServiceOperationsCustomerDocumentFeedbackPanel`;
- `ServiceOperationsWarrantyClaimSatisfactionFollowupPanel`;
- `ServiceOperationsWarrantySatisfactionNotificationRulesPanel`;
- `ServiceOperationsWarrantySatisfactionAuditTrailPanel`.

### 7. Production readiness baseline

The production `/api/ready` endpoint must continue checking the tables needed by the controlled feedback/review chain:

Core:

- `customer_document_feedback`
- `customer_portal_requests`
- `warranty_claims`
- `service_requests`
- `warranties`
- `jobs`
- `customers`
- `unified_tasks`
- `task_events`
- `audit_logs`

Optional but important:

- `notification_outbox`
- `internal_inbox_messages`
- `app_modules`

## Public review safety rule

Phase 8 does not publish customer reviews publicly. Customer comments, disputes, warranty satisfaction records and document feedback must remain internal/customer-visible until an explicit future Website Publish Approval / Social Publish Approval workflow approves public reuse.

中文规则：Phase 8 只锁定客户反馈与内部处理，不自动发布公开评论。任何客户原话、案例评价、Google/Facebook/官网展示内容，必须等后续 Website Publish Approval / Social Publish Approval 审核链路完成后才可公开使用。

## Phase 8 command

Run this locally before opening or updating the PR:

```powershell
cd "C:\Users\Amelindo\Documents\NANOFIX_V28_UNIFIED_WEBSITE_ADMIN"
pwd
git status

node tools/verify-v28-8-phase-8-customer-reviews.mjs
```

## Completion criteria

Phase 8 Customer Reviews baseline is complete when:

- the verifier passes locally;
- git status is clean;
- PR is opened from the repair branch;
- Vercel preview succeeds;
- PR is merged only after checks pass;
- production `/api/ready` stays healthy after merge.

## Next module after this phase

After Customer Reviews / Feedback are locked, continue with:

1. Website Publish Approval / 网站发布审核
2. Backup & Recovery / 备份与恢复
3. AI / Social / Advertising production-safe content loop
4. System Health & Release Gate hardening
