# NANOFIX V28.2 OA / ERP Readiness Audit — 2026-05-29

## Scope

This audit checks the NANOFIX public website to internal admin connection, internal admin first-level and second-level menu completeness, right-side module integrity, real-data connectivity, action operability and production suitability against OA/ERP go-live expectations.

Canonical project memory:

```txt
docs/NANOFIX_V28_2_MASTER_MEMORY_20260529.md
```

## Executive result

Current result:

```txt
NOT YET FULL OA/ERP PRODUCTION READY
```

Reason:

- The 0–8 Internal Admin first-level menu structure is present and broad.
- The second-level menu coverage is comprehensive.
- Several core V28.2 workflow modules are now real/live or partially live.
- But many second-level modules still use generic contract/scaffold UI instead of verified module-specific CRUD APIs.
- Some buttons in generic submodule panels were previously local client-side action logs. This has now been corrected by marking them as Contract/Partial/Live and warning that client logs are not production writes.
- Vercel deployment status is still failure and build logs are not accessible due to Vercel scope authorization, so production go-live remains NO-GO.

## What was checked

### Public website and backend connection

Checked expected public-to-admin flow:

- public website submit/repair request entry
- public request API
- unified intake / leads / service request pipeline
- admin dashboard and service operations visibility
- global search and workflow task visibility

Current assessment:

```txt
PARTIAL
```

The architecture exists, but production confidence depends on applying the Supabase migrations and verifying live `/api/ready`, public form submission, and admin-side record visibility in staging/production.

### Internal Admin primary menu

Expected first-level structure is preserved:

```txt
0 Global Search & Admin Home
1 Dashboard, Analytics & Alerts
2 Service & Order Operations
3 Website Management
4 Social Media Management
5 Advertising & Promotion Center
6 AI Intelligence Center
7 Customer Center
8 Website & System Settings
```

Current assessment:

```txt
PASS — menu structure exists and remains 0–8.
```

### Internal Admin second-level menu coverage

Second-level coverage is broad:

- Admin Home: search, launch board, recent activity, pending tasks, quick create, shortcuts
- Dashboard: executive overview, urgent queue, automation engine, internal inbox, unified tasks, module alerts and summaries
- Service Operations: leads, requests, inspections, quotes, jobs, invoices, payments, warranty, rework, status logs, takeover
- Website Management: navigation, homepage, reviews, pages, guide, SEO/AEO, AI content, forms, uploads, media, preview, publish, version history
- Social Media: accounts, GBP, inbox, WhatsApp AI, human transfer, webhook, reviews, organic leads, content studio, preview, schedule, logs
- Advertising: dashboard, planning, campaign draft, import, insights, creatives, budget, approval, connections, Google/Meta/WhatsApp ads, attribution, finance review
- AI: web search, website/social assistant, conversation intelligence, scoring, attribution, moderation, privacy redaction, API settings, logs, usage, quotation/invoice assist
- Customer Center: profiles, binding, customer 360, repair tracking, quotes, invoices, payments, warranty, portal, reviews, PDPA, access control
- System Settings: company, brand, login, roles, staff/customer registration, integrations, Supabase/GitHub/Vercel, search, permissions, admin accounts, automation settings, backup, QR, attribution, security, audit, health

Current assessment:

```txt
PASS for coverage, PARTIAL for true implementation.
```

Coverage exists; not every second-level module is backed by a dedicated real CRUD/status API yet.

## Key fixes applied in this audit

### 1. Generic right-side module panel no longer pretends to be real OA/ERP writes

Updated:

```txt
components/AdminSubmoduleWorkspace.tsx
```

Problem before:

- Generic module buttons recorded only local `Action log` entries.
- This could mislead operators into thinking a module was actually saving or updating workflow state.

Fix:

- Added explicit integration modes:
  - `Live API / 真实接口`
  - `Partial live binding / 部分真实绑定`
  - `Contract scaffold / 契约占位`
- Added clear warning:
  - client-side action logs are not production writes
  - production writes must use dedicated live workspaces, API responses and server-side Audit Logs
- Generic submodule records now use contract/scaffold IDs and status, not realistic business IDs that look like real orders.
- Contract-only modules are visually separated from live modules.

Commit:

```txt
9d6cba32839b6e889247764f656b122a394f8cb7
```

### 2. Added OA/ERP readiness audit script

Added:

```txt
tools/oa-erp-readiness-audit.mjs
```

This script checks:

- 0–8 menu structure
- primary admin route pages exist
- required page components exist
- second-level child links belong to their parent route
- duplicate child hrefs
- key live API files
- auth markers in admin APIs
- explicit field selection, avoiding `select('*')`
- generic workspace scaffold warning exists
- UI quality signals such as nested empty fragments

It outputs:

```txt
OA_ERP_READINESS_REPORT.json
```

Commit:

```txt
89fbebd993856d7b10baea9894ce95f63021a9d9
```

### 3. Added OA/ERP audit into validation

Updated:

```txt
package.json
```

Added:

```json
"audit:oa-erp": "node tools/oa-erp-readiness-audit.mjs"
```

And wired it into:

```json
"validate:predeploy"
```

Commit:

```txt
60e3034dce1120228281060c24cda5826ad512da
```

## Live / partial / contract classification

### Live or near-live modules

These have real V28.2 APIs or dedicated live workspaces:

- Automation & Notification Engine
- Internal Inbox
- Unified Task Engine
- Workflow Audit Trail
- Workflow Settings
- Backup jobs
- CMS blocks / Website Management partial runtime
- Advertising Center partial APIs
- Social messages partial API
- Payment reconcile
- Warranty issue

### Partial modules

These have some UI/API structure but require deeper module-specific verification:

- Dashboard summary widgets outside V28.2 workflow
- Service Operations submodules
- Website Management submodules beyond CMS blocks
- Social Media submodules beyond messages/account foundations
- Advertising submodules beyond current partial API set
- AI Intelligence submodules
- Customer Center review/portal/binding submodules
- System Settings outside workflow settings / backup / RBAC

### Contract/scaffold modules

Any second-level module displayed only through `AdminSubmoduleWorkspace` without a dedicated API is now treated as contract/scaffold, not a real operational module.

## Main problems found

### P0 — Production blocker

1. Vercel deployment status is currently failure.
   - Build logs cannot be read because current Vercel connector lacks project/team scope.
   - Production go-live remains NO-GO until Vercel status is success.

2. Not every second-level module has verified real CRUD/status/Audit API.
   - Menu coverage is broad, but OA/ERP go-live requires operation-level truth.
   - Generic UI must not be considered production-ready business workflow.

3. Supabase migrations must be applied before production verification:
   - `202605290001_v28_2_automation_inbox_task_engine.sql`
   - `202605290002_v28_2_workflow_settings.sql`

### P1 — Must finish before real daily operations

1. Promote the following modules from contract to live dedicated workspaces:
   - Service Requests
   - Inspection Scheduling / Inspections
   - Quotations / Quotation Approval
   - Jobs / Work Execution
   - Invoices / Payments / Receipts
   - Warranty Records / Warranty Rules
   - Customer Reviews / Privacy Redaction
   - Website Publish Approval / Version History

2. For each promoted module, require:
   - table name
   - API route
   - GET list/detail
   - POST create
   - PATCH update/status
   - Audit Log writes
   - role permissions
   - degraded/error UI
   - smoke test

3. Replace static counts in generic panels with live counts only where a real API exists.

### P2 — Quality and usability improvements

1. Improve AI Intelligence page JSX readability; current page uses nested fragments that are valid but harder to audit.
2. Add route smoke for every primary menu and representative second-level anchor.
3. Add a module readiness dashboard showing each module as Live / Partial / Contract.
4. Add live API health badges per module.
5. Add owner/SLA/status filters to real task and inbox modules.

## OA/ERP go-live checklist

Go-live requires all of the following:

- [ ] Vercel deployment status success.
- [ ] GitHub Actions or equivalent CI confirms `npm run quality:gate` passes.
- [ ] Supabase migrations applied.
- [ ] `/api/ready` returns database ready with V28.2 tables.
- [ ] `npm run validate:predeploy` passes.
- [ ] `npm run audit:oa-erp` passes.
- [ ] Generic contract modules are not treated as real write workflows.
- [ ] Each live module writes Audit Logs.
- [ ] Service Operations real CRUD/status flow verified.
- [ ] Customer Portal and Internal Admin remain separated.
- [ ] Engineer remains internal role, not separate Engineer Portal.
- [ ] Global Search routes to real module records or clearly marked settings sections.

## Recommended next development sequence

1. Fix Vercel failure by reading build logs with correct Vercel scope.
2. Run local/GitHub command chain:

```bash
npm ci
npm run audit:oa-erp
npm run validate:predeploy
npm run build:ci
npm run quality:gate
```

3. Apply V28.2 Supabase migrations in staging.
4. Verify `/api/ready` and Dashboard workflow live data.
5. Promote Service Operations from partial to fully live module-by-module.
6. Promote Website Management publish/version modules.
7. Promote Customer Reviews and PDPA workflows.
8. Add smoke tests for promoted modules.

## Final assessment

Current system score against strict OA/ERP go-live standard:

```txt
Architecture coverage:       88 / 100
Menu completeness:           95 / 100
Right-side module clarity:   82 / 100 after fix
Real API/data truthfulness:  68 / 100
Operational writability:     62 / 100
Audit/security baseline:     84 / 100
Deployment readiness:        NO-GO due to Vercel failure
Overall OA/ERP readiness:    74 / 100
```

The system has strong architecture and menu coverage, but it is not yet a full OA/ERP production system until the high-value business modules are promoted from scaffold/partial UI to verified live CRUD workflows.
