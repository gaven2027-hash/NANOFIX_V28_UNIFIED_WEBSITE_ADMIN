# NANOFIX V28.2 Admin Menu Reality Audit Matrix — 2026-05-29

This audit answers a direct operational question:

> Are all menus, right-side contents, links, functions and modules real, complete and working?

## Executive answer

No. The menu structure is broad and mostly present, but not all right-side modules are real production workflows.

Current status:

- Menu entries: mostly complete for Internal Admin App 0–8.
- Dedicated V28.2 workflow modules: mostly live and verifiable.
- Generic right-side submodule panels: many are contract/partial UI scaffolds.
- Some buttons only write client-side action logs and do not call server APIs.
- Production truth still depends on Supabase migrations, env configuration, `/api/ready`, E2E smoke and real session testing.

## Classification standard

| Status | Meaning |
|---|---|
| Live | Real API/database binding exists. Writes go through server API and should create Audit Logs. |
| Partial | Some real components/APIs exist, but not every submodule is a complete CRUD/write/audit workflow. |
| Contract | UI exists as an OA/ERP contract preview only. It is not a real production write workflow. |
| Missing | Menu or page is absent, or route is broken. |

## Key code evidence

- `data/adminNavigation.ts` defines the 0–8 menu and children.
- `MenuAnchorSections` renders `AdminSubmoduleWorkspace`.
- `AdminSubmoduleWorkspace` explicitly marks module panels as `Live API`, `Partial live binding` or `Contract scaffold`.
- `AdminSubmoduleWorkspace` action buttons write only a client-side action log.
- Dedicated workspaces such as `AutomationNotificationWorkspace` and `WorkflowSettingsWorkspace` call real APIs.

## Primary menu matrix

| Order | Menu | Right-side state | API/data state | Overall reality | Production note |
|---:|---|---|---|---|---|
| 0 | Global Search & Admin Home | Partial | Global search has real route and fallback sources; admin home panels still include dashboard-style shortcuts. | Partial | Needs full audit of every home card and quick-create action. |
| 1 | Dashboard, Analytics & Alerts | Mixed: Live for V28.2 workflow; partial for generic dashboard summaries | V28.2 automation/inbox/task APIs are live; other dashboard cards may be summary/contract. | Partial → Live for V28.2 only | Automation, Internal Inbox, Unified Task Engine and Audit Trail are the reliable live area. |
| 2 | Service & Order Operations | Partial/Contract | Some supporting APIs and status RPCs exist, but visible action panels still contain static sample arrays and client-side logs. | Partial | Highest priority to convert to real lead → request → inspection → quote → job → invoice → payment → warranty CRUD. |
| 3 | Website Management | Partial | CMS pieces exist, but many second-level items are still contract rows until each content/media/publish workflow is verified. | Partial | Next priority after Service Operations. |
| 4 | Social Media Management | Partial/Contract | Social API pieces exist, but platform account binding, reply/send, publish queue and logs need per-platform verification. | Partial | Must not enable auto-publish without admin approval. |
| 5 | Advertising & Promotion Center | Partial/Contract | Some advertising-center APIs exist; full live spend/import/ROI/finance-review chain not proven complete. | Partial | Needs live ad import and finance reconciliation before production use. |
| 6 | AI Intelligence Center | Partial/Contract | AI logs and draft concepts exist; most AI modules still need explicit API, review, safety and audit binding. | Partial | AI output must remain draft/review only. |
| 7 | Customer Center | Partial/Contract | Customer portal concepts exist; many review/privacy/binding modules need full CRUD and permission verification. | Partial | Customer-facing privacy and review modules are high-risk; require strong audit. |
| 8 | Website & System Settings | Mixed: Live for workflow settings; partial for all other settings | WorkflowSettings API/table is live; backup/RBAC have components; many settings remain contract. | Partial → Live for V28.2 settings only | Workflow settings are the reliable live section. |

## V28.2 modules that are closest to real production readiness

### Dashboard → Automation & Notification Engine

Status: Live, pending real environment test.

Evidence:

- Reads `/api/admin/automation-notifications`.
- Writes queued notifications via `POST /api/admin/automation-notifications`.
- Uses no-store same-origin fetch.
- Does not mark success unless API succeeds.
- Demo/fallback rows are not treated as production success.

### Dashboard → Internal Inbox

Status: Live, pending real environment test.

Evidence:

- Reads `/api/admin/internal-inbox`.
- Acknowledges real UUID messages only.
- Demo rows cannot be acknowledged.
- Intended to write Audit Logs through API layer.

### Dashboard → Unified Task Engine

Status: Live, pending real environment test.

Evidence:

- Reads `/api/admin/unified-tasks`.
- Creates tasks through `POST /api/admin/unified-tasks`.
- Updates real UUID tasks through `PATCH /api/admin/unified-tasks`.
- Demo rows cannot be updated.

### Dashboard → Workflow Audit Trail

Status: Live read-only, pending real environment test.

Evidence:

- Reads `/api/admin/workflow-audit?limit=12`.
- Displays `task_events`, `audit_logs` and `notification_delivery`.
- Degraded state is shown if API fails.

### System Settings → Workflow Settings

Status: Live, pending real environment test.

Evidence:

- Reads `/api/admin/workflow-settings`.
- Updates settings through `PATCH /api/admin/workflow-settings`.
- Covers `automation_rule_setting`, `notification_channel`, `unified_task_sla`.
- Uses same-origin no-store fetch.

## Modules that must not be called fully real yet

The following areas currently must be treated as Partial or Contract unless dedicated APIs and tests prove otherwise:

- Service Operations full CRUD for every submodule.
- Website Management full CMS editing/publish workflow for every second-level item.
- Social Media send/reply/publish and platform API binding.
- Advertising live spend import, budget adjustment and ROI finance review.
- AI content generation, regeneration and publishing workflow.
- Customer Center review privacy, deletion, PDPA request and account-control workflows.
- System Settings sections outside Backup/RBAC/V28.2 workflow settings.

## Immediate remediation roadmap

### Phase A — Service Operations live core

Goal: make the daily business chain real before expanding secondary modules.

Convert these second-level menus first:

1. Leads
2. Service Requests
3. Inspection Scheduling
4. Inspections
5. Quotations
6. Quotation Approval
7. Jobs
8. Progress Updates
9. Invoices
10. Payments
11. Warranty Records
12. Status Flow & Logs
13. Super Admin Takeover & Override

Required for each:

- Supabase table or verified existing table.
- `GET` list API.
- `POST` create API where applicable.
- `PATCH` update/status API.
- Audit Logs.
- Role permissions.
- UI live read/write binding.
- Degraded/error state.
- E2E smoke marker.

### Phase B — Customer Center high-risk modules

Prioritize:

1. Customer List
2. Customer Profiles
3. Pending Customer Binding
4. Binding Review & Merge
5. Repair Tracking
6. Customer Portal Management
7. Review Privacy Settings
8. Review Approval & Privacy Redaction
9. Consent & PDPA Log
10. PDPA / Privacy Requests
11. Customer Access Control

Reason: customer data, privacy, review publishing and account access are high-risk.

### Phase C — Website Management production CMS

Prioritize:

1. Navigation & Menu
2. Homepage Content
3. Page Content
4. Service Page Content
5. Guide Library
6. SEO / AEO Library
7. Forms & Public Submission
8. Public Form Submissions
9. Public Upload Review
10. Preview
11. Publish Approval
12. Version History

### Phase D — Social / Ads / AI

Treat these as business-growth modules after core operations are stable.

- Social Media: platform account binding, inbox, AI draft, approval, schedule, publish logs.
- Advertising: campaign planning, import, budgets, ROI, finance review.
- AI Intelligence: assistant outputs, safety audit, cost tracking, review moderation, attribution assist.

## Required next engineering deliverable

Create a machine-readable module reality registry:

```txt
data/adminModuleReality.ts
```

For each second-level menu item, include:

- route
- anchor
- status: `live | partial | contract | missing`
- table names
- API route names
- write actions
- audit action names
- risk level
- owner role
- next required implementation step

Then update `AdminSubmoduleWorkspace` to read this registry instead of guessing status from keywords.

## Final answer for management

The system has a strong V28.2 workflow foundation, but it is not yet a fully real OA/ERP backend across all menus.

Current safe statement:

```txt
NANOFIX V28.2 has a real workflow foundation for automation, internal inbox, unified tasks, audit trail and workflow settings. The complete 0–8 admin menu exists, but many right-side second-level modules remain partial or contract scaffolds until converted to live Supabase API + Audit Log workflows.
```
