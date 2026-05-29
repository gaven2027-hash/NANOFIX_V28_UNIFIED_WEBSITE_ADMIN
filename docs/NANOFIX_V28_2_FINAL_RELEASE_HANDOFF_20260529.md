# NANOFIX V28.2 Final Release Handoff — 2026-05-29

This handoff document summarizes the completed V28.2 stage for the NANOFIX unified website, internal admin app and Supabase workflow foundation.

## 1. Canonical memory basis

The only active project memory for this stage is:

```txt
docs/NANOFIX_V28_2_MASTER_MEMORY_20260529.md
```

Do not use earlier V28.1.x continuation memory files as the active development basis. The stale V28.1.7 continuation handoff was removed to avoid project-memory conflict.

Final deployment runbook:

```txt
docs/NANOFIX_V28_2_FINAL_DEPLOYMENT_RUNBOOK_20260529.md
```

The runbook is operational guidance only. It does not replace the V28.2 master memory as the canonical project memory.

## 2. Stage scope

V28.2 continues from:

```txt
Automation & Notification Engine → Internal Inbox → Unified Task Engine
```

The stage adds a real workflow layer for internal operations:

- Automation rules and notification queue
- Role-based Internal Inbox
- Unified task table and task events
- Workflow audit trail
- Workflow settings under System Settings
- Global Search coverage for workflow data and settings
- Readiness, smoke, package validation and static issue scanning
- Final deployment runbook and go/no-go checklist

## 3. Main UI placement

Do not add a new first-level menu. Keep the Internal Admin App primary menu at 0–8.

### Dashboard, Analytics & Alerts

Operational workflow area:

- Automation & Notification Engine
- Internal Inbox
- Unified Task Engine
- Workflow Audit Trail

Main component:

```txt
components/AutomationNotificationWorkspace.tsx
components/WorkflowAuditTrail.tsx
```

Page entry:

```txt
app/dashboard/page.tsx
```

### Website & System Settings

Configuration area:

- Automation Rule Settings
- Notification Channel Settings
- Unified Task SLA Settings

Main component:

```txt
components/WorkflowSettingsWorkspace.tsx
```

Page entry:

```txt
app/system-settings/page.tsx
```

System Settings must not render `AutomationNotificationWorkspace`; that component belongs to Dashboard operations.

## 4. New and updated APIs

### Workflow operation APIs

```txt
GET  /api/admin/automation-notifications
POST /api/admin/automation-notifications

GET  /api/admin/internal-inbox
POST /api/admin/internal-inbox

GET   /api/admin/unified-tasks
POST  /api/admin/unified-tasks
PATCH /api/admin/unified-tasks
```

Rules:

- Must use `requireActorApi()`.
- Must write Audit Logs where records are created, updated or read for audit-sensitive actions.
- Must not use browser storage as business state.
- Must not return fake success if Supabase or auth fails.

### Workflow audit API

```txt
GET /api/admin/workflow-audit
```

Reads:

- `task_events`
- `audit_logs`
- `notification_outbox`

Rules:

- Must use explicit field whitelists, not `select('*')`.
- Must write `workflow_audit_trail_read` to Audit Logs.

### Workflow settings API

```txt
GET   /api/admin/workflow-settings
POST  /api/admin/workflow-settings
PATCH /api/admin/workflow-settings
```

Reads/writes:

- `workflow_settings`

Rules:

- Read allowed for internal roles.
- Write allowed only for manager roles: Super Admin, Operations Admin, Content Admin and Support.
- Writes must log `workflow_setting_upsert` or `workflow_setting_update`.

## 5. Supabase migrations

Apply these migrations in order after the existing V28 migrations:

```txt
supabase/migrations/202605290001_v28_2_automation_inbox_task_engine.sql
supabase/migrations/202605290002_v28_2_workflow_settings.sql
```

### Migration 202605290001

Creates:

- `automation_rules`
- `notification_outbox`
- `internal_inbox_messages`
- `unified_tasks`
- `task_events`

Also adds:

- RLS policies
- indexes
- `create_unified_task_with_inbox()` RPC
- updated_at triggers
- grants

### Migration 202605290002

Creates:

- `workflow_settings`

Default settings:

- `notification.channel.internal.default`
- `notification.channel.email.operations`
- `unified_task.sla.p0.repair_triage`
- `unified_task.sla.p1.review_redaction`
- `automation.rules.safe_write_policy`

Also adds:

- RLS policies
- type checks
- indexes
- updated_at trigger
- grants

## 6. Optional seed data

For local/staging demo only:

```txt
supabase/seed/20260529_v28_2_workflow_engine_seed.sql
```

Contains safe demo records for:

- automation rules
- unified tasks
- internal inbox messages
- notification outbox rows
- task events

Do not treat seed data as production business evidence.

## 7. Global Search coverage

Global Search must search both operational workflow data and settings:

- `automation_rules`
- `notification_outbox`
- `internal_inbox_messages`
- `unified_tasks`
- `workflow_settings`

The global search route now merges RPC results and fallback results so new workflow tables remain searchable even before the RPC is expanded.

Settings result routing:

```txt
/system-settings#automation-rule-settings
/system-settings#notification-channel-settings
/system-settings#unified-task-sla-settings
```

## 8. Readiness requirement

`/api/ready` must check these V28.2 tables:

```txt
automation_rules
notification_outbox
internal_inbox_messages
unified_tasks
task_events
workflow_settings
```

Before the two V28.2 migrations are applied, `/api/ready` should honestly return not ready instead of fake success.

## 9. Final validation commands

Run these before production deployment:

```bash
npm run verify:v28-2-workflow
npm run scan:v28-2-static
npm run validate:platform
npm run validate:package
npm run test:e2e:smoke
npm run validate:predeploy
npm run quality:gate
```

### What these checks cover

- Dashboard workflow UI exists and binds live APIs.
- System Settings uses `WorkflowSettingsWorkspace`.
- Workflow read/write APIs exist and are protected.
- Workflow audit and settings APIs exist and are protected.
- Demo fallback rows are not writable.
- No `select('*')` in guarded workflow APIs.
- No browser storage workflow state.
- No fake `ok: true` catch success paths.
- `/api/ready` includes workflow settings.
- Global Search includes workflow settings.
- E2E smoke confirms protected route redirects and unauthenticated API 401s.
- Package validation requires both the final runbook and the static issue scanner.
- Deploy readiness requires `scan:v28-2-static` to be wired into `validate:predeploy`.

## 10. Static issue scan

The final static scanner is:

```txt
tools/static-v28-2-issue-scan.mjs
```

It scans:

- `app`
- `components`
- `lib`
- `tools`

It blocks:

- `select('*')` / `select("*")`
- `localStorage` / `sessionStorage`
- fake success in catch blocks
- unprotected admin API routes
- workflow APIs without `writeAuditLog`
- System Settings using Dashboard operation workspace
- `/api/ready` missing V28.2 tables
- Global Search missing workflow settings
- stale V28.1.7 memory file reappearing

It is wired into:

```txt
npm run validate:predeploy
```

## 11. Final runbook and package validation guard

Final deployment runbook:

```txt
docs/NANOFIX_V28_2_FINAL_DEPLOYMENT_RUNBOOK_20260529.md
```

Package validation must require:

- `docs/NANOFIX_V28_2_FINAL_DEPLOYMENT_RUNBOOK_20260529.md`
- `tools/static-v28-2-issue-scan.mjs`

Package validation report must include these V28.2 fields:

- `final_runbook_present`
- `static_scan_present_and_guarding`
- `v28_2_workflow_checks`

Deploy readiness must require:

- final runbook exists
- static scanner exists
- `scan:v28-2-static` script exists
- `validate:predeploy` runs `scan:v28-2-static`
- `validate:predeploy` runs `verify:v28-2-workflow`

## 12. Rollback notes

If V28.2 causes production issues before go-live:

1. Do not partially deploy the UI without the two Supabase migrations.
2. Revert the V28.2 UI/API commits together, not one file at a time.
3. If migrations were applied in staging only, reset the staging database or drop V28.2 tables in dependency order.
4. If migrations were applied in production and need rollback, first export affected data:
   - `automation_rules`
   - `notification_outbox`
   - `internal_inbox_messages`
   - `unified_tasks`
   - `task_events`
   - `workflow_settings`
5. Drop dependent child tables first:
   - `task_events`
   - `internal_inbox_messages`
   - `notification_outbox`
   - `unified_tasks`
   - `automation_rules`
   - `workflow_settings`
6. Re-run `/api/ready` after rollback to confirm expected table state.

## 13. Post-handoff next stage suggestions

Recommended next work after V28.2 preflight passes:

1. Run real CI/build on GitHub Actions and inspect artifacts.
2. Apply V28.2 migrations to staging Supabase.
3. Run smoke tests against staging with real auth/session.
4. Add workflow delivery worker for queued notifications.
5. Add task escalation scheduler.
6. Add richer settings editor for JSON values with validation schema.
7. Expand `search_all_records` RPC to include `workflow_settings` directly, while keeping fallback search.

## 14. Do-not-break rules

- Do not add a new first-level Automation menu.
- Do not mix Customer Portal into Internal Admin App menus.
- Do not create a separate Engineer Portal entry.
- Do not restore stale V28.1.x memory as active project basis.
- Do not make workflow demo rows writable.
- Do not use browser storage for production workflow state.
- Do not use visual-only success for workflow writes.
- Do not bypass Audit Logs for workflow writes or audit reads.
- Do not remove the final deployment runbook from package/deploy readiness checks.
