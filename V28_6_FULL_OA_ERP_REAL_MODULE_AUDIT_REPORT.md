# NANOFIX V28.6 Full OA/ERP Real Module Audit Report

- Branch: `v28-6-0-full-oa-erp-real-module-audit`
- Base commit: `2ad06bd507a23b5c7f11f18e652cd2c09f7dfc82`
- Mode: initial static audit baseline; run `node tools/verify-v28-6-full-oa-erp-real-module-audit.mjs` to refresh exact scan output.
- Scope: `app/**`, `app/admin/**`, `app/api/**`, `components/**`, `lib/**`, `supabase/migrations/**`, `tools/verify-*.mjs`
- No business-code repair is included in this phase.

## P0-P8 Initial Module Scores

| Module | Initial Score | Status | Main Risk |
|---|---:|---|---|
| Dashboard, Analytics & Alerts | 66 | needs_runtime_verifier_and_browser_smoke_test | static KPI cards risk; missing live aggregation risk; audit/status coverage must be verified |
| Service & Order Operations | 72 | partial_real_chain_candidate | request-job-quotation-invoice-payment-warranty chain must be route-reviewed; status_transition_logs incomplete beyond public service request creation |
| Website Management / CMS | 70 | partial_real_cms_candidate | public rendering must be proven from CMS data; draft/preview/publish/rollback/versioning need full verification; media binding and audit logs need full verification |
| Social Media Management | 56 | likely_partial_or_graceful_degradation | third-party platform binding may be disabled; AI draft review and platform preview need real API verification |
| AI Intelligence Center | 56 | likely_partial_or_graceful_degradation | AI settings/logs/costs/external web search must be verified; unconfigured services must degrade clearly without fake success |
| Customer Center | 64 | needs_binding_and_security_review | customer_account_claims/customer_record_links RLS was still staged after V28.5; freeze/blacklist/reset/archive audit coverage must be verified |
| Customer Portal | 76 | strong_partial_candidate | own-record isolation requires browser and RLS verification; quote/payment/PDF/warranty/timeline linkage must be checked end-to-end |
| Website & System Settings / Backup | 58 | needs_real_backup_download_restore_verification | backup history/download/restore may be shell-only; sensitive export and audit boundaries must be verified |
| Public Website / Global Search / RBAC / RLS Layer | 68 | needs_public_to_internal_linkage_review | public submit/register/login/upload/global-search must prove real APIs and correct role boundaries; Turnstile/OTP/Storage unconfigured paths must not fake success |

## Core Chain Initial Scores

| Chain | Initial Score | Required Checks |
|---|---:|---|
| chain_A_public_submit_register_login | 68 | public submit route; real POST API; unified_intake/leads/service_requests/customers/profiles/customer_record_links linkage; Storage upload binding; Customer Portal-only login boundary; audit/status logs |
| chain_B_website_cms_publish_render | 70 | website_pages read; website_content_blocks edit; draft/preview/publish state; SEO/AEO/FAQ/Schema/meta/internal links; Media Library upload/replace; public website renders CMS data; version/history/rollback |
| chain_C_full_oa_erp_timeline | 72 | customer_id; lead_id; service_request_id; job_id; quotation_id; invoice_id; payment_id; warranty_id; Customer Portal timeline; Admin Dashboard/Reports/Audit Logs |

## Seed Blocking Findings

- **P0_REVIEW / All P0-P8 modules:** Runtime verifier must be executed on the branch before marking any module real-operable.
- **P0_REVIEW / Customer Account Claiming / Customer Record Linking:** V28.5 report already noted production RLS remained unresolved for customer_account_claims/customer_record_links until deliberate preview/staging or controlled production verification.
- **P3_PARTIAL / Service Operations Main Chain:** V28.5 report noted status_transition_logs integration was connected to public service_request creation, while job/quotation/invoice/payment/warranty routes still needed route-level review.

## Repair Order After Report Review

1. V28.6.1 P0 Dashboard
2. V28.6.2 P1 Service & Order Operations
3. V28.6.3 P2 Website CMS
4. V28.6.4 P3 Social Media
5. V28.6.5 P4 AI Center
6. V28.6.6 P5 Customer Center
7. V28.6.7 P6 Customer Portal
8. V28.6.8 P7 Settings / Backup
9. V28.6.9 P8 Public Website / Global Search / RBAC / RLS

## Safety Notes

- No Supabase production mutation.
- No production database reset.
- No blind migration repair.
- No RLS disable.
- No TypeScript or ESLint bypass.
- No production tag overwrite.
- Do not continue PR #20, PR #21, final-clean, rebased, probe, or marker branches.
