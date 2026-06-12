# NANOFIX V28.8 Phase 13 — Final Release Gate Checklist

Date: 2026-06-12
Branch: `v28-8-phase-13-final-release-gate-checklist`
Base: post V28.8 Phase 12 merge commit `8e009fae50691df42012276ec3da5d43056044f5`

## Goal

Phase 13 consolidates the final V28.8 release gate checklist after the system health and release gate baseline. It does not add runtime behavior. It records the minimum evidence required before the V28.8 work can be treated as release-ready.

中文目标：在系统健康检查与发布门禁基线完成后，整理最终 V28.8 发布门禁清单，作为正式发布前的证据和检查列表。本阶段不新增运行时业务逻辑，只锁定最终发布前必须完成的验证项。

## Final V28.8 release gate checklist

### 1. Repository and branch control

- Work must be done on a repair branch.
- `main` must not be changed directly.
- Local working tree must be clean before PR.
- PR must be opened from the repair branch to `main`.
- PR must be merged only after local validation and Vercel success.
- Expected head SHA must be used at merge time.

### 2. Phase evidence checklist

The release gate must preserve evidence for these V28.8 baselines:

- Phase 1: Production RBAC and stability baseline.
- Phase 2: Service Requests real module baseline.
- Phase 3: Jobs real module baseline.
- Phase 4: Quotations real module baseline.
- Phase 5: Invoices real module baseline.
- Phase 6: Payments real module baseline.
- Phase 7: Warranties real module baseline.
- Phase 8: Customer Reviews real module baseline.
- Phase 9: Website Publish Approval real module baseline.
- Phase 10: Backup & Recovery real module baseline.
- Phase 11: AI / Social / Advertising production-safe content loop baseline.
- Phase 12: System Health & Release Gate baseline.
- Phase 13: Final Release Gate Checklist.

### 3. Required verification commands

The final release gate keeps these command families available:

- direct phase verifier command;
- `npm run validate:predeploy`;
- `npm run quality:gate`;
- `npm run validate:ci`;
- `npm run audit:prod`;
- `npm run typecheck`;
- `npm run lint`;
- `npm run build:ci`;
- `npm run test:e2e:smoke`;
- `npm run check:staging`;
- `npm run validate:platform`.

### 4. Production health checklist

Before final release is accepted, production `/api/ready` must confirm:

- `ok: true`;
- `environment: production`;
- `env_ready: true`;
- `database_ready: true`;
- `optional_database_ready: true`;
- `supabase_configured: true`;
- `failed_core_tables: []`;
- `failed_optional_tables: []`;
- required tables all `ok: true`;
- optional tables all `ok: true`.

### 5. Required production tables

The final release gate requires the full operational table chain to remain ready:

- `profiles`
- `customers`
- `unified_intake`
- `leads`
- `service_requests`
- `jobs`
- `service_inspections`
- `service_upload_reviews`
- `quotations`
- `quotation_versions`
- `quotation_acceptances`
- `quotation_customer_responses`
- `quotation_pdf_documents`
- `invoices`
- `invoice_pdf_documents`
- `payments`
- `payment_intents`
- `payment_webhook_events`
- `payment_checkout_sessions`
- `warranties`
- `warranty_pdf_documents`
- `warranty_claims`
- `customer_portal_requests`
- `customer_document_feedback`
- `unified_tasks`
- `task_events`
- `workflow_settings`
- `status_transition_logs`
- `audit_logs`
- `document_company_settings`

### 6. Optional/module production tables

The final release gate also requires optional/module readiness:

- `automation_rules`
- `notification_outbox`
- `internal_inbox_messages`
- `content_drafts`
- `ai_logs`
- `backup_jobs`
- `app_modules`
- `customer_account_claims`
- `customer_record_links`

### 7. Security and safety checklist

Final release evidence must keep the following safety rules:

- Supabase production reset remains prohibited.
- RLS remains enabled.
- Header role spoofing must remain blocked by server-side role checks.
- Customer portal ownership checks must remain enforced.
- Payment, invoice, quotation and warranty documents must remain private unless explicitly allowed.
- AI, social and advertising drafts must not auto-publish.
- Website Publish Approval must remain the public website publishing path.
- Backup restore must remain dry-run only unless a separately approved restore plan exists.
- Emergency admin token fallback remains disabled by default in production.

### 8. Release evidence after merge

After PR merge, final release evidence must include:

- merged PR number;
- merge commit SHA;
- local `main` synced to origin/main;
- local working tree clean;
- production `/api/ready` healthy;
- final summary with completed phase status.

## Phase 13 command

Run this locally before opening or updating the PR:

```powershell
cd "C:\Users\Amelindo\Documents\NANOFIX_V28_UNIFIED_WEBSITE_ADMIN"
pwd
git status

node tools/verify-v28-8-phase-13-final-release-gate-checklist.mjs
```

## Completion criteria

Phase 13 Final Release Gate Checklist is complete when:

- the verifier passes locally;
- git status is clean;
- PR is opened from the repair branch;
- Vercel preview succeeds;
- PR is merged only after checks pass;
- production `/api/ready` stays healthy after merge;
- release evidence is preserved in PR and final summary.

## Next module after this phase

After Phase 13 is locked, continue with:

1. Production smoke-test checklist
2. V28.8 final release readiness report
3. Final release note
4. Production health report
