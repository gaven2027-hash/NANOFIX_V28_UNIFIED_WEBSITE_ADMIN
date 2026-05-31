# NANOFIX V28.2 Phase F Live Production Audit

Date: 2026-05-31
Scope: Phase E core business OA chain and production readiness.

## Purpose

This document separates visual/OA completion from production-live completion.

A module is not considered fully live just because a page or workspace exists. A module is production-live only when it has:

1. Guarded Admin API or Customer Portal API
2. Supabase table or RPC migration evidence
3. RLS enabled and role policies defined
4. Audit log writes for all sensitive operations
5. No client-side fake success
6. Degraded or blocked state when API is unavailable
7. Predeploy verifier coverage

## Status Legend

- LIVE: UI/workspace, API, database/migration, RLS/policy, audit and predeploy evidence exist.
- PARTIAL: UI/workspace and verifier exist, but API/migration/RLS evidence is incomplete or still warning-only.
- MISSING: Required production element is absent.

## Current Phase E Main Chain

| Chain Step | UI/OA Workspace | Page Mounted | API Evidence | Migration/RLS Evidence | Audit Evidence | Current Status |
|---|---:|---:|---:|---:|---:|---|
| Service Request List | Yes | Yes | Warning-only | Warning-only | Warning-only | PARTIAL |
| Service Request Detail | Yes | Yes | Warning-only | Warning-only | Warning-only | PARTIAL |
| Create Job | Yes | Yes | Warning-only | Warning-only | Warning-only | PARTIAL |
| Assign Engineer | Yes | Yes | Warning-only | Warning-only | Warning-only | PARTIAL |
| Inspection Result | Yes | Yes | Warning-only | Warning-only | Warning-only | PARTIAL |
| Quotation Live | Yes | Yes | Existing quote/customer portal verifiers plus warning-only live API | Warning-only | Partial | PARTIAL |
| Quotation Acceptance Bridge | Yes | Yes | Customer Portal quote acceptance verifier exists | Partial | Partial | PARTIAL |
| Invoice Live | Yes | Yes | Invoice PDF verifier exists, live invoice API warning-only | Warning-only | Partial | PARTIAL |
| Payment Live | Yes | Yes | Payment intent/webhook/checkout verifiers exist, live payment API warning-only | Warning-only | Partial | PARTIAL |
| Warranty Auto Generation | Yes | Yes | Warranty auto-generation verifier exists | Existing verifier evidence | Existing verifier evidence | PARTIAL/LIVE-CANDIDATE |
| Warranty Claim | Yes | Yes | Warranty claim workflow verifiers exist | Existing verifier evidence | Existing verifier evidence | LIVE-CANDIDATE |
| Warranty Satisfaction | Yes | Yes | Satisfaction analytics/notification/audit verifiers exist | Existing verifier evidence | Existing verifier evidence | LIVE-CANDIDATE |

## Completed Gates

The following gates exist and are wired into `validate:predeploy`:

- `verify:phase-e-core-business-oa`
- `verify:phase-e-service-ops-main-chain`
- `verify:phase-e-api-migration-rls-readiness`
- `verify:warranty-auto-generation`
- `verify:warranty-claim-workflow`
- `verify:warranty-satisfaction-predeploy-consolidation`
- `verify:payment-intent`
- `verify:payment-webhook`
- `verify:payment-checkout`
- `verify:invoice-pdf`
- `verify:quotation-pdf`

## Current Honest Readiness

### UI/OA Layer

Status: LIVE

Evidence:

- Phase E core business registry exists.
- Main Service Operations chain workspaces exist.
- Service Operations page mounts the main chain in order.
- Workspaces show blocked/degraded state instead of fake success.
- Internal Admin remains blue theme.
- Customer Portal orange/gold theme remains scoped.

### Production API Layer

Status: PARTIAL

Reason:

The Phase E API/Migration/RLS verifier checks for expected guarded API routes, but missing API routes are warning-level until the API implementation is complete. This prevents false LIVE status.

Required guarded API routes:

- `/api/admin/service-operations/service-request-list`
- `/api/admin/service-operations/service-request-detail`
- `/api/admin/service-operations/create-job-from-request`
- `/api/admin/service-operations/assign-engineer`
- `/api/admin/service-operations/inspection-result`
- `/api/admin/service-operations/quotation-live`
- `/api/admin/service-operations/quotation-acceptance-bridge`
- `/api/admin/service-operations/invoice-live`
- `/api/admin/service-operations/payment-live`

### Database / Migration / RLS Layer

Status: PARTIAL

Required migration evidence:

- `service_requests`
- `jobs`
- `quotations`
- `invoices`
- `payments`
- `warranties`
- `audit_logs`
- `status_transition_logs`

Required RLS evidence:

- `ALTER TABLE ... ENABLE ROW LEVEL SECURITY`
- role-aware policies for internal users and customer portal users
- no customer access to internal admin records outside own customer scope
- no customer mutation of quotation/invoice/warranty/payment records

### Audit Layer

Status: PARTIAL

Required audit actions:

- service request read/create/update/status transition
- job create/assign/progress/close
- inspection result submit
- quotation draft/revise/approve/reject/customer-visible state
- customer quotation accept/reject
- invoice draft/approve/issue/void/customer-visible state
- payment create intent/reconcile/mark paid/refund/fail
- warranty auto-generate/download/customer-visible state

## Production Go/No-Go

### GO for UI/OA acceptance

The UI/OA chain is ready for review.

### NO-GO for full production-live declaration

Do not declare Phase E fully live until:

1. All required API routes exist.
2. Each route uses role checks such as `requireActorApi`, `requireAdminApi`, or equivalent.
3. Each route writes audit logs for sensitive operations.
4. Each route avoids unsafe `select('*')`.
5. Supabase migration evidence exists for all required tables.
6. RLS and policy evidence exists for all sensitive tables.
7. Staging Supabase smoke tests pass.
8. `npm run validate:predeploy` passes.
9. `npm run build:ci` passes.
10. Customer Portal permissions are manually tested for read-only quotation/invoice/warranty/payment behavior.

## Next Implementation Batches

### Phase F.1 API Hardening

Implement guarded routes for:

1. service-request-list
2. service-request-detail
3. create-job-from-request
4. assign-engineer
5. inspection-result
6. quotation-live
7. quotation-acceptance-bridge
8. invoice-live
9. payment-live

### Phase F.2 Supabase Migration / RLS Hardening

Add or verify migrations for:

- primary tables
- status transition logs
- audit logs
- indexes for customer_id, service_request_id, job_id, quotation_id, invoice_id, payment_id, warranty_id
- RLS policies
- least-privilege RPCs where direct table mutation is not appropriate

### Phase F.3 Staging Smoke

Run:

- create public service request
- create job from request
- assign engineer
- submit inspection result
- create quotation
- customer accepts quotation
- issue invoice
- create payment intent
- mark payment paid
- complete job
- auto-generate warranty
- customer views/downloads warranty PDF
- submit warranty claim
- close warranty claim
- submit satisfaction confirmation

## Current Rating

| Layer | Rating |
|---|---:|
| UI / OA pages | 98-100 |
| Admin navigation | 100 |
| Customer Portal boundary | 95-98 |
| Warranty flow | 92-96 |
| Production API proof | 55-70 |
| Migration/RLS proof | 50-70 |
| Audit proof | 70-85 |
| Overall honest production readiness | 82-88 |

## Final Note

The system should be described as Phase E UI/OA complete with Phase F production-live hardening in progress. It should not yet be described as fully production-live until API, migration, RLS and staging evidence are all green.
