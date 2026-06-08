# NANOFIX V28.6 OA/ERP Real Module Audit + Repair Plan Memory

Date: 2026-06-08
Branch: `v28-6-0-full-oa-erp-real-module-audit`
Valid base commit: `2ad06bd507a23b5c7f11f18e652cd2c09f7dfc82`
Repository: `gaven2027-hash/NANOFIX_V28_UNIFIED_WEBSITE_ADMIN`
Production domain: `https://app.nanofixsg.com`
Valid merged PR: PR #19, `V28.5 Real Module Linkage Batch Audit + Schema Hardening`

## 0. New Chat Continuation Instruction

When continuing NANOFIX V28.6 work in a new chat, use this document as the current execution memory and repair standard.

Continue only from the valid V28.6 baseline:

- GitHub repo: `gaven2027-hash/NANOFIX_V28_UNIFIED_WEBSITE_ADMIN`
- Valid main merge commit: `2ad06bd507a23b5c7f11f18e652cd2c09f7dfc82`
- Valid base PR: PR #19 only
- Working branch for the audit/report baseline: `v28-6-0-full-oa-erp-real-module-audit`

Do not continue PR #20, PR #21, final-clean, rebased, probe, marker branches, temporary marker files, GitHub connector large-file concatenation, direct main edits, production Supabase reset, blind production migration repair, RLS disable, TypeScript/ESLint bypass, or production tag overwrite.

The next development direction is not scattered bug fixing. All future work must be module-based, with each V28.6.x batch completing page workspace, API, Supabase read/write, RBAC/RLS, audit logs, status transition logs, verifier, report, and deployment checks.

## 1. Current Audit Result Summary

V28.6 is a full-system OA/ERP real-module audit and repair phase. The initial report is a conservative static audit baseline, not a final runtime/browser acceptance result.

Existing audit/report files:

- `tools/verify-v28-6-full-oa-erp-real-module-audit.mjs`
- `V28_6_FULL_OA_ERP_REAL_MODULE_AUDIT_REPORT.json`
- `V28_6_FULL_OA_ERP_REAL_MODULE_AUDIT_REPORT.md`

The initial report states that no P0-P8 module can yet be marked fully real-operable until the runtime verifier and browser smoke tests are executed and reviewed.

Initial module scores:

| Module | Initial Score | Current Status |
|---|---:|---|
| P0 Dashboard, Analytics & Alerts | 66 | needs runtime verifier and browser smoke test |
| P1 Service & Order Operations | 72 | partial real chain candidate |
| P2 Website Management / CMS | 70 | partial real CMS candidate |
| P3 Social Media Management | 56 | likely partial or graceful degradation |
| P4 AI Intelligence Center | 56 | likely partial or graceful degradation |
| P5 Customer Center | 64 | needs binding and security review |
| P6 Customer Portal | 76 | strong partial candidate |
| P7 Website & System Settings / Backup | 58 | needs real backup/download/restore verification |
| P8 Public Website / Global Search / RBAC / RLS Layer | 68 | needs public-to-internal linkage review |

Core chain initial scores:

| Chain | Initial Score | Required Focus |
|---|---:|---|
| A. Public Submit Request / Repair / Warranty Tracking / Customer Register & Login | 68 | public submit, real POST API, database linkage, Storage upload, customer-only portal, audit/status logs |
| B. Website Management / CMS / SEO-AEO / Public Rendering | 70 | website pages, content blocks, draft/preview/publish, SEO/AEO/FAQ/schema/media, public CMS rendering, version/rollback |
| C. Public Website -> Backend -> Customer Center -> Service Request -> Job -> Quotation -> Invoice -> Payment -> Warranty -> Customer Portal Timeline | 72 | full ID chain, timeline, dashboard/reports/audit logs |

Seed blocking findings:

1. All P0-P8 modules require runtime verifier execution before being marked real-operable.
2. Customer account claiming / customer record linking remains a P0 review area because `customer_account_claims` and `customer_record_links` RLS must be deliberately verified in preview/staging or controlled production review.
3. Service Operations status logging is still incomplete until job, quotation, invoice, payment, and warranty routes are reviewed and wired to `status_transition_logs`.

## 2. Root Problem Statement

The current system has useful real-system foundations from PR #10-#19, but it still risks falling into a pattern of scattered fixes. The root issue is not visual design; it is incomplete module-level OA/ERP reality acceptance.

A module is not considered fixed unless all of the following are true:

1. Real workspace page exists.
2. Real add/edit/search/filter/status/download/export operations exist where required.
3. Each business button has a real API route or server action.
4. API/server action performs real Supabase read/write.
5. RBAC boundary exists.
6. RLS boundary exists for customer/data isolation.
7. Key operation writes `audit_logs`.
8. State transition writes `status_transition_logs`.
9. Main IDs link across modules.
10. Third-party services degrade explicitly when not configured.
11. No fake success, mock data, demo fallback, placeholder workflow, or localStorage business state remains.

## 3. Official/Quality Standard Applied to NANOFIX

### 3.1 Next.js Security Standard

Treat Route Handlers and Server Actions as public API surfaces. Every mutation must verify authentication and authorization server-side. UI-only hiding is not security.

NANOFIX implementation rule:

- Centralize data access and authorization through functions such as `requireActor()`, `requireRole()`, `requireAdmin()`, `requireCustomer()`, `requireFinance()`, and `requireOperations()`.
- Never trust `x-admin-role`, `x-nanofix-role`, `x-customer-id`, localStorage role, or frontend-supplied `customer_id` as authority.

### 3.2 Supabase RLS Standard

All exposed business tables must have RLS policies appropriate to role and ownership.

Tables that require special review include:

- `customers`
- `profiles`
- `customer_record_links`
- `customer_account_claims`
- `service_requests`
- `jobs`
- `inspections`
- `quotations`
- `invoices`
- `payments`
- `warranties`
- `customer_documents`
- `audit_logs`
- `status_transition_logs`

Customer Portal must derive customer identity server-side from Supabase Auth user -> profile -> customer/customer links. It must never trust a customer ID submitted by the browser as proof of ownership.

### 3.3 OWASP Authorization Standard

Use deny-by-default. Every request must be authorized, not only selected routes.

NANOFIX rule:

- No session = deny.
- No role = deny.
- No module permission = deny.
- No customer ownership = deny.
- No audit log for critical action = repair not complete.
- No status transition log for state change = repair not complete.

### 3.4 Audit Logging Standard

Critical business, security, finance, customer, publishing, backup, AI, and social actions must create audit trails with who/what/when/where/target/change/result.

Actions that must write `audit_logs` include:

- customer registration
- customer login/security events
- public repair request submission
- customer binding/unbinding
- create/update service request
- create/assign/complete job or inspection
- create/send/accept/reject/revise quotation
- create/void/send invoice
- record/refund/reverse payment
- issue/revoke warranty
- download quotation/invoice/PDF/customer document
- export report/data
- freeze/blacklist/archive customer
- reset customer account
- CMS edit/publish/rollback/media replacement
- backup/download/restore
- AI generation/search/recommendation
- social draft approval/rejection/schedule/publish

Actions that must write `status_transition_logs` include state changes for:

- `service_request.status`
- `job.status`
- `inspection.status`
- `quotation.status`
- `invoice.status`
- `payment.status`
- `warranty.status`

### 3.5 Vercel Deployment Compatibility Standard

Do not rely on a persistent local filesystem in Vercel serverless runtime.

NANOFIX rule:

- Customer images/videos -> Supabase Storage.
- Quotation/invoice/warranty PDFs -> Supabase Storage.
- Backup archives -> Supabase Storage or external object storage.
- Database stores file metadata, storage path, ownership, and signed URL metadata only.
- Long-running backup/AI/social jobs must not block normal serverless API routes.

## 4. Full Problem List by Module

### P0 Dashboard, Analytics & Alerts

Current risk:

- Static KPI card risk.
- Missing live aggregation risk.
- Audit/status coverage must be verified.

Root fix:

- Build real dashboard summary API.
- Aggregate from `leads`, `service_requests`, `jobs`, `quotations`, `invoices`, `payments`, `warranties`, and alerts.
- Add date/status/role filters.
- Restrict finance-sensitive data by role.
- Write audit logs for sensitive dashboard exports and report downloads.

Acceptance:

- No hard-coded KPI numbers.
- Every KPI can be traced to Supabase tables.
- Dashboard numbers match downstream modules.

### P1 Service & Order Operations

Current risk:

- request -> job -> inspection -> quotation -> invoice -> payment -> warranty chain requires route-level review.
- `status_transition_logs` may only be wired to public service request creation, not the full chain.

Root fix:

- Create a unified service operation state machine.
- All state changes go through one controlled service/API/RPC layer.
- Every transition writes main table update + `status_transition_logs` + `audit_logs`.
- Preserve IDs: `customer_id`, `lead_id`, `service_request_id`, `job_id`, `inspection_id`, `quotation_id`, `invoice_id`, `payment_id`, `warranty_id`.

Acceptance:

- Cannot create downstream records without upstream IDs.
- Quotation, invoice, payment, and warranty are linked end-to-end.
- Customer Portal timeline reflects the same transitions.

### P2 Website Management / CMS

Current risk:

- Public rendering from CMS data is not yet proven.
- Draft/preview/publish/rollback/versioning must be verified.
- Media binding and audit logs must be verified.

Root fix:

- Use `website_pages`, `website_content_blocks`, `website_page_versions`, `media_library`, and `website_media` as real CMS data sources.
- Public website renders published CMS content first.
- Edit/publish/rollback/media replacement writes audit logs.
- SEO/AEO/FAQ/schema/meta/internal links are editable content fields.

Acceptance:

- Admin CMS edits change public website after publish.
- Preview does not alter public content before publish.
- Rollback restores prior version.

### P3 Social Media Management

Current risk:

- Platform binding may be disabled or partial.
- AI draft review and platform preview need real API verification.

Root fix:

- Store platform connection status in `social_accounts`.
- Store assets, drafts, schedules, and posts in real tables.
- If platform API is not configured, show Not Connected / Configuration Required and never show fake published success.
- Approve/reject/schedule/publish writes audit logs.

Acceptance:

- Unconfigured platform cannot show published status.
- Scheduled records persist.
- Real publish requires platform ID or explicit pending/failed state.

### P4 AI Intelligence Center

Current risk:

- AI settings/logs/costs/external web search must be verified.
- Unconfigured AI services must degrade clearly without fake success.

Root fix:

- Use `ai_settings`, `ai_logs`, `ai_usage`, `ai_costs`, `ai_alerts`, and `material_ai_suggestions`.
- Log every AI request, response summary, module, actor, token usage, cost, and error.
- Disable generation/search buttons when provider is not configured.

Acceptance:

- No AI key = no fake generation success.
- Every AI action has logs and cost/usage tracking.
- AI suggestions link back to lead/customer/service_request/content where applicable.

### P5 Customer Center

Current risk:

- `customer_account_claims` and `customer_record_links` RLS remains a P0 review area.
- freeze/blacklist/reset/archive audit coverage must be verified.

Root fix:

- Recheck customer/profile/claim/link schema and RLS.
- Search with field whitelist, not wildcard selects.
- Binding/unbinding must go through controlled API.
- Freeze, blacklist, reset, archive, soft delete must write audit logs.
- Separate Super Admin/Admin/Operations/Finance capabilities.

Acceptance:

- Customer cannot claim or view another customer's records.
- Admin customer binding is auditable.
- Finance cannot reset accounts; Operations cannot modify security status.

### P6 Customer Portal

Current risk:

- Own-record isolation requires browser and RLS verification.
- Quotation/payment/PDF/warranty/timeline linkage must be checked end-to-end.

Root fix:

- Derive `customer_id` server-side from authenticated user.
- All customer portal APIs filter by customer ownership.
- PDF/document downloads validate ownership.
- Customer accept/reject quotation writes audit and status transition logs.

Acceptance:

- Customer A cannot see Customer B records by changing URL IDs.
- Customer timeline matches backend status transitions.
- PDF downloads are logged.

### P7 Website & System Settings / Backup

Current risk:

- Backup history/download/restore may be shell-only.
- Sensitive export and audit boundaries must be verified.

Root fix:

- Use `backup_jobs`, `backup_history`, `backup_downloads`, and Storage-backed files.
- Downloads use signed URLs.
- Restore defaults to staging/controlled mode and requires Super Admin approval for production.
- Never export plaintext password, API keys, service role keys, or unmasked secrets.

Acceptance:

- Backup history is real.
- Download links are time-limited.
- Backup/download/restore actions write audit logs.
- Vercel does not rely on persistent local files.

### P8 Public Website / Global Search / RBAC / RLS Layer

Current risk:

- Public submit/register/login/upload/global search must prove real APIs and correct role boundaries.
- Turnstile/OTP/Storage unconfigured paths must not fake success.

Root fix:

- Public Submit Request writes `unified_intake`, `leads`, and `service_requests`.
- Uploads go to Supabase Storage and are bound to request/customer.
- Customer Register uses Supabase Auth + profiles + customers.
- Customer Login goes to Customer Portal only.
- Admin Login goes to Internal Admin only.
- Global Search is role-filtered and audit-logged for sensitive searches.

Acceptance:

- Public submit appears in backend intake/service operations.
- Customer cannot access Admin.
- Global search cannot leak cross-role or cross-customer data.
- No fake success when Turnstile/OTP/Storage is not configured.

## 5. High-Efficiency Repair Strategy

Future repairs must use module batches, not scattered issue patches.

Recommended high-efficiency order:

### Batch A: Business Backbone

1. V28.6.2 Service & Order Operations
2. V28.6.9 Public Website / Global Search / RBAC / RLS

Purpose: fix the full public submit -> backend -> service operations -> quote/invoice/payment/warranty route and the permission foundation.

### Batch B: Customer Ownership and Portal

3. V28.6.6 Customer Center
4. V28.6.7 Customer Portal

Purpose: fix customer identity, account linking, claim flow, ownership isolation, customer timeline, documents, quotations, invoices, payments, warranties.

### Batch C: Management and Website Operations

5. V28.6.1 Dashboard, Analytics & Alerts
6. V28.6.3 Website Management / CMS

Purpose: ensure Dashboard uses real business data and CMS actually controls the public website with versioned publish/rollback.

### Batch D: Operations Safety and Enhancements

7. V28.6.8 Website & System Settings / Backup
8. V28.6.5 AI Intelligence Center
9. V28.6.4 Social Media Management

Purpose: complete backup/download/restore, AI logging/cost/degradation, and social media workflow with real draft/review/schedule/publish states.

## 6. Required Work Products for Every V28.6.x Batch

Every module repair batch must produce or update:

1. Module workspace pages.
2. Module API routes/server actions.
3. Supabase schema/query/RPC/migration changes, if needed.
4. RBAC/RLS checks.
5. Audit logging.
6. Status transition logging where state changes are involved.
7. Module verifier script.
8. JSON repair report.
9. Markdown repair report.
10. `validate:predeploy` result.
11. `build:ci` result.

Suggested naming:

- `tools/verify-v28-6-x-[module-name].mjs`
- `V28_6_X_[MODULE_NAME]_REPAIR_REPORT.json`
- `V28_6_X_[MODULE_NAME]_REPAIR_REPORT.md`

## 7. Repair Time / Workload Planning

This is not a precise promise of calendar time. It is a workload guide for planning high-efficiency execution.

| Batch | Modules | Workload | Notes |
|---|---|---:|---|
| Batch A | V28.6.2 + V28.6.9 | Very large | Core OA/ERP chain and permission foundation. Must be done carefully. |
| Batch B | V28.6.6 + V28.6.7 | Large | Customer identity, RLS, account linking, customer portal isolation. |
| Batch C | V28.6.1 + V28.6.3 | Large | Dashboard real data and CMS public rendering. |
| Batch D | V28.6.8 + V28.6.5 + V28.6.4 | Medium to large | Backup, AI, social workflows and graceful degradation. |

Recommended engineering approach:

- Do not merge multiple unfinished modules.
- Keep each repair branch focused.
- Each batch should end with verifier/report/build evidence.
- If a batch becomes too large, split by module but never split into random button/field fixes.

## 8. Final Acceptance Target

Target module scores after staged repair:

| Module | Current Initial Score | Target Score |
|---|---:|---:|
| Service & Order Operations | 72 | 94-96 |
| Public Website / RBAC / RLS | 68 | 93-96 |
| Customer Center | 64 | 92-95 |
| Customer Portal | 76 | 94-96 |
| Dashboard | 66 | 92-95 |
| Website CMS | 70 | 92-95 |
| Settings / Backup | 58 | 88-93 |
| AI Center | 56 | 85-92 |
| Social Media | 56 | 85-92 |
| Full System | not yet final-real accepted | 92-96 |

AI and Social may target slightly lower scores until external platform credentials are fully configured, but they must still degrade clearly and never fake success.

## 9. Hard Prohibitions

Do not do any of the following:

- Directly edit main.
- Continue PR #20 or PR #21.
- Continue final-clean, rebased, probe, or marker branches.
- Create temporary marker files.
- Use GitHub connector large-file concatenation as a development method.
- Reset production Supabase.
- Blindly repair production migrations.
- Disable RLS.
- Bypass TypeScript or ESLint.
- Overwrite production tags.
- Add fake success, mock data, demo fallback, or localStorage business state.
- Trust forgeable role/customer headers.
- Use `select("*")` for sensitive admin/customer/finance queries.

## 10. Final Execution Rule

All future NANOFIX V28.6 work must follow this sentence:

> This repair is a module-level V28.6.x repair. It must not be a scattered patch. It must complete the module's workspace, API, Supabase read/write, RBAC/RLS, audit logs, status transition logs, verifier, JSON/Markdown report, and deployment checks before the module can be treated as fixed.

