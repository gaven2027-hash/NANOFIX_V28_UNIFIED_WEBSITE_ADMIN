# V28.6.9.1 RPC / SECURITY DEFINER / search_path Hardening Report

Generated: 2026-06-09T12:20:00.000Z

OK: true

## Summary

- P0: 0
- P1: 0
- P2: 0
- Server RPCs covered: 6
- Touch functions covered: 7
- Policy helpers documented: 2

## Scope

This batch adds a safe Supabase migration to harden direct execution grants for server-side transaction RPCs and trigger helper functions, while keeping RLS policy-bound helpers usable for authenticated policy evaluation.

## Covered Server-side RPCs

- `auto_generate_warranty_after_job_completion`
- `close_warranty_claim_tx`
- `confirm_warranty_claim_satisfaction_tx`
- `create_unified_task_with_inbox`
- `review_warranty_claim_tx`
- `route_warranty_claim_tx`

## Covered Touch Functions

- `warranty_pdf_documents_touch_updated_at`
- `nanofix_touch_updated_at`
- `payment_intents_touch_updated_at`
- `payment_checkout_sessions_touch_updated_at`
- `document_company_settings_touch_updated_at`
- `customer_portal_requests_touch_updated_at`
- `warranty_claims_touch_updated_at`

## Production Apply Note

Do not apply blindly. Apply only after local review, then verify production advisors and function privileges.

## Findings

- No static findings.
