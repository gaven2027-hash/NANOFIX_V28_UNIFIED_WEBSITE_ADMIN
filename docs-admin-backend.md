# NANOFIX-V28 Central Admin Backend

This implementation adds the `/admin` total management backend preview and server contracts for the NANOFIX-V28 instruction package.

## Routes

- `/admin` - Central admin backend dashboard with seven approved centers.
- `/api/admin/search` - RLS-ready global search API with Supabase and fallback data.
- `/api/service-requests` - Quick repair / registration repair submission API that creates Unified Intake, Lead and Service Request records when Supabase is configured.
- `/api/public-repair-request` - Official public website free leak inspection / quote / repair request API.
- `/api/leads` - Compatibility alias that forwards to `/api/public-repair-request`.

## Core Rules Implemented

- One fixed Global Search with collapsible filters.
- Approved menu order:
  1. Dashboard, Analytics & Alerts
  2. Service & Order Operations
  3. Website Management
  4. Social Media Management
  5. AI Intelligence Center
  6. Customer Center
  7. Website & System Settings
- Business flow:
  Lead → Service Request → Inspection → Quotation → Approval → Job / Work Execution → Invoice → Payment → Receipt → Warranty / Claim.
- Two customer acquisition entrances are preserved:
  - `⭐️ Get a Free Quote`: no login, no registration, no OTP. This is the website repair intake with backend semantic `Free Leak Inspection & Quote`.
  - Member Sign Up / Login: separate customer portal account entrance for progress, status and repair records.
- Quick repair success page has no next-step buttons.
- Registration success pages may show:
  - `View Customer Portal / 查看客户中心`
  - `Submit Another Request / 再次提交报修`
- AI cannot auto-publish or auto-approve high-risk replies.
- QR appears in backend settings only.
- Service role keys, AI keys, WhatsApp/GMB/social tokens and backup keys remain server-only.

## Supabase

Apply `supabase/migrations/20260521_central_admin_backend.sql` to create the central admin schema, status fields, finance chain, RLS baseline, audit logs, backup jobs and PDPA request tables.

Expected environment variables:

- `SUPABASE_URL` or `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- Optional: `ADMIN_REPAIR_REQUEST_URL`
- Optional: `ADMIN_REPAIR_REQUEST_WEBHOOK_SECRET`
- Optional: `ADMIN_WEBHOOK_ENABLED`
- Optional: `NEXT_PUBLIC_MEMBER_PORTAL_URL`
- Optional: `ADMIN_MEMBER_PORTAL_URL`

## Verification

Run:

```bash
npm install
npm run build
```

The admin UI can be opened at:

```text
http://localhost:3000/admin
```
