# NANOFIX V28.6.2 + V28.6.9 Batch A Repair Report

Date: 2026-06-08
Branch: `v28-6-2-service-ops-public-rbac-repair`
Base memory doc: `docs/NANOFIX_V28_6_OA_ERP_REAL_MODULE_REPAIR_PLAN_20260608.md`

## Scope

This is the first implementation step for the V28.6 module-based repair plan.

Batch A covers:

1. `V28.6.2 Service & Order Operations`
2. `V28.6.9 Public Website / Global Search / RBAC / RLS` foundational checks

This batch does not mutate production Supabase, does not reset production, does not disable RLS, and does not edit `main` directly.

## Commits

- `0e001ea54ff32b124ba362d2066cd60e53ce9e7c` — aligned Service Operations Live Core with production schema and wired create/update status transition logging.
- `5fc895ffa865f373837893bd88b53fe4edbbd8fe` — added static verifier for V28.6 Batch A Service Operations/Public/RBAC checks.
- `5898f96eb18d0eee381add0ffd55cd59fd8e1859` — added initial JSON repair report.
- `422b7a9862ef9781b494013120d7fdbb53951b1c` — added initial Markdown repair report.
- `ad9ef0d3b1f25d76de3fcb5da7d0b41e35a7442d` — hardened Global Search role scope and production fields.
- `ad715f57051794ce5e89d6e8f2e8872530961093` — extended the Batch A verifier to cover Global Search RBAC and production-field checks.
- `1384bb3ae1dbf88abd4f32c3b0f97c7e61ec62a7` — updated JSON repair report after Global Search hardening.

## Repaired Files

- `app/api/admin/service-operations/route.ts`
- `app/api/global-search/route.ts`

## Added / Updated Verifier

- `tools/verify-v28-6-2-service-ops-public-rbac.mjs`

Run with:

```bash
node tools/verify-v28-6-2-service-ops-public-rbac.mjs
```

The verifier writes:

- `V28_6_2_SERVICE_OPS_PUBLIC_RBAC_REPAIR_REPORT.json`
- `V28_6_2_SERVICE_OPS_PUBLIC_RBAC_REPAIR_REPORT.md`

## What Was Fixed

### 1. Service Operations Live Core production schema alignment

The Live Core route previously still used older field patterns while the V28.5 full-chain API had already been aligned to production schema.

Fixed selectors include:

- `service_requests`: includes `lead_id` and `intake_id` so public submit → intake → lead → service request can be tracked.
- `jobs`: includes `quotation_id` and production-visible linkage fields.
- `quotations`: uses `version`, `total_amount`, `currency`, and `status`.
- `invoices`: uses `customer_id`, `job_id`, `quotation_id`, `total_amount`, `currency`, `status`, and `visible_to_customer`.
- `payments`: uses `invoice_id`, `customer_id`, `amount`, `currency`, `status`, and `reconciled_at`.
- `warranties`: uses `starts_on`, `ends_on`, `customer_id`, `invoice_id`, `quotation_id`, `visible_to_customer`, and `public_ref`.
- `status_transition_logs`: uses `object_type`, `object_id`, `from_status`, and `to_status`.

Deprecated field patterns removed from the Live Core route:

- `current_version`
- `approval_status`
- `starts_at`
- `ends_at`
- payment `fee` write path
- invoice `total` write path

### 2. Service Operations create path status logging

Create operations now attempt a real `status_transition_logs` insert through `writeStatusTransitionLog()` when a created record has an initial status.

The audit payload records:

- `status_transition_logged: true` when logging succeeds
- `status_transition_logged: false` when the status log write was skipped or failed

This prevents fake status-log success.

### 3. Service Operations update path status logging

Update operations now compare previous status and updated status. If the status column changed, the route attempts to write `status_transition_logs` through `writeStatusTransitionLog()`.

This improves the V28.6 finding that status logging was incomplete beyond initial public service request creation.

### 4. Existing transaction RPC preserved

Explicit status transitions still use the existing `transition_status_tx` RPC path. This avoids replacing the transaction flow with a larger risky rewrite.

### 5. Global Search role scope and production fields hardened

Global Search was updated so sensitive business data search is role-scoped and auditable.

Changes include:

- `search_all_records` RPC is now gated through `rpcAllowed`.
- Full sensitive RPC access is limited to `super_admin`, `operations_admin`, `finance`, and `support`.
- `content_admin` no longer receives full global business RPC results.
- Fallback search is split between sensitive business categories and content/operations categories.
- Invoice fallback now uses `total_amount` and `currency` instead of deprecated `total`.
- Job fallback now uses `notes` instead of deprecated `completion_notes`.
- Search audit logs include role, `rpc_allowed`, result counts and request IP.

## Public Submit / RBAC Foundation Confirmed for Batch A

The verifier checks the existing public submit and RBAC foundation:

- `app/api/service-requests/route.ts` writes `unified_intake`, `leads`, and `service_requests`.
- It writes a real public service request status transition log.
- It writes audit logs with `status_transition_logged` result.
- It fails explicitly when Supabase is not configured, instead of returning fake success.
- `app/api/global-search/route.ts` now applies role-scoped search and production-field whitelisting.
- `lib/apiSecurity.ts` resolves users through Supabase auth tokens and profile/admin profile lookup.
- Internal secret fallback remains disabled by default and requires explicit env enabling.

## Remaining Work in Batch A

This is the start of the repair plan, not the full completion of V28.6.

Remaining Batch A work:

1. Run the new verifier in local/CI.
2. Run `npm run validate:predeploy`.
3. Run `npm run build:ci`.
4. Review public upload / Storage binding so images/videos are not fake-success uploads.
5. Continue customer account claim / customer record link RLS only through preview/staging verification, not blind production apply.
6. Continue later batches only after Batch A verifier and build gates are reviewed.

## Safety Notes

- No direct `main` edit.
- No PR #20 / PR #21 / final-clean / rebased / probe / marker branch continuation.
- No production Supabase mutation.
- No production database reset.
- No blind migration repair.
- No RLS disable.
- No TypeScript or ESLint bypass.
- No production tag overwrite.
- No fake success / mock data / localStorage business-state fallback added.

## Acceptance Status

Current status: **Batch A started. Service Operations Live Core and Global Search foundational repairs have been committed.**

Not yet complete until:

```bash
node tools/verify-v28-6-2-service-ops-public-rbac.mjs
npm run validate:predeploy
npm run build:ci
```

pass in a local/CI environment.
