# NANOFIX V28.6.3 Website CMS Real Module Audit Report

- Generated at: 2026-06-08T14:24:29.294Z
- Verifier: verify-v28-6-3-website-cms-real-module-audit
- Overall: PASS

## Checked

- Required marker checks: 4
- CMS/API candidate files: 124
- CMS/UI candidate files: 182
- Migration files scanned: 47

## Schema Presence

| Marker | Result | Files |
|---|---|---|
| website_pages | PASS | supabase/migrations/20260523_v28_production_hardening.sql<br>supabase/migrations/20260604_v28_4_3_website_cms_schema_alignment.sql<br>supabase/migrations/20260604_v28_4_4_website_cms_real_content_seed.sql |
| website_content_blocks | PASS | supabase/migrations/20260523_v28_production_hardening.sql<br>supabase/migrations/20260604_v28_4_3_website_cms_schema_alignment.sql<br>supabase/migrations/20260604_v28_4_4_website_cms_real_content_seed.sql |
| website_media_assets | FAIL |  |
| website_page_versions | FAIL |  |
| audit_logs | PASS | supabase/migrations/20260521_central_admin_backend.sql<br>supabase/migrations/20260523_0000_unified_website_admin_schema_bridge.sql<br>supabase/migrations/20260523_v28_production_hardening.sql<br>supabase/migrations/202605300001_warranty_claim_admin_review.sql<br>supabase/migrations/202605300002_warranty_claim_job_quotation_routing.sql<br>supabase/migrations/202605300004_warranty_claim_completion_closure.sql<br>supabase/migrations/202605300005_warranty_claim_satisfaction.sql |
| published | PASS | supabase/migrations/20260521_central_admin_backend.sql<br>supabase/migrations/20260522_v28_enhancements.sql<br>supabase/migrations/20260523_0000_unified_website_admin_schema_bridge.sql<br>supabase/migrations/20260523_v28_production_hardening.sql<br>supabase/migrations/20260601093000_advertising_connection_tables.sql<br>supabase/migrations/20260604_v28_4_3_website_cms_schema_alignment.sql<br>supabase/migrations/20260604_v28_4_4_website_cms_real_content_seed.sql |
| draft | PASS | supabase/migrations/20260521_central_admin_backend.sql<br>supabase/migrations/20260522_v28_enhancements.sql<br>supabase/migrations/20260523_0000_unified_website_admin_schema_bridge.sql<br>supabase/migrations/20260523_v28_production_hardening.sql<br>supabase/migrations/20260527010000_v28_1_4_advertising_center.sql<br>supabase/migrations/20260527013000_v28_1_4_advertising_center_full_loop.sql<br>supabase/migrations/202605300002_warranty_claim_job_quotation_routing.sql<br>supabase/migrations/20260601093000_advertising_connection_tables.sql |

## Required Marker Results

| ID | Result | Severity | File | Missing |
|---|---|---:|---|---|
| api_admin_website_management_exists | PASS | P0 | app/api/admin/website-management/route.ts |  |
| api_admin_cms_blocks_exists | PASS | P0 | app/api/admin/cms/blocks/route.ts |  |
| public_home_has_cms_bridge | FAIL | P1 | app/page.tsx | website, cms |
| admin_ui_has_website_management | FAIL | P1 | app/admin/[module]/page.tsx | Website Management |

## Risk Findings

- placeholder: app/api/admin/service-operations/payment-checkout-sessions/route.ts
- placeholder: app/login/LoginForm.tsx
- placeholder: app/register/RegisterForm.tsx
- placeholder: app/api/admin/service-operations/payment-checkout-sessions/route.ts

## Findings

- **P1 public_home_has_cms_bridge**: Public website should have a CMS bridge or documented CMS mapping. (app/page.tsx) missing: website, cms
- **P1 admin_ui_has_website_management**: Admin UI should expose Website Management workspace. (app/admin/[module]/page.tsx) missing: Website Management
- **P1 schema_missing_website_media_assets**: CMS schema marker missing: website_media_assets (supabase/migrations) missing: website_media_assets
- **P1 schema_missing_website_page_versions**: CMS schema marker missing: website_page_versions (supabase/migrations) missing: website_page_versions
