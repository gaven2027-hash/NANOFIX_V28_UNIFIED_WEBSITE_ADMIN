# NANOFIX V28.7 Practical Backend Step 11 to 15

Date: 2026-06-11
Branch: v28-7-admin-menu-simplify

## Completed in this batch

### Step 11: Service and Customer real business chain foundation

Added the V28.7 Service and Customer chain registries in both SQL seed form and TypeScript registry form.

Service stages prepared:

1. Leads & Intake
2. Site Inspection
3. Quotations
4. Jobs & Scheduling
5. Engineer Tasks
6. Invoices
7. Payments
8. Warranty & Completion
9. Operations Audit

Customer stages prepared:

1. Customer Profiles
2. Customer Binding & Verification
3. Customer Portal Accounts
4. Repair Tracking
5. Quotes & Payments
6. Warranty & Documents
7. Reviews & Feedback
8. Privacy & Consent

### Step 12: API Credential Center foundation

Added integration foundation tables:

- integration_providers
- integration_credentials
- integration_test_logs
- webhook_events
- integration_outbox
- dead_letter_events

The credential table stores encrypted_payload only and includes a no-plaintext frontend warning. RLS is enabled on all new tables.

### Step 13: WhatsApp / Social / Ads staging

Seeded provider registry for:

- WhatsApp Cloud API
- Facebook Pages
- Instagram Business
- Google Business Profile
- YouTube Shorts
- TikTok Business
- X Platform
- Xiaohongshu Manual Mode
- Google Ads
- Meta Ads
- TikTok Ads
- X Ads
- Bing Ads

Provider states use the V28.7 status model: connected, auth_required, manual_mode, api_review_required, error and disabled.

### Step 14: Video Engine foundation

Added database-driven video rule tables:

- platform_video_specs
- media_transform_jobs
- media_renditions

Seeded specs for Instagram Reels, Facebook Reels, TikTok, YouTube Shorts, X landscape/square, Google Business Profile, Xiaohongshu and Ads vertical/square versions.

### Step 15: Verification and pre-PR readiness

Added verification script:

```bash
node tools/verify-v28-7-real-backend-foundation.mjs
```

The script checks:

- required V28.7 tables exist in the migration
- RLS is enabled for each new table
- migration does not drop, truncate or delete production data
- all providers are present in both SQL and TypeScript registry
- Service and Customer stages are present
- video specs are present
- credential storage includes encrypted payload and no-plaintext warning

## Files added in Step 11 to 15

- supabase/migrations/20260611_v28_7_practical_backend_foundation.sql
- data/v28.7-real-backend-registry.ts
- tools/verify-v28-7-real-backend-foundation.mjs
- docs/v28.7/step-11-to-15-execution-summary.md

## Commands to run before PR

```bash
node tools/verify-v28-7-admin-menu.mjs
node tools/verify-v28-7-real-backend-foundation.mjs
npm run typecheck
npm run lint
npm run build
```

## Next recommended action

Open a PR from v28-7-admin-menu-simplify to main after the commands above pass locally or in CI. Then use Vercel Preview for visual checks before merging to production.
