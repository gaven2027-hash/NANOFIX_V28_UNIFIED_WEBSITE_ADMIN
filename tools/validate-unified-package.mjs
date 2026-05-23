import fs from "node:fs";
import path from "node:path";

const projectRoot = process.cwd();

const requiredFiles = [
  "app/page.tsx",
  "app/admin/page.tsx",
  "app/api/health/route.ts",
  "app/api/ready/route.ts",
  "app/api/public-repair-request/route.ts",
  "app/api/customer/register/route.ts",
  "app/api/portal/repair-tracking/route.ts",
  "app/api/admin/search/route.ts",
  "app/api/admin/global-search/route.ts",
  "app/api/admin/module-health/route.ts",
  "app/api/admin/entity-events/route.ts",
  "app/api/admin/cms/blocks/route.ts",
  "app/api/admin/backups/jobs/route.ts",
  "app/api/admin/payments/reconcile/route.ts",
  "app/api/admin/social/messages/route.ts",
  "app/api/admin/warranties/issue/route.ts",
  "app/api/system/health/route.ts",
  "app/api/system/modules/route.ts",
  "app/api/system/module-health-worker/route.ts",
  "app/api/cms/blocks/route.ts",
  "app/error.tsx",
  "middleware.ts",
  "lib/nanofix/seo.ts",
  "lib/nanofix/security.ts",
  "lib/nanofix/rbac.ts",
  "lib/nanofix/module-contracts.ts",
  "lib/nanofix/system-events.ts",
  "data/admin_backend_seed.json",
  "supabase/seed/20260522_central_admin_seed.sql",
  "supabase/migrations/20260521_central_admin_backend.sql",
  "supabase/migrations/20260522_v28_enhancements.sql",
  "supabase/migrations/20260523_0000_unified_website_admin_schema_bridge.sql",
  "supabase/migrations/20260523_v28_production_hardening.sql"
];

const bodyFiles = ["lib/legacy/body.html", "lib/legacy/body.en.html", "lib/legacy/body.zh.html"];
const stableMapNeedle = "https://www.google.com/maps?q=16%20Raffles%20Quay%2C%20Hong%20Leong%20Building%2C%20Singapore%20048581&output=embed";

function exists(file) {
  return fs.existsSync(path.join(projectRoot, file));
}

const missing = requiredFiles.filter((file) => !exists(file));
const mapChecks = bodyFiles.map((file) => {
  const text = fs.readFileSync(path.join(projectRoot, file), "utf8");
  return {
    file,
    stable_map_iframes: (text.match(new RegExp(stableMapNeedle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g")) || []).length,
    old_pb_embed_iframes: (text.match(/maps\/embed\?pb=/g) || []).length,
    eager_iframes: (text.match(/loading="eager"/g) || []).length
  };
});

const seoText = fs.readFileSync(path.join(projectRoot, "lib", "nanofix", "seo.ts"), "utf8");
const sitemapText = fs.readFileSync(path.join(projectRoot, "public", "sitemap.xml"), "utf8");
const layoutText = fs.readFileSync(path.join(projectRoot, "app", "layout.tsx"), "utf8");
const middlewareText = fs.readFileSync(path.join(projectRoot, "middleware.ts"), "utf8");
const rbacText = fs.readFileSync(path.join(projectRoot, "lib", "nanofix", "rbac.ts"), "utf8");
const authText = fs.readFileSync(path.join(projectRoot, "lib", "nanofix", "auth.ts"), "utf8");
const productionHardeningSql = fs.readFileSync(path.join(projectRoot, "supabase", "migrations", "20260523_v28_production_hardening.sql"), "utf8");
const schemaBridgeSql = fs.readFileSync(path.join(projectRoot, "supabase", "migrations", "20260523_0000_unified_website_admin_schema_bridge.sql"), "utf8");
const legacyPageText = fs.readFileSync(path.join(projectRoot, "components", "LegacyWebsitePage.tsx"), "utf8");

const chainChecks = {
  public_to_admin_paths: ["/admin", "/member-sign-up-login", "/api/public-repair-request", "/api/customer/register"],
  admin_api_protection: middlewareText.includes("/api/admin/:path*") && middlewareText.includes("x-nanofix-auth-verified"),
  verified_middleware_rbac: rbacText.includes("getAdminContext") && authText.includes("x-nanofix-auth-verified"),
  admin_token_fallback_disabled_by_default: middlewareText.includes('NANOFIX_ADMIN_TOKEN_FALLBACK_ENABLED !== "true"'),
  transactional_status_rpc: schemaBridgeSql.includes("transition_status_tx") && schemaBridgeSql.includes("revoke execute on function public.transition_status_tx"),
  cg_hardening_rpc_restricted: productionHardeningSql.includes("record_payment_and_reconcile") && productionHardeningSql.includes("revoke execute on function public.record_payment_and_reconcile"),
  cms_runtime_and_api_present: exists("app/api/cms/blocks/route.ts") && legacyPageText.includes("nanofix-cms-published-overrides"),
  encrypted_backup_job_present: exists("app/api/admin/backups/jobs/route.ts") && fs.readFileSync(path.join(projectRoot, "app", "api", "admin", "backups", "jobs", "route.ts"), "utf8").includes("aes-256-gcm"),
  module_worker_cron_present: exists("app/api/system/module-health-worker/route.ts") && fs.readFileSync(path.join(projectRoot, "vercel.json"), "utf8").includes("/api/system/module-health-worker"),
  seo_routes_present: (seoText.match(/path:/g) || []).length >= 20,
  sitemap_hreflang: sitemapText.includes("hreflang=\"en-SG\"") && sitemapText.includes("hreflang=\"zh-SG\"") && layoutText.includes("hrefLang=\"en-sg\"") && layoutText.includes("hrefLang=\"zh-sg\"")
};

const securityChecks = {
  middleware_present: exists("middleware.ts"),
  security_module_present: exists("lib/nanofix/security.ts"),
  admin_rbac_present: exists("lib/nanofix/rbac.ts"),
  public_form_rate_limit_present: fs.readFileSync(path.join(projectRoot, "lib", "public-repair-request.ts"), "utf8").includes("checkSupabaseRateLimit"),
  upload_magic_byte_validation_present: fs.readFileSync(path.join(projectRoot, "lib", "public-repair-request.ts"), "utf8").includes("detectMime"),
  no_client_role_header_trust: middlewareText.includes('headers.delete(key)') && middlewareText.includes('x-nanofix-role') && middlewareText.includes('x-admin-role'),
  no_service_request_public_write: fs.readFileSync(path.join(projectRoot, "app", "api", "service-requests", "route.ts"), "utf8").includes("requireAdmin"),
  backup_requires_encryption_key: fs.readFileSync(path.join(projectRoot, "app", "api", "admin", "backups", "jobs", "route.ts"), "utf8").includes("NANOFIX_BACKUP_ENCRYPTION_KEY")
};

const report = {
  ok:
    missing.length === 0 &&
    mapChecks.every((check) => check.stable_map_iframes >= 2 && check.old_pb_embed_iframes === 0) &&
    Object.values(chainChecks).every(Boolean) &&
    Object.values(securityChecks).every(Boolean),
  generated_at: new Date().toISOString(),
  package: "NANOFIX V28 CG Stable Base + GP Complete Unified Super Stable",
  missing_required_files: missing,
  map_checks: mapChecks,
  chain_checks: chainChecks,
  security_checks: securityChecks
};

fs.writeFileSync(path.join(projectRoot, "VALIDATION_REPORT_V28.json"), JSON.stringify(report, null, 2), "utf8");
console.log(JSON.stringify(report, null, 2));

if (!report.ok) process.exitCode = 1;
