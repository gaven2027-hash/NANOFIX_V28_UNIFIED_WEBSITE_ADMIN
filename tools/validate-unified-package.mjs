import fs from "node:fs";
import path from "node:path";

const projectRoot = process.cwd();

const requiredFiles = [
  "app/page.tsx",
  "app/admin/page.tsx",
  "app/login/page.tsx",
  "app/login/LoginShell.tsx",
  "app/login/LoginForm.tsx",
  "app/register/page.tsx",
  "app/register/RegisterShell.tsx",
  "app/register/RegisterForm.tsx",
  "app/api/health/route.ts",
  "app/api/ready/route.ts",
  "app/api/public-repair-request/route.ts",
  "app/api/customer/register/route.ts",
  "app/api/public/registration-requests/route.ts",
  "app/api/public/website-social-links/route.ts",
  "app/api/portal/repair-tracking/route.ts",
  "app/api/admin/search/route.ts",
  "app/api/admin/global-search/route.ts",
  "app/api/admin/module-health/route.ts",
  "app/api/admin/entity-events/route.ts",
  "app/api/admin/cms/blocks/route.ts",
  "app/api/admin/backups/jobs/route.ts",
  "app/api/admin/payments/reconcile/route.ts",
  "app/api/admin/registration-requests/route.ts",
  "app/api/admin/social/messages/route.ts",
  "app/api/admin/social-accounts/route.ts",
  "app/api/admin/website-social-links/route.ts",
  "app/api/admin/warranties/issue/route.ts",
  "app/api/system/health/route.ts",
  "app/api/system/modules/route.ts",
  "app/api/system/module-health-worker/route.ts",
  "app/api/cms/blocks/route.ts",
  "app/customer-center/[section]/page.tsx",
  "app/social-media/[section]/page.tsx",
  "app/website-management/[section]/page.tsx",
  "app/error.tsx",
  "middleware.ts",
  "components/RegistrationReviewWorkspace.tsx",
  "components/SocialAccountsBindingWorkspace.tsx",
  "components/WebsiteSocialLinksWorkspace.tsx",
  "lib/nanofix/seo.ts",
  "lib/nanofix/security.ts",
  "lib/nanofix/rbac.ts",
  "lib/nanofix/module-contracts.ts",
  "lib/nanofix/system-events.ts",
  "lib/nanofix/customerCenterConfig.ts",
  "lib/nanofix/socialMediaConfig.ts",
  "lib/nanofix/websiteManagementConfig.ts",
  "data/admin_backend_seed.json",
  "supabase/seed/20260522_central_admin_seed.sql",
  "supabase/migrations/20260521_central_admin_backend.sql",
  "supabase/migrations/20260522_v28_enhancements.sql",
  "supabase/migrations/20260523_0000_unified_website_admin_schema_bridge.sql",
  "supabase/migrations/20260523_v28_production_hardening.sql",
  "supabase/migrations/20260526001000_v28_1_2_social_accounts_binding.sql",
  "supabase/migrations/20260526002000_v28_1_2_website_social_links.sql",
  "supabase/migrations/20260526003000_v28_1_2_portal_registration_requests.sql",
  "supabase/migrations/20260526004000_v28_1_2_field_work_rls_policies.sql",
  "supabase/migrations/20260526005000_v28_1_2_security_definer_access_hardening.sql",
  "supabase/migrations/20260526006000_v28_1_2_core_business_rls_policies.sql",
  "supabase/migrations/20260526007000_v28_1_2_module_rls_policies.sql",
  "tools/verify-auth-welcome-pages.mjs",
  "tools/verify-core-business-rls.mjs",
  "tools/verify-field-work-rls.mjs",
  "tools/verify-module-rls.mjs",
  "tools/verify-registration-review.mjs",
  "tools/verify-security-definer-hardening.mjs",
  "tools/verify-service-operations-flow.mjs",
  "tools/verify-social-accounts-binding.mjs",
  "tools/verify-website-social-links.mjs"
];

const bodyFiles = ["lib/legacy/body.html", "lib/legacy/body.en.html", "lib/legacy/body.zh.html"];
const stableMapNeedle = "https://www.google.com/maps?q=16%20Raffles%20Quay%2C%20Hong%20Leong%20Building%2C%20Singapore%20048581&output=embed";

function exists(file) {
  return fs.existsSync(path.join(projectRoot, file));
}

function read(file) {
  return fs.readFileSync(path.join(projectRoot, file), "utf8");
}

const missing = requiredFiles.filter((file) => !exists(file));
const mapChecks = bodyFiles.map((file) => {
  const text = read(file);
  return {
    file,
    stable_map_iframes: (text.match(new RegExp(stableMapNeedle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g")) || []).length,
    old_pb_embed_iframes: (text.match(/maps\/embed\?pb=/g) || []).length,
    eager_iframes: (text.match(/loading="eager"/g) || []).length
  };
});

const packageText = read("package.json");
const pkg = JSON.parse(packageText);
const seoText = read("lib/nanofix/seo.ts");
const sitemapText = read("public/sitemap.xml");
const layoutText = read("app/layout.tsx");
const middlewareText = read("middleware.ts");
const rbacText = read("lib/nanofix/rbac.ts");
const authText = read("lib/nanofix/auth.ts");
const productionHardeningSql = read("supabase/migrations/20260523_v28_production_hardening.sql");
const schemaBridgeSql = read("supabase/migrations/20260523_0000_unified_website_admin_schema_bridge.sql");
const legacyPageText = read("components/LegacyWebsitePage.tsx");
const socialAccountsSql = read("supabase/migrations/20260526001000_v28_1_2_social_accounts_binding.sql");
const websiteSocialLinksSql = read("supabase/migrations/20260526002000_v28_1_2_website_social_links.sql");
const registrationSql = read("supabase/migrations/20260526003000_v28_1_2_portal_registration_requests.sql");
const fieldRlsSql = read("supabase/migrations/20260526004000_v28_1_2_field_work_rls_policies.sql");
const securityDefinerSql = read("supabase/migrations/20260526005000_v28_1_2_security_definer_access_hardening.sql");
const coreRlsSql = read("supabase/migrations/20260526006000_v28_1_2_core_business_rls_policies.sql");
const moduleRlsSql = read("supabase/migrations/20260526007000_v28_1_2_module_rls_policies.sql");
const loginShellText = read("app/login/LoginShell.tsx");
const registerShellText = read("app/register/RegisterShell.tsx");
const loginFormText = read("app/login/LoginForm.tsx");
const registerFormText = read("app/register/RegisterForm.tsx");

const expectedVerifyScripts = [
  "verify:service-flow",
  "verify:social-accounts",
  "verify:website-social-links",
  "verify:auth-welcome",
  "verify:registration-review",
  "verify:field-rls",
  "verify:security-definer",
  "verify:core-rls",
  "verify:module-rls"
];

const chainChecks = {
  public_to_admin_paths: ["/admin", "/member-sign-up-login", "/api/public-repair-request", "/api/customer/register"],
  admin_api_protection: middlewareText.includes("/api/admin/:path*") && middlewareText.includes("x-nanofix-auth-verified"),
  verified_middleware_rbac: rbacText.includes("getAdminContext") && authText.includes("x-nanofix-auth-verified"),
  admin_token_fallback_disabled_by_default: middlewareText.includes('NANOFIX_ADMIN_TOKEN_FALLBACK_ENABLED !== "true"'),
  transactional_status_rpc: schemaBridgeSql.includes("transition_status_tx") && schemaBridgeSql.includes("revoke execute on function public.transition_status_tx"),
  cg_hardening_rpc_restricted: productionHardeningSql.includes("record_payment_and_reconcile") && productionHardeningSql.includes("revoke execute on function public.record_payment_and_reconcile"),
  cms_runtime_and_api_present: exists("app/api/cms/blocks/route.ts") && legacyPageText.includes("nanofix-cms-published-overrides"),
  encrypted_backup_job_present: exists("app/api/admin/backups/jobs/route.ts") && read("app/api/admin/backups/jobs/route.ts").includes("aes-256-gcm"),
  module_worker_cron_present: exists("app/api/system/module-health-worker/route.ts") && read("vercel.json").includes("/api/system/module-health-worker"),
  seo_routes_present: (seoText.match(/path:/g) || []).length >= 20,
  sitemap_hreflang: sitemapText.includes("hreflang=\"en-SG\"") && sitemapText.includes("hreflang=\"zh-SG\"") && layoutText.includes("hrefLang=\"en-sg\"") && layoutText.includes("hrefLang=\"zh-sg\""),
  social_accounts_binding_present: socialAccountsSql.includes("create table if not exists public.social_accounts") && exists("app/api/admin/social-accounts/route.ts") && exists("components/SocialAccountsBindingWorkspace.tsx"),
  website_social_links_present: websiteSocialLinksSql.includes("create table if not exists public.website_social_links") && exists("app/api/admin/website-social-links/route.ts") && exists("app/api/public/website-social-links/route.ts"),
  registration_review_present: registrationSql.includes("create table if not exists public.portal_registration_requests") && exists("app/api/admin/registration-requests/route.ts") && exists("components/RegistrationReviewWorkspace.tsx"),
  role_auth_welcome_present: loginShellText.includes("team_on_site_premium.webp") && registerShellText.includes("team_on_site_premium.webp") && loginFormText.includes("NANOFIX Premium Member Portal") && registerFormText.includes("Engineer Account Application")
};

const securityChecks = {
  middleware_present: exists("middleware.ts"),
  security_module_present: exists("lib/nanofix/security.ts"),
  admin_rbac_present: exists("lib/nanofix/rbac.ts"),
  public_form_rate_limit_present: read("lib/public-repair-request.ts").includes("checkSupabaseRateLimit"),
  upload_magic_byte_validation_present: read("lib/public-repair-request.ts").includes("detectMime"),
  no_client_role_header_trust: middlewareText.includes('headers.delete(key)') && middlewareText.includes('x-nanofix-role') && middlewareText.includes('x-admin-role'),
  no_service_request_public_write: read("app/api/service-requests/route.ts").includes("requireAdmin"),
  backup_requires_encryption_key: read("app/api/admin/backups/jobs/route.ts").includes("NANOFIX_BACKUP_ENCRYPTION_KEY"),
  field_work_rls_present: fieldRlsSql.includes("alter table public.job_assignments enable row level security") && fieldRlsSql.includes("job_photos_engineer_assigned"),
  security_definer_rpc_restricted: securityDefinerSql.includes("revoke execute on function public.handle_new_auth_user() from public, anon, authenticated") && securityDefinerSql.includes("with (security_invoker = true)"),
  core_business_rls_present: coreRlsSql.includes("leads_admin_all") && coreRlsSql.includes("audit_logs_admin_select") && !coreRlsSql.includes("audit_logs_admin_all"),
  module_rls_present: moduleRlsSql.includes("ai_logs_admin_select") && moduleRlsSql.includes("webhook_events_admin_select") && moduleRlsSql.includes("system_setting_records_admin_all"),
  predeploy_verifies_security_hardening: expectedVerifyScripts.every((script) => pkg.scripts?.[script] && pkg.scripts?.["validate:predeploy"]?.includes(`npm run ${script}`))
};

const report = {
  ok:
    missing.length === 0 &&
    mapChecks.every((check) => check.stable_map_iframes >= 2 && check.old_pb_embed_iframes === 0) &&
    Object.values(chainChecks).every(Boolean) &&
    Object.values(securityChecks).every(Boolean),
  generated_at: new Date().toISOString(),
  package: "NANOFIX V28.1.2 Operable Admin + Supabase Security Hardened",
  missing_required_files: missing,
  map_checks: mapChecks,
  chain_checks: chainChecks,
  security_checks: securityChecks
};

fs.writeFileSync(path.join(projectRoot, "VALIDATION_REPORT_V28.json"), JSON.stringify(report, null, 2), "utf8");
console.log(JSON.stringify(report, null, 2));

if (!report.ok) process.exitCode = 1;
