# NANOFIX V28.2 Master Memory — 2026-05-29

This document is the canonical project memory for the V28.2 continuation stage.

## Canonical instruction

- Use this file as the single project memory reference for the current phase.
- Continue from: `Automation & Notification Engine → Internal Inbox → Unified Task Engine`.
- Do not rely on earlier chat-memory documents as the active basis for new work.
- Keep the Internal Admin App first-level menu structure at `0–8`.
- Keep Customer Portal separate from the Internal Admin App.
- Engineers remain internal roles inside the Internal Admin App; there is no separate Engineer Portal entry.
- Super Admin can take over full-system workflow actions, but every takeover/action must be written to Audit Logs.
- No localStorage workflow state and no fake-success fallback are allowed for production business flows.

## V28.2 current implementation scope

### 1. Automation & Notification Engine

Purpose: convert system events from service, customer, website, social, AI, finance and advertising modules into reliable internal actions.

Core tables:

- `automation_rules`
- `notification_outbox`
- `audit_logs`

Core API:

- `GET /api/admin/automation-notifications`
- `POST /api/admin/automation-notifications`

Rules:

- Trigger sources must be explicit: module, event and related record.
- Notifications must be queued in the database before being shown as successful.
- Delivery status must be traceable: queued, processing, sent, failed or cancelled.
- Failed delivery must keep attempt count and last error.
- Rule creation and notification enqueue actions must be audited.

### 2. Internal Inbox

Purpose: give internal roles a single action inbox for alerts, approvals, handoffs and escalations.

Core table:

- `internal_inbox_messages`

Core API:

- `GET /api/admin/internal-inbox`
- `POST /api/admin/internal-inbox`

Rules:

- Messages can target a specific profile or a role.
- Supported role recipients include Super Admin, Operations, Finance, Content Admin, Support and Engineer.
- Messages track read, acknowledged and archived states.
- Customers must not see the Internal Inbox.
- Engineers may see only assigned/role-relevant internal messages.

### 3. Unified Task Engine

Purpose: normalize all cross-module actionable work into a single task model.

Core tables:

- `unified_tasks`
- `task_events`

Core API:

- `GET /api/admin/unified-tasks`
- `POST /api/admin/unified-tasks`
- `PATCH /api/admin/unified-tasks`

Rules:

- Every task must have a source module and title.
- Tasks may link to source table/source id.
- Tasks support status, priority, assignee role/profile, due date, SLA minutes, escalation and completion.
- Every task create/update should write a task event and an audit log.
- Super Admin, Operations and Support can read broader queues; other internal roles are restricted to assigned/profile/role tasks.

### 4. Workflow Audit Trail

Purpose: show real traceability after workflow write actions.

Core sources:

- `task_events`
- `audit_logs`
- `notification_outbox`

Core API:

- `GET /api/admin/workflow-audit`

Rules:

- The dashboard audit component must read `/api/admin/workflow-audit?limit=12`.
- The audit API must use `requireActorApi()` and explicit field whitelists, not `select('*')`.
- Reading the audit trail is itself audited as `workflow_audit_trail_read`.
- The UI must show degraded/error state if the API is unavailable.

### 5. Workflow Settings

Purpose: make System Settings manage workflow configuration instead of using dashboard operation panels.

Core table:

- `workflow_settings`

Core API:

- `GET /api/admin/workflow-settings`
- `POST /api/admin/workflow-settings`
- `PATCH /api/admin/workflow-settings`

Core UI:

- `components/WorkflowSettingsWorkspace.tsx`
- `app/system-settings/page.tsx`

Settings categories:

- `automation_rule_setting`
- `notification_channel`
- `unified_task_sla`
- `escalation_rule`

Default settings:

- `notification.channel.internal.default`
- `notification.channel.email.operations`
- `unified_task.sla.p0.repair_triage`
- `unified_task.sla.p1.review_redaction`
- `automation.rules.safe_write_policy`

Rules:

- System Settings must render `WorkflowSettingsWorkspace`, not `AutomationNotificationWorkspace`.
- Settings changes must write Audit Logs through `workflow_setting_upsert` or `workflow_setting_update`.
- Settings UI must use live API reads/writes, same-origin credentials and no browser storage.
- `workflow_settings` must be included in `/api/ready`.

## Database and security baseline

- V28.2 adds Supabase migration `202605290001_v28_2_automation_inbox_task_engine.sql`.
- V28.2 adds Supabase migration `202605290002_v28_2_workflow_settings.sql`.
- V28.2 adds seed file `supabase/seed/20260529_v28_2_workflow_engine_seed.sql` for safe local/staging demo records.
- RLS is enabled for all V28.2 tables.
- Internal role access is checked through `profiles.auth_user_id = auth.uid()` and `profiles.role`.
- API routes still use `requireActorApi()` / `requireAdminApi()` and Supabase service role server-side.
- The readiness endpoint must check the new V28.2 tables:
  - `automation_rules`
  - `notification_outbox`
  - `internal_inbox_messages`
  - `unified_tasks`
  - `task_events`
  - `workflow_settings`

## UI placement

Do not add a new first-level menu. V28.2 workflow functions are integrated under existing menus:

- Dashboard, Analytics & Alerts:
  - Automation & Notification Engine
  - Internal Inbox
  - Unified Task Engine
  - Workflow Audit Trail
- Website & System Settings:
  - Automation Rule Settings
  - Notification Channel Settings
  - Unified Task SLA Settings

## Global Search baseline

Global Search must cover the V28.2 workflow and settings sources:

- `automation_rules`
- `notification_outbox`
- `internal_inbox_messages`
- `unified_tasks`
- `workflow_settings`

Workflow settings search results must route to:

- `/system-settings#automation-rule-settings`
- `/system-settings#notification-channel-settings`
- `/system-settings#unified-task-sla-settings`

Global Search must merge RPC results with fallback search results so newly added V28.2 tables are searchable even before the RPC is expanded.

## Final preflight baseline

The following scripts must enforce V28.2 final status:

- `npm run verify:v28-2-workflow`
- `npm run validate:platform`
- `npm run validate:package`
- `npm run test:e2e:smoke`
- `npm run validate:predeploy`
- `npm run quality:gate`

The final preflight must check:

- Dashboard renders `AutomationNotificationWorkspace`.
- System Settings renders `WorkflowSettingsWorkspace` and does not render `AutomationNotificationWorkspace`.
- Workflow read APIs are bound: automation notifications, internal inbox, unified tasks.
- Workflow write actions are bound: queue notification, acknowledge inbox, create task, advance task.
- Demo fallback rows are not writable live records.
- Workflow Audit Trail reads task events, audit logs and notification delivery status.
- Workflow Settings reads and patches live settings.
- Global Search includes workflow settings and routes to System Settings anchors.
- `/api/ready` includes `workflow_settings`.
- E2E smoke checks protected System Settings anchors and unauthenticated 401 responses for workflow settings/audit APIs.

## Production rule

Before deployment:

1. Apply Supabase migrations:
   - `202605290001_v28_2_automation_inbox_task_engine.sql`
   - `202605290002_v28_2_workflow_settings.sql`
2. Optionally apply safe local/staging seed data:
   - `supabase/seed/20260529_v28_2_workflow_engine_seed.sql`
3. Run typecheck and production build.
4. Run `npm run validate:predeploy` and `npm run quality:gate`.
5. Confirm `/api/ready` returns all V28.2 tables as ready.
6. Confirm APIs return real database status instead of visual-only success.
7. Confirm Audit Logs receive create/update/read action entries where required.
