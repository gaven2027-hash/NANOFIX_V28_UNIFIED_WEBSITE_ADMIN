# NANOFIX Website V28 Deployment Checklist

## 1. GitHub

1. Upload the V28 code package to the GitHub repository.
2. Confirm `.github/workflows/ci.yml` runs successfully.
3. Do not upload `.env` with real secrets.
4. Keep `.env.example` only as a template.

## 2. Vercel

Set the following environment variables in Vercel Project Settings:

```text
NEXT_PUBLIC_SITE_URL
NEXT_PUBLIC_SUPABASE_URL
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
NANOFIX_ADMIN_API_TOKEN
NANOFIX_WEBHOOK_SECRET
NANOFIX_PUBLIC_FORM_RATE_LIMIT_MAX
NANOFIX_PUBLIC_FORM_RATE_LIMIT_WINDOW_MS
NANOFIX_PUBLIC_FORM_MAX_FILES
NANOFIX_PUBLIC_FORM_MAX_FILE_SIZE_BYTES
NANOFIX_ALLOW_FORM_WITHOUT_SUPABASE
ADMIN_WEBHOOK_ENABLED
ADMIN_REPAIR_REQUEST_URL
ADMIN_REPAIR_REQUEST_WEBHOOK_SECRET
NEXT_PUBLIC_MEMBER_PORTAL_URL
```

Recommended production values:

```text
NANOFIX_ALLOW_FORM_WITHOUT_SUPABASE=false
ADMIN_WEBHOOK_ENABLED=true
```

## 3. Supabase

1. Apply all SQL migrations in `supabase/migrations`.
2. Confirm required tables exist:
   - `unified_intake`
   - `leads`
   - `lead_attachments`
   - `integration_outbox`
   - `audit_logs`
3. Confirm storage bucket exists:
   - `lead-attachments`
4. Confirm RLS rules are enabled according to your admin/customer portal architecture.
5. Never expose the service role key to frontend code.

## 4. Post-deployment checks

After deployment, open:

```text
/api/health
/api/ready
/sitemap.xml
/robots.txt
```

Expected:

- `/api/health` returns `ok: true`.
- `/api/ready` returns `ok: true` in production after all required environment variables are set.
- `/sitemap.xml` contains public SEO routes.
- `/robots.txt` allows public site indexing and blocks admin routes.

## 5. Public form test

1. Submit a test repair request.
2. Confirm `unified_intake` record is created.
3. Confirm `leads` record is created.
4. Confirm file uploads are saved in `lead-attachments` if attached.
5. Confirm `audit_logs` records the public submission.
6. Confirm `integration_outbox` contains forwarding status.

## 6. Rollback

If deployment has an issue:

1. Roll back to the previous Vercel deployment.
2. Keep Supabase migrations unchanged unless a migration itself caused the issue.
3. Check `/api/ready`, Vercel logs and Supabase logs before redeploying.
