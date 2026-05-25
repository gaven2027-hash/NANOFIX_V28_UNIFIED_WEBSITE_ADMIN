# NANOFIX V28.1.2 Security Hardening Summary

This document records the V28.1.2 hardening work for the NANOFIX unified website, admin backend, customer portal, engineer portal, Vercel deployment and Supabase database.

## Scope

V28.1.2 focused on moving the project from an operable admin build into a more production-hardened Supabase-backed system.

Main areas covered:

- Role-based login and registration welcome pages.
- Customer, engineer and admin registration request review flow.
- Website social link management.
- Social media API account binding management.
- Supabase RLS policy cleanup.
- SECURITY DEFINER function exposure hardening.
- Deployment validation script updates.

## Auth and Portal Entry Improvements

Added shared login and registration shells using the homepage first hero image:

- `app/login/LoginShell.tsx`
- `app/register/RegisterShell.tsx`

Both shells use:

- `/assets/images/team_on_site_premium.webp`
- Full-screen object-cover background.
- Soft dark overlay.
- NANOFIX logo with non-distorted object-contain sizing.

Role-specific welcome copy was added for:

- Admin / 管理员
- Premium Member / 高级会员
- Engineer / 工程师

Supported role entry URLs:

- `/login?role=admin`
- `/login?role=customer`
- `/login?role=engineer`
- `/register?role=admin`
- `/register?role=customer`
- `/register?role=engineer`

Alias routes are handled through middleware:

- `/admin-login`
- `/customer-login`
- `/engineer-login`
- `/member-sign-up-login`
- `/admin-register`
- `/customer-register`
- `/member-register`
- `/engineer-register`

## Registration Review Flow

Added Supabase table:

- `portal_registration_requests`

Added APIs:

- `POST /api/public/registration-requests`
- `GET /api/admin/registration-requests`
- `PATCH /api/admin/registration-requests`

Added admin workspace:

- `/customer-center/registration-review`
- `RegistrationReviewWorkspace`

Security behaviour:

- Registration does not auto-activate admin or engineer accounts.
- New profiles remain inactive until review.
- Approval activates the profile and assigns role.
- Rejection marks the profile rejected/inactive.
- Admin registration defaults to `content_admin`; only `super_admin` can approve `super_admin`.
- Review actions write audit logs.

## Social Management Improvements

### Social API Account Binding

Added table:

- `social_accounts`

Added admin API:

- `/api/admin/social-accounts`

Added workspace:

- `/social-media/social-accounts`
- `SocialAccountsBindingWorkspace`

Purpose:

- Store platform account metadata.
- Store secret reference names, not raw tokens.
- Track connection status.
- Support Facebook, Instagram, TikTok, YouTube Shorts, Xiaohongshu, Google Business Profile, WhatsApp, Linktree and other channels.

### Website Social Links

Added table:

- `website_social_links`

Added APIs:

- `/api/admin/website-social-links`
- `/api/public/website-social-links`

Added workspace:

- `/website-management/contact-social-links`
- `WebsiteSocialLinksWorkspace`

Default public website slots:

- Facebook
- Instagram
- TikTok
- YouTube

Purpose:

- Manage public website social icon URLs.
- Keep customer-facing links separate from private platform API binding.

## Supabase RLS Hardening

### RLS Disabled Tables Fixed

RLS was enabled and policies were added for:

- `nanofix_deployment_probe`
- `job_assignments`
- `job_checklists`
- `job_photos`
- `customer_signatures`

Field work policy principles:

- `super_admin`, `operations_admin`, `support` can manage field work records.
- `engineer` can only access their own assigned job-related records.
- Customer signatures are not directly exposed to normal customer browser writes.

### Core Business Table Policies

Policies added for:

- `leads`
- `unified_intake`
- `bookings`
- `inspections`
- `quotations`
- `quotation_versions`
- `payments`
- `receipts`
- `warranties`
- `audit_logs`
- `website_pages`
- `website_content_blocks`
- `social_messages`

`audit_logs` is intentionally select-only for admins and should not be writable from ordinary frontend sessions.

### Module Table Policies

Policies added for AI, backup, system settings, customer center, webhooks, search, OTP, password reset and content/social modules.

Sensitive log/event tables were mostly kept select-only for admins:

- `ai_logs`
- `auth_otp_logs`
- `dead_letter_events`
- `entity_events`
- `form_rate_limits`
- `inbound_events`
- `integration_outbox`
- `module_health_events`
- `otp_verifications`
- `password_reset_requests`
- `payment_events`
- `search_logs`
- `status_transition_logs`
- `webhook_events`

## SECURITY DEFINER Hardening

Direct RPC execute permissions were revoked from `public`, `anon` and `authenticated` for:

- `current_profile_id()`
- `current_profile_role()`
- `is_admin()`
- `handle_new_auth_user()`
- `log_status_transition(...)`
- `record_module_health_snapshot(text)`

Execution was retained for `service_role`.

`latest_module_health` view was recreated with:

```sql
with (security_invoker = true)
```

## Deployment and Validation Scripts

Added or updated verification scripts:

- `verify:auth-welcome`
- `verify:registration-review`
- `verify:social-accounts`
- `verify:website-social-links`
- `verify:field-rls`
- `verify:security-definer`
- `verify:core-rls`
- `verify:module-rls`

All are included in:

```bash
npm run validate:predeploy
```

Updated validation gates:

- `tools/validate-unified-package.mjs`
- `tools/deploy-readiness-check.mjs`

## Supabase Advisor Status

After V28.1.2 hardening, the following categories were addressed:

- RLS disabled on public tables.
- RLS enabled with no policy for core and module tables.
- Public/anon/authenticated execution of sensitive SECURITY DEFINER functions.
- SECURITY DEFINER view warning for `latest_module_health`.

Remaining platform-level action:

- Enable Supabase Auth leaked password protection in the Supabase dashboard.

Manual path:

```text
Supabase Dashboard
→ Authentication
→ Security
→ Password protection
→ Enable leaked password protection
```

## Deployment Note

This document only records repository and Supabase changes. Vercel production deployment should still be triggered separately after local or CI checks pass:

```powershell
npm.cmd run validate:predeploy
npm.cmd run build:ci
vercel.cmd --prod
```
