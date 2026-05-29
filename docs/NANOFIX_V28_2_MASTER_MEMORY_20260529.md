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

## Database and security baseline

- V28.2 adds Supabase migration `202605290001_v28_2_automation_inbox_task_engine.sql`.
- RLS is enabled for all V28.2 tables.
- Internal role access is checked through `profiles.auth_user_id = auth.uid()` and `profiles.role`.
- API routes still use `requireActorApi()` / `requireAdminApi()` and Supabase service role server-side.
- The readiness endpoint must check the new V28.2 tables:
  - `automation_rules`
  - `notification_outbox`
  - `internal_inbox_messages`
  - `unified_tasks`
  - `task_events`

## UI placement

Do not add a new first-level menu. V28.2 workflow functions are integrated under existing menus:

- Dashboard, Analytics & Alerts:
  - Automation & Notification Engine
  - Internal Inbox
  - Unified Task Engine
- Website & System Settings:
  - Automation Rule Settings
  - Notification Channel Settings
  - Unified Task SLA Settings

## Production rule

Before deployment:

1. Apply the Supabase migration.
2. Run typecheck and production build.
3. Confirm `/api/ready` returns the new V28.2 tables as ready.
4. Confirm APIs return real database status instead of visual-only success.
5. Confirm Audit Logs receive create/update/read action entries where required.
