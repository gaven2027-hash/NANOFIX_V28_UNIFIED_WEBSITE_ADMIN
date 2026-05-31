# NANOFIX V28.2 Pre-Live Runbook

Date: 2026-05-31
Repository: `gaven2027-hash/NANOFIX_V28_UNIFIED_WEBSITE_ADMIN`
Default branch: `main`
Production domain: `https://www.nanofixsg.com`

## Current Status

The application is a Production Candidate, but the latest checked GitHub status showed a Vercel deployment failure for commit `0dbaf447e062a67289dc432550547b81c8e5e2bc`.

Do not declare Production Ready until the Vercel build failure is resolved and `/api/ready` returns `ok: true` and `database_ready: true` in the production environment.

## Critical Gates Now Wired

`npm run validate:predeploy` must cover:

- Customer Portal financial security
- SEO/AEO structured data
- Phase E core business OA
- Service Operations main chain
- API/Migration/RLS readiness
- Ready endpoint full business chain
- Supabase production audit
- Warranty auto-generation
- Warranty claim workflow
- Warranty satisfaction workflow
- Payment intent / webhook / checkout
- Invoice PDF / quotation PDF
- Static scan, OA/ERP audit, ad center, package validation, platform validation

## Required Local Update

Run from the existing local project folder:

```bash
git status
git pull origin main
npm install
```

If local files are messy or not connected to Git:

```bash
cd C:\Users\%USERNAME%\Desktop
git clone https://github.com/gaven2027-hash/NANOFIX_V28_UNIFIED_WEBSITE_ADMIN.git
cd NANOFIX_V28_UNIFIED_WEBSITE_ADMIN
npm install
```

## Required Predeploy Validation

Run:

```bash
npm run validate:predeploy
npm run build:ci
npm run test:e2e:smoke
```

If any command fails, do not deploy production.

## Required Vercel Checks

Because `.vercel/project.json` is not committed, confirm these manually in Vercel:

1. Project: `nanofix-v28-unified`
2. Git repository connected to `gaven2027-hash/NANOFIX_V28_UNIFIED_WEBSITE_ADMIN`
3. Production branch: `main`
4. Framework preset: Next.js
5. Build command: `npm run build` or project default using `package.json`
6. Install command: `npm install`
7. Node.js version compatible with `package.json` engines: `>=20.11.0 <23`

## Required Environment Variables

Production Vercel must have:

```txt
NEXT_PUBLIC_SITE_URL=https://www.nanofixsg.com
NEXT_PUBLIC_SUPABASE_URL=<Supabase URL>
SUPABASE_URL=<Supabase URL>
SUPABASE_SERVICE_ROLE_KEY=<Service Role Key>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<Anon Key if used>
```

Never expose service role key to browser code.

## Required Production Health Check

After deployment, open:

```txt
https://www.nanofixsg.com/api/ready
```

Required result:

```json
{
  "ok": true,
  "database_ready": true,
  "supabase_configured": true
}
```

Every item in `required_tables` must show:

```json
{
  "ok": true
}
```

The required business chain includes:

- `service_requests`
- `jobs`
- `service_inspections`
- `quotations`
- `quotation_versions`
- `quotation_acceptances`
- `invoices`
- `payments`
- `payment_intents`
- `warranties`
- `warranty_pdf_documents`
- `warranty_claims`
- `status_transition_logs`
- `audit_logs`

## Required Customer Portal Security Smoke Test

Test with two different customer accounts:

1. Customer A can see only Customer A quotations, invoices, payments and warranties.
2. Customer A cannot see Customer B records.
3. Customer can accept, decline or request revision for quotations.
4. Customer cannot edit quotation, invoice, payment or warranty records.
5. Customer can view/download customer-visible PDFs only.
6. Financial read creates audit log entry `customer_portal_financial_read`.

## Required Admin / Operations Smoke Test

Run one full internal workflow:

```txt
Public service request
→ Service Request
→ Create Job
→ Assign Engineer
→ Submit Inspection Result
→ Create Quotation
→ Customer Accepts Quotation
→ Prepare/Issue Invoice
→ Create Payment Intent
→ Mark Payment Paid
→ Complete Job
→ Auto Generate Warranty
→ Customer Views Warranty
→ Customer Submits Warranty Claim
→ Internal Review / Route / Close Claim
→ Customer Satisfaction Follow-up
```

## Go / No-Go

### GO only if:

- `npm run validate:predeploy` passes
- `npm run build:ci` passes
- Vercel deployment is successful
- `/api/ready` returns `ok: true`
- Supabase required tables all return `ok: true`
- Customer portal isolation test passes
- Admin workflow smoke test passes

### NO-GO if:

- Vercel deployment remains failed
- `/api/ready` returns 503
- any required table is missing
- customer can access another customer's data
- customer can modify invoice/payment/warranty records
- audit logs are not written for sensitive actions

## Honest Production Status

Until the Vercel failure is resolved and production `/api/ready` is green, the system should be described as:

```txt
NANOFIX V28.2 Production Candidate
```

After all gates pass, it may be described as:

```txt
NANOFIX V28.2 Production Ready
```
