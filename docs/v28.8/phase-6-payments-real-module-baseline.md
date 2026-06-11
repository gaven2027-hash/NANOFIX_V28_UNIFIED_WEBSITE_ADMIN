# NANOFIX V28.8 Phase 6 — Payments Real Module Baseline

Date: 2026-06-11
Branch: `v28-8-phase-6-payments`
Base: post V28.8 Phase 5 merge commit `c1fadd9d0baefdb850500a1775af49a525c49f95`

## Goal

Phase 6 continues the real business-module hardening sequence after Invoices. Payments / 付款 is the settlement module that connects customer-visible invoices to payment intents, checkout sessions, webhook reconciliation, payment records and downstream warranty status.

中文目标：在发票基线完成后，锁定付款模块真实链路，包括 payment_intents、payment_checkout_sessions、payment_webhook_events、payments、payment_transactions、客户付款入口、后台财务操作、Webhook 对账、任务通知、审计日志和生产健康表检查。

## Why Payments after Invoices

The expected business chain is:

1. Service Request / 报修单
2. Job / 工单
3. Quotation / 报价
4. Quotation Acceptance / 报价接受
5. Invoice / 发票
6. Invoice PDF / 发票 PDF
7. Payment Intent / 付款意图
8. Checkout Session / 付款链接
9. Payment Webhook / 付款回调
10. Payment / 付款记录
11. Warranty / 保修

If Payments are unstable, customers cannot reliably pay, Finance cannot reconcile payments, and warranty automation cannot safely depend on paid invoices.

## Locked Payments chain

### 1. Admin Service Operations payment chain

The backend Service Operations API must continue to:

- include `payment` in the supported machines list;
- list `payments` from the real `payments` table;
- select `payment_id`, `invoice_id`, `customer_id`, `amount`, `currency`, `status`, `reconciled_at`, and `created_at`;
- keep payment writable fields whitelisted;
- create guarded processing payment records;
- support detail, create, update and status patch flows through the guarded API;
- use `transition_status_tx` for payment status transitions;
- write audit logs and status transition logs.

### 2. Payment Intent chain

The admin payment intent API must continue to:

- allow internal read roles;
- restrict writes to super admin, operations and finance;
- read from `payment_intents` with field whitelist;
- support `pending_invoice`, `pending_payment_link`, `ready`, `paid`, `cancelled`, and `failed` statuses;
- require `payment_url` when status is `ready`;
- write provider and provider external ID;
- link invoice to payment intent and payment URL;
- queue customer notification when status changes;
- write audit logs.

The customer payment intent API must continue to:

- allow only customer role;
- resolve active customer IDs for the profile;
- read only payment intents for those customers;
- expose status, provider, payment URL and invoice link;
- write customer read audit logs.

### 3. Checkout Session chain

The checkout session API must continue to:

- allow internal read roles;
- restrict writes to super admin, operations and finance;
- write `payment_checkout_sessions`;
- support `manual`, `stripe`, and `hitpay` providers;
- require manual `payment_url` for manual provider;
- keep Stripe/HitPay live adapters guarded until provider signing is implemented;
- never mark payments as paid during checkout link creation;
- update payment intent with checkout session ID, provider, provider external ID, payment URL and `ready` status;
- update invoice payment URL when invoice is linked;
- queue customer notification when payment link is ready;
- write success/failure audit logs.

### 4. Payment Webhook reconciliation chain

The payment webhook API must continue to:

- require webhook secret or HMAC verification;
- parse provider, provider event ID, provider external ID, invoice ID, payment intent ID, status, amount and currency;
- insert `payment_webhook_events` first;
- treat duplicate provider events as idempotent success;
- find payment intent by payment intent ID, provider external ID or invoice ID;
- map provider status to internal payment status;
- update `payment_intents`;
- insert or update `payments`;
- write `payment_transactions`;
- update invoice status to paid or failed/cancelled status;
- create finance task, task event and inbox message;
- queue customer notification;
- write reconciled, unmatched and failed audit logs.

### 5. Customer Portal payment UI baseline

The Customer Portal payment UI must continue to:

- call `/api/customer-portal/payment-intents`;
- show Payment Intent Status / 付款意图状态;
- show invoice and provider information;
- show `Pay Now / 立即付款` only when status is `ready` and `payment_url` exists;
- avoid browser localStorage/sessionStorage workflow state.

### 6. Service Operations payment UI baseline

The Service Operations UI must continue to include:

- Payment Intent Admin Panel;
- Checkout Session Generator;
- same-origin guarded requests;
- no fake paid status from checkout link generation;
- no browser storage workflow state.

### 7. Full-chain baseline

The Service Operations full-chain API must continue to:

- read `payments` from the real `payments` table;
- link payments to invoices by `invoice_id`;
- include payment presence in chain completeness;
- remain read-only for business records;
- write a read audit log.

### 8. Production readiness baseline

The production `/api/ready` endpoint must continue checking the tables needed by Payments:

Core:

- `payments`
- `payment_intents`
- `payment_webhook_events`
- `payment_checkout_sessions`
- `invoices`
- `invoice_pdf_documents`
- `jobs`
- `quotations`
- `quotation_acceptances`
- `warranties`
- `status_transition_logs`
- `audit_logs`

Optional but important:

- `unified_tasks`
- `task_events`
- `internal_inbox_messages`
- `notification_outbox`

## Phase 6 command

Run this locally before opening or updating the PR:

```powershell
cd "C:\Users\Amelindo\Documents\NANOFIX_V28_UNIFIED_WEBSITE_ADMIN"
pwd
git status

node tools/verify-v28-8-phase-6-payments.mjs
```

## Completion criteria

Phase 6 Payments baseline is complete when:

- the verifier passes locally;
- git status is clean;
- PR is opened from the repair branch;
- Vercel preview succeeds;
- PR is merged only after checks pass;
- production `/api/ready` stays healthy after merge.

## Next module after this phase

After Payments are locked, continue with:

1. Warranties / 保修
2. Customer Reviews / 客户评价
3. Website Publish Approval / 网站发布审核
4. Backup & Recovery / 备份与恢复
