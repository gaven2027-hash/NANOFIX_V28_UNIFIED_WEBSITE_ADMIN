# NANOFIX V28.8 Phase 12 — System Health & Release Gate Baseline

Date: 2026-06-12
Branch: `v28-8-phase-12-system-health-release-gate`
Base: post V28.8 Phase 11 merge commit `c02f8a80598758091573a531d1eb2332a18c9e45`

## Goal

Phase 12 continues the real business-module hardening sequence after AI / Social / Advertising production-safe content loop. System Health & Release Gate is the production release-control layer that verifies environment readiness, database readiness, optional module readiness, CI/build gates, security gates and smoke-test gates before any release is accepted.

中文目标：在 AI / 社媒 / 广告生产安全内容闭环完成后，锁定系统健康检查与发布门禁，确保生产环境变量、核心数据库表、可选模块表、CI / build / lint / typecheck / audit / smoke test 等检查都作为发布前门禁，避免未通过验证的代码进入生产。

## Release gate chain

1. Local clean working tree / 本地工作区干净
2. Branch-based repair / 独立修复分支
3. Direct verifier for the phase / 当前阶段验证脚本
4. TypeScript check / 类型检查
5. ESLint check / 代码规范检查
6. npm audit production dependency gate / 生产依赖安全审计
7. Next build gate / Next.js 构建门禁
8. E2E smoke test / 冒烟测试
9. Vercel preview success / Vercel 预览部署成功
10. PR merge only after successful checks / 检查通过后才合并
11. Production `/api/ready` health check / 生产健康复检
12. Release evidence and rollback reference / 发布证据与回滚引用

## Locked Phase 12 health requirements

### 1. `/api/ready` production health baseline

The production ready endpoint must continue to expose:

- `ok`
- `service`
- `version`
- `environment`
- `env_ready`
- `database_ready`
- `optional_database_ready`
- `supabase_configured`
- `failed_core_tables`
- `failed_optional_tables`
- `checks`
- `required_tables`
- `optional_tables`
- `timestamp`

The endpoint must return HTTP `200` only when the release is production-ready, and HTTP `503` when the core health check is not ready.

### 2. Required core table baseline

The release gate must continue checking all core operational tables:

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

### 3. Optional module table baseline

The release gate must continue checking optional/module tables:

- `automation_rules`
- `notification_outbox`
- `internal_inbox_messages`
- `content_drafts`
- `ai_logs`
- `backup_jobs`
- `app_modules`
- `customer_account_claims`
- `customer_record_links`

### 4. Environment safety baseline

Production required env checks must continue covering:

- `NEXT_PUBLIC_SITE_URL`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NANOFIX_WEBHOOK_SECRET`
- `NEXT_PUBLIC_MEMBER_PORTAL_URL`

Optional emergency token fallback must remain non-required by default:

- `NANOFIX_ADMIN_API_TOKEN`
- `NANOFIX_ADMIN_TOKEN_FALLBACK_ENABLED`

The secure production default remains: `NANOFIX_ADMIN_TOKEN_FALLBACK_ENABLED=false` unless a controlled migration window is approved.

### 5. Package release gate baseline

`package.json` must continue exposing release gates:

- `validate:predeploy`
- `quality:gate`
- `validate:ci`
- `audit:prod`
- `typecheck`
- `lint`
- `build:ci`
- `test:e2e:smoke`
- `check:staging`
- `validate:platform`

### 6. No direct production mutation in release gate

Phase 12 does not change production data. It does not:

- reset Supabase;
- disable RLS;
- publish website content;
- publish social posts;
- activate paid ads;
- restore production data;
- bypass PR checks;
- bypass Vercel preview.

### 7. Evidence required before merge

A Phase 12 PR may be merged only after:

- local verifier passes;
- git status is clean;
- Vercel status is success;
- PR is not draft;
- expected head SHA is used for merge;
- production `/api/ready` remains healthy after merge.

## Phase 12 command

Run this locally before opening or updating the PR:

```powershell
cd "C:\Users\Amelindo\Documents\NANOFIX_V28_UNIFIED_WEBSITE_ADMIN"
pwd
git status

node tools/verify-v28-8-phase-12-system-health-release-gate.mjs
```

## Completion criteria

Phase 12 System Health & Release Gate baseline is complete when:

- the verifier passes locally;
- git status is clean;
- PR is opened from the repair branch;
- Vercel preview succeeds;
- PR is merged only after checks pass;
- production `/api/ready` stays healthy after merge;
- failed_core_tables remains empty;
- failed_optional_tables remains empty;
- release evidence is preserved in PR and final summary.

## Next module after this phase

After Phase 12 is locked, continue with:

1. Final V28.8 release gate checklist
2. Production smoke-test checklist
3. V28.8 final release readiness report
4. Final merge and production health report
