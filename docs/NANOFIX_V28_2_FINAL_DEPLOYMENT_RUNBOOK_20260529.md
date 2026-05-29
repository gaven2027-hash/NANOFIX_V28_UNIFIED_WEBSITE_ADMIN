# NANOFIX V28.2 Final Deployment Runbook — 2026-05-29

This runbook is the operational deployment checklist for NANOFIX V28.2.

Canonical memory file:

- `docs/NANOFIX_V28_2_MASTER_MEMORY_20260529.md`

V28.2 scope:

- Automation & Notification Engine
- Internal Inbox
- Unified Task Engine
- Workflow Audit Trail
- Workflow Settings
- Global Search workflow/settings extension
- Final preflight, static scan, package validation and smoke checks

---

## 1. Non-negotiable rules

1. Use only `docs/NANOFIX_V28_2_MASTER_MEMORY_20260529.md` as the active project memory.
2. Do not reintroduce older continuation memory files, especially `docs/NANOFIX_V28_1_7_CONTINUATION_MEMORY_20260529.md`.
3. Do not add a new first-level Automation menu.
4. Keep Internal Admin first-level menus at `0–8`.
5. Keep Customer Portal separate from Internal Admin.
6. Engineers remain internal users, not a separate Engineer Portal product.
7. No production workflow state may use `localStorage` or `sessionStorage`.
8. No API or UI may return fake success after a failed database/API operation.
9. Workflow APIs must use internal RBAC helpers and write Audit Logs.
10. Supabase RLS must remain enabled for V28.2 tables.

---

## 2. Required V28.2 files

### Core memory and runbook

- `docs/NANOFIX_V28_2_MASTER_MEMORY_20260529.md`
- `docs/NANOFIX_V28_2_FINAL_DEPLOYMENT_RUNBOOK_20260529.md`

### Dashboard workflow UI

- `components/AutomationNotificationWorkspace.tsx`
- `components/WorkflowAuditTrail.tsx`
- `app/dashboard/page.tsx`

### System Settings workflow UI

- `components/WorkflowSettingsWorkspace.tsx`
- `app/system-settings/page.tsx`

### APIs

- `app/api/admin/automation-notifications/route.ts`
- `app/api/admin/internal-inbox/route.ts`
- `app/api/admin/unified-tasks/route.ts`
- `app/api/admin/workflow-audit/route.ts`
- `app/api/admin/workflow-settings/route.ts`
- `app/api/global-search/route.ts`
- `app/api/ready/route.ts`

### Supabase

- `supabase/migrations/202605290001_v28_2_automation_inbox_task_engine.sql`
- `supabase/migrations/202605290002_v28_2_workflow_settings.sql`
- `supabase/seed/20260529_v28_2_workflow_engine_seed.sql`

### Validation and smoke

- `tools/verify-v28-2-workflow-engine.mjs`
- `tools/static-v28-2-issue-scan.mjs`
- `tools/deploy-readiness-check.mjs`
- `tools/validate-unified-package.mjs`
- `tools/e2e-smoke.mjs`

---

## 3. Supabase deployment order

Apply migrations in this order after the existing V28 baseline migrations:

```sql
-- 1. Workflow engine tables and RPC
supabase/migrations/202605290001_v28_2_automation_inbox_task_engine.sql

-- 2. Workflow settings table and defaults
supabase/migrations/202605290002_v28_2_workflow_settings.sql
```

Expected new tables:

- `automation_rules`
- `notification_outbox`
- `internal_inbox_messages`
- `unified_tasks`
- `task_events`
- `workflow_settings`

Expected RPC/function:

- `create_unified_task_with_inbox`

Expected default settings:

- `notification.channel.internal.default`
- `notification.channel.email.operations`
- `unified_task.sla.p0.repair_triage`
- `unified_task.sla.p1.review_redaction`
- `automation.rules.safe_write_policy`

---

## 4. Seed data rule

Seed file:

```txt
supabase/seed/20260529_v28_2_workflow_engine_seed.sql
```

Use this seed only for local or staging verification unless the production operator explicitly wants demo rows.

Seed creates safe sample data for:

- automation rules
- unified tasks
- internal inbox messages
- notification outbox rows
- task events

Do not use seed demo rows as production business evidence.

---

## 5. Environment requirements

Required production environment variables must be set in Vercel:

- `NEXT_PUBLIC_SITE_URL`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NANOFIX_BACKUP_ENCRYPTION_KEY`
- `CRON_SECRET`
- `PAYMENT_WEBHOOK_SECRET`
- `SOCIAL_WEBHOOK_SECRET`

Required secure defaults:

```env
NANOFIX_ADMIN_TOKEN_FALLBACK_ENABLED=false
ALLOW_ADMIN_API_SECRET_FALLBACK=false
NANOFIX_ALLOW_FORM_WITHOUT_SUPABASE=false
```

Do not enable fallback auth in production unless performing a controlled emergency recovery with written Audit Log notes.

---

## 6. Preflight commands

Run these before production deploy:

```bash
npm ci
npm run verify:v28-2-workflow
npm run scan:v28-2-static
npm run validate:platform
npm run validate:package
npm run test:e2e:smoke
npm run validate:predeploy
npm run quality:gate
```

Minimum expected result:

- `verify:v28-2-workflow` exits 0.
- `scan:v28-2-static` exits 0.
- `validate:platform` exits 0.
- `validate:package` writes `VALIDATION_REPORT_V28.json` with `ok: true`.
- `test:e2e:smoke` exits 0.
- `validate:predeploy` exits 0.
- `quality:gate` exits 0.

---

## 7. What each check protects

### `verify:v28-2-workflow`

Checks V28.2 structure:

- Dashboard workflow workspace exists.
- Workflow audit trail exists.
- Workflow settings workspace exists.
- Workflow APIs exist and are audited.
- Workflow settings are connected to System Settings.
- Global Search covers workflow settings.
- Supabase migrations and seed contain required markers.

### `scan:v28-2-static`

Scans for static risk patterns:

- `select("*")`
- `localStorage` / `sessionStorage`
- fake success in catch blocks
- admin API missing auth helper markers
- workflow API missing `writeAuditLog`
- System Settings misusing Dashboard operation component
- stale V28.1.7 continuation memory file

### `validate:platform`

Checks deployment readiness:

- Node/npm/Vercel settings
- required files
- required npm scripts
- Supabase migrations
- seed markers
- `/api/ready` coverage
- workflow/search/settings/smoke markers

### `validate:package`

Writes validation report:

- `VALIDATION_REPORT_V28.json`

### `test:e2e:smoke`

Checks:

- public routes render
- protected routes redirect to `/login`
- V28.2 dashboard anchors are protected
- V28.2 System Settings anchors are protected
- workflow admin APIs return 401 when unauthenticated, even with spoofed role headers
- `/api/ready` contains all V28.2 tables
- Global Search settings markers are present

---

## 8. Ready endpoint verification

After deploy or local start, open:

```txt
/api/ready
```

Required response markers:

- `service: nanofix-v28-unified-website-admin`
- `version: 28.2.0-automation-inbox-task-engine`
- `env_ready: true` in production
- `database_ready: true`

Required tables:

- `profiles`
- `customers`
- `unified_intake`
- `leads`
- `service_requests`
- `jobs`
- `content_drafts`
- `ai_logs`
- `backup_jobs`
- `audit_logs`
- `app_modules`
- `automation_rules`
- `notification_outbox`
- `internal_inbox_messages`
- `unified_tasks`
- `task_events`
- `workflow_settings`

If `/api/ready` returns 503, do not deploy to production until the missing table/env issue is fixed.

---

## 9. Manual UI verification

After deploy, login to Internal Admin and check:

### Dashboard, Analytics & Alerts

Open:

- `/dashboard#automation-notification-engine`
- `/dashboard#internal-inbox`
- `/dashboard#unified-task-engine`

Confirm:

- live binding status appears
- no fake success is shown when API fails
- Queue notification calls the API
- Create task calls the API
- Ack inbox message calls the API
- Advance task calls the API
- Workflow Audit Trail loads task events, audit logs and notification delivery status

### Website & System Settings

Open:

- `/system-settings#automation-rule-settings`
- `/system-settings#notification-channel-settings`
- `/system-settings#unified-task-sla-settings`

Confirm:

- `WorkflowSettingsWorkspace` is visible
- workflow settings load from API
- enable/disable calls PATCH API
- setting changes write Audit Logs

### Global Search

Search for:

- `safe write policy`
- `notification channel`
- `P0 repair triage`
- `review redaction`
- `workflow_settings`

Confirm results route to:

- `/system-settings#automation-rule-settings`
- `/system-settings#notification-channel-settings`
- `/system-settings#unified-task-sla-settings`

---

## 10. Failure triage

### Missing `workflow_settings` in `/api/ready`

Likely cause:

- migration `202605290002_v28_2_workflow_settings.sql` was not applied.

Fix:

1. Apply the migration.
2. Recheck `/api/ready`.
3. Rerun `npm run validate:platform`.

### Dashboard shows degraded live binding

Likely causes:

- user is not logged in
- admin session expired
- Supabase migration missing
- API returned database error

Fix:

1. Login again.
2. Check `/api/ready`.
3. Check Vercel function logs for the specific API.
4. Confirm V28.2 tables exist.

### Write action fails

Likely causes:

- role not allowed
- missing UUID for live record
- Supabase write error
- RLS / service role misconfiguration

Fix:

1. Check API error shown in UI.
2. Check Audit Logs if any partial action was recorded.
3. Confirm the record is real live data, not demo fallback.
4. Confirm role is one of the allowed internal roles.

### Smoke test fails on protected route

Likely cause:

- middleware no longer redirects protected admin/customer/engineer routes to `/login`.

Fix:

1. Restore middleware route protection.
2. Ensure untrusted headers are stripped.
3. Rerun `npm run test:e2e:smoke`.

### Static scan fails on `select("*")`

Fix:

1. Replace with explicit field list.
2. Rerun `npm run scan:v28-2-static`.

### Static scan fails on browser storage

Fix:

1. Remove `localStorage` / `sessionStorage` from workflow/admin state.
2. Use Supabase-backed API or server state instead.
3. Rerun `npm run scan:v28-2-static`.

---

## 11. Production deployment sequence

Recommended sequence:

```bash
git checkout main
git pull origin main
npm ci
npm run validate:predeploy
npm run build:ci
npm run quality:gate
```

Then deploy through Vercel production after Supabase migrations are confirmed.

If deploying with Vercel CLI:

```bash
vercel --prod
```

Do not deploy if any of these fail:

- `validate:predeploy`
- `build:ci`
- `quality:gate`
- `/api/ready`

---

## 12. Rollback plan

If production deploy fails before traffic cutover:

1. Do not retry blindly.
2. Read the failing check output.
3. Fix the specific file/API/migration issue.
4. Rerun `validate:predeploy` and `quality:gate`.

If production deploy fails after traffic cutover:

1. Roll back Vercel to the previous stable deployment.
2. Do not roll back Supabase migrations unless absolutely necessary.
3. If DB rollback is required, export/backup first.
4. Disable affected workflow settings if the failure is settings-driven.
5. Record Super Admin incident note in Audit Logs.

---

## 13. Final go/no-go checklist

Go only when all are true:

- [ ] V28.2 master memory is the only active project memory.
- [ ] Old V28.1.7 continuation memory file is absent.
- [ ] Both V28.2 migrations are applied.
- [ ] `/api/ready` includes all V28.2 tables and returns ready.
- [ ] `npm run scan:v28-2-static` passes.
- [ ] `npm run verify:v28-2-workflow` passes.
- [ ] `npm run validate:platform` passes.
- [ ] `npm run validate:package` passes.
- [ ] `npm run test:e2e:smoke` passes.
- [ ] `npm run validate:predeploy` passes.
- [ ] `npm run quality:gate` passes.
- [ ] Dashboard workflow read/write actions are live.
- [ ] Workflow Audit Trail is live.
- [ ] System Settings workflow settings are live.
- [ ] Global Search can find workflow settings.
- [ ] Audit Logs record required read/write actions.

No-go if any check is false.
