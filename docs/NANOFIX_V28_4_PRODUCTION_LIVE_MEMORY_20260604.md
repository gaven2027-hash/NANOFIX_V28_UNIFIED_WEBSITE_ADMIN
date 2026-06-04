# NANOFIX V28.4 Production Live Repair Memory — 2026-06-04

This document is the canonical continuation memory for the NANOFIX V28 / Next.js + Vercel + Supabase + GitHub production work completed around 2026-06-03/2026-06-04.

Use this file as the first reference when continuing future development, smoke testing, deployment, bug fixing, or production hardening.

---

## 1. Current Production Baseline

- GitHub repo: `gaven2027-hash/NANOFIX_V28_UNIFIED_WEBSITE_ADMIN`
- Branch: `main`
- Code baseline commit: `e340f1b` — `V28.3 enable strict build gates`
- Production tag: `v28.4-production-live-20260604`
- Vercel domain: `https://app.nanofixsg.com`
- Supabase project ref: `qjwcjttdyzsgexswbygt`
- Production status: `LIVE`
- Strict build gates: enabled
- Local working tree after cleanup: clean

Confirmed live readiness:

```text
/api/ready: ok:true
database_ready:true
optional_database_ready:true
failed_core_tables: []
failed_optional_tables: []
/api/system/health: ok:true
readiness_score: 83
```

The score remains 83 only because optional/future enhancement env vars are not configured yet:

```text
ADMIN_REPAIR_REQUEST_URL=false
CLOUDFLARE_TURNSTILE_SECRET_KEY=false
NEXT_PUBLIC_TURNSTILE_SITE_KEY=false
```

These do not block the current production baseline. Turnstile is an optional bot-protection hardening item. `ADMIN_REPAIR_REQUEST_URL` is for optional external central webhook forwarding.

---

## 2. Completed Phase Summary

### Phase D — Strict TypeScript / Lint / Audit Gate Repair

Completed and saved to GitHub main.

Key outcomes:

```text
Typecheck: PASS
Lint: 0 errors, warnings only
build:ci: PASS
Fast Reality Audit: P0 0 / API risks 0
Admin 0–8 Deep Audit: 100 / issues 0
Functional Closure Audit: 100 / issues 0
```

Important commits:

```text
d076752 V28.3 clear typecheck and strict audit gates
28c100c V28.3 save remaining strict gate type fixes
e340f1b V28.3 enable strict build gates
```

Important repaired areas:

- `string | null` ID cast / narrowing in admin and customer portal APIs.
- Supabase builder type narrowing issues.
- Dashboard / Website Management row spread `GenericStringError` issues.
- Customer Center document route query type issue.
- `tools/v28-admin-0-8-reality-deep-audit.mjs` ESM `module` variable crash repaired by switching residual references to `moduleDef`.
- Strict build re-enabled in `next.config.mjs`:

```ts
eslint.ignoreDuringBuilds: false
typescript.ignoreBuildErrors: false
```

Do not re-enable these temporary bypasses unless there is a controlled emergency window.

---

### Phase E — Strict Build Gates Enabled

`next.config.mjs` was changed from temporary bypass mode to strict build mode:

```ts
eslint: {
  ignoreDuringBuilds: false
},
typescript: {
  ignoreBuildErrors: false
}
```

Production build passed after this change.

---

### Phase F — Vercel Production Deploy + Online Smoke Test

Vercel production deployment completed and `https://app.nanofixsg.com` was aliased successfully.

Online auth guard tests:

```text
/login                         200 OK
/dashboard                     307 -> /login?role=admin&next=/dashboard&reason=auth_required
/service-operations            307 -> /login?role=admin&next=/service-operations&reason=auth_required
/customer-center               307 -> /login?role=admin&next=/customer-center&reason=auth_required
/website-management            307 -> /login?role=admin&next=/website-management&reason=auth_required
/system-settings               307 -> /login?role=admin&next=/system-settings&reason=auth_required
/customer-portal               307 -> /login?role=customer&next=/customer-portal&reason=auth_required
```

Security headers observed on live responses:

```text
Content-Security-Policy: present
Strict-Transport-Security: present
X-Frame-Options: SAMEORIGIN
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: present
X-Robots-Tag: noindex, nofollow
```

---

### Phase G — Supabase Production Migration Closure

Initial issue:

```text
/api/ready: ok:false
database_ready:false
failed_core_tables included multiple V28.3/V28.4 tables
```

Supabase CLI could not run normal `db push` because the remote migration history had many versions not present in local migrations:

```text
Remote migration versions not found in local migrations directory.
```

Important rule used:

```text
Do NOT run db reset.
Do NOT blindly run migration repair --status reverted.
Do NOT keep retrying db push while migration history mismatch exists.
```

Safe approach used:

1. Generated a manual SQL apply pack from selected local migrations:

```text
manual_apply_v28_3_supabase_readiness.sql
```

2. Applied it through Supabase Dashboard → SQL Editor → project `qjwcjttdyzsgexswbygt`.
3. Solved production compatibility gaps one by one.
4. Archived the manual SQL package outside repo:

```text
E:\NANOFIX_DEPLOY\_manual_applied_sql\manual_apply_v28_3_supabase_readiness_APPLIED_20260603.sql
```

Do not commit this manual SQL pack to GitHub main.

---

## 3. Supabase Manual Migration Compatibility Fixes Applied

During manual SQL application, several compatibility fixes were needed because production DB had older structure/function history.

### 3.1 Added `public.owns_customer(uuid)`

Reason:

```text
ERROR: 42883: function public.owns_customer(uuid) does not exist
```

A compatibility function was added to support policies that check customer ownership.

### 3.2 Added `jobs.customer_id`

Reason:

```text
ERROR: 42703: column j.customer_id does not exist
```

Production `jobs` table lacked `customer_id`, and warranty backfill logic referenced it. Added:

```sql
alter table public.jobs
  add column if not exists customer_id uuid references public.customers(customer_id) on delete set null;
```

Also attempted backfill from `service_requests.customer_id` when `jobs.service_request_id` existed.

### 3.3 Added `public.current_user_role()`

Reason:

```text
ERROR: 42883: function public.current_user_role() does not exist
```

Some older policy/function code used `current_user_role()` rather than the newer role helper. Added compatibility wrapper returning active profile role by `auth.uid()`.

### 3.4 Added `public.warranty_claims`

Final `/api/ready` blocker:

```text
failed_core_tables: ["warranty_claims"]
```

Reason: `app/api/ready/route.ts` lists `warranty_claims` as a core table, but the V28.2 warranty claim migrations primarily added warranty claim workflow fields to `service_requests` and created `warranty_claim_messages`. A dedicated `warranty_claims` compatibility table was added manually, with indexes, RLS, policies, trigger, grants, and optional backfill from `service_requests` for customer portal warranty repair requests.

After this, `/api/ready` became fully green:

```text
ok:true
database_ready:true
optional_database_ready:true
failed_core_tables:[]
failed_optional_tables:[]
```

---

## 4. Tables Confirmed by `/api/ready`

Core required tables now pass:

```text
profiles
customers
unified_intake
leads
service_requests
jobs
service_inspections
service_upload_reviews
quotations
quotation_versions
quotation_acceptances
quotation_customer_responses
quotation_pdf_documents
invoices
invoice_pdf_documents
payments
payment_intents
payment_webhook_events
payment_checkout_sessions
warranties
warranty_pdf_documents
warranty_claims
customer_portal_requests
customer_document_feedback
unified_tasks
task_events
workflow_settings
status_transition_logs
audit_logs
document_company_settings
```

Optional module tables now pass:

```text
automation_rules
notification_outbox
internal_inbox_messages
content_drafts
ai_logs
backup_jobs
app_modules
customer_account_claims
customer_record_links
```

---

## 5. Production Tag

Production baseline tag was created and pushed:

```powershell
git tag -a v28.4-production-live-20260604 -m "V28.4 Production Live - strict gates, Vercel ready, Supabase readiness clear"
git push origin v28.4-production-live-20260604
```

Confirmed latest local log before tag:

```text
e340f1b (HEAD -> main, origin/main, origin/HEAD) V28.3 enable strict build gates
28c100c V28.3 save remaining strict gate type fixes
d076752 V28.3 clear typecheck and strict audit gates
01d1bb8 V28.3 add deep audit moduleDef repair
a0ad72d V28.3 add final id cast typecheck patcher
```

---

## 6. Current Post-Production Checks

Use these commands for repeated production checks:

```powershell
curl.exe https://app.nanofixsg.com/api/ready
curl.exe https://app.nanofixsg.com/api/system/health
curl.exe -I https://app.nanofixsg.com/login
curl.exe -I https://app.nanofixsg.com/dashboard
curl.exe -I https://app.nanofixsg.com/service-operations
curl.exe -I https://app.nanofixsg.com/customer-center
curl.exe -I https://app.nanofixsg.com/customer-portal
```

Expected results:

```text
/api/ready -> ok:true
/api/system/health -> ok:true, readiness_score currently 83
/login -> 200 OK
/dashboard -> 307 to admin login when unauthenticated
/service-operations -> 307 to admin login when unauthenticated
/customer-center -> 307 to admin login when unauthenticated
/customer-portal -> 307 to customer login when unauthenticated
```

---

## 7. Next Phase — Browser Real-Business Smoke Test

Do not start broad code changes immediately. Next step is browser-based real business testing.

Test checklist:

1. Admin login.
2. Dashboard loads real data.
3. Service Operations opens correctly.
4. Create/update a service request or job.
5. State transition writes to `status_transition_logs` and `audit_logs`.
6. Customer Center opens customer records.
7. Website Management CMS opens.
8. Customer Portal redirects/logs in correctly.
9. Public Repair Request submits and enters `unified_intake`, `leads`, and/or `service_requests` as designed.
10. Quotation / Invoice / Warranty / PDF routes load and write correctly.
11. Check Vercel function logs for 500s.
12. Check Supabase logs for RLS / 401 / 403 / 404 errors.

Record each test as:

```text
Module:
Action:
Result: Pass / Fail
Error screenshot:
Production blocking: Yes / No
```

---

## 8. Remaining Enhancement Items

Not blockers for current production baseline:

```text
ADMIN_REPAIR_REQUEST_URL
ADMIN_REPAIR_REQUEST_WEBHOOK_SECRET
CLOUDFLARE_TURNSTILE_SECRET_KEY
NEXT_PUBLIC_TURNSTILE_SITE_KEY
NANOFIX_PUBLIC_FORM_RATE_LIMIT_MAX
```

Recommended future hardening order:

1. Configure Turnstile for public forms.
2. Configure public form rate limit.
3. Configure central admin repair webhook only if external forwarding is needed.
4. Run real-browser service request submission tests.
5. Add a repository migration that formalizes the manually applied production compatibility fixes so future environments do not need manual patching.

---

## 9. Critical Cautions for Future Work

- Do not run `supabase db reset` on production.
- Do not run migration repair blindly against production migration history.
- Do not re-enable `typescript.ignoreBuildErrors` or `eslint.ignoreDuringBuilds` unless explicitly approved as a temporary emergency.
- Do not commit manual generated SQL packs or `supabase/.temp` to GitHub.
- Keep `NANOFIX_ADMIN_TOKEN_FALLBACK_ENABLED=false` in production unless a controlled migration window is approved.
- Keep service role key server-only. Never expose it to client code.

---

## 10. New Chat Continuation Prompt

Use the following prompt to continue in a new ChatGPT conversation:

```text
继续 NANOFIX V28.4 Production Live 项目。
请以 GitHub 文档 docs/NANOFIX_V28_4_PRODUCTION_LIVE_MEMORY_20260604.md 作为最新项目记忆依据。
当前生产基准：GitHub main e340f1b，tag v28.4-production-live-20260604，Vercel 域名 https://app.nanofixsg.com，Supabase ref qjwcjttdyzsgexswbygt。
已完成：strict build gates 开启，typecheck/lint/build/audit 全部通过，Vercel Production Ready，/api/ready ok:true，database_ready:true，optional_database_ready:true，failed_core_tables:[]，failed_optional_tables:[]。
当前 /api/system/health ok:true，readiness_score 83，剩余未配置增强项是 ADMIN_REPAIR_REQUEST_URL、CLOUDFLARE_TURNSTILE_SECRET_KEY、NEXT_PUBLIC_TURNSTILE_SITE_KEY。
下一步进入浏览器真实业务 Smoke Test：Admin 登录、Dashboard、Service Operations、Customer Center、Website Management、Customer Portal、Public Repair Request、状态流转与 audit_logs/status_transition_logs 写入检查。
不要重置 Supabase 生产库，不要盲目 migration repair，不要重新打开 TypeScript/ESLint build bypass。
```
