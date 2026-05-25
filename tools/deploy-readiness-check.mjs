import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const exists = (file) => fs.existsSync(path.join(root, file));
const failures = [];
const warnings = [];
function assert(condition, message) {
  if (!condition) failures.push(message);
}
function warn(condition, message) {
  if (!condition) warnings.push(message);
}

const requiredFiles = [
  "package.json",
  "package-lock.json",
  "next.config.mjs",
  "vercel.json",
  ".nvmrc",
  ".npmrc",
  ".gitignore",
  ".vercelignore",
  ".env.example",
  "middleware.ts",
  "app/login/LoginShell.tsx",
  "app/register/RegisterShell.tsx",
  "app/api/public/registration-requests/route.ts",
  "app/api/admin/registration-requests/route.ts",
  "app/api/admin/social-accounts/route.ts",
  "app/api/admin/website-social-links/route.ts",
  "app/api/public/website-social-links/route.ts",
  "components/RegistrationReviewWorkspace.tsx",
  "components/SocialAccountsBindingWorkspace.tsx",
  "components/WebsiteSocialLinksWorkspace.tsx",
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
  "tools/verify-social-accounts-binding.mjs",
  "tools/verify-website-social-links.mjs"
];
for (const file of requiredFiles) assert(exists(file), `Missing required deployment file: ${file}`);

const pkg = JSON.parse(read("package.json"));
const requiredScripts = [
  "build",
  "build:ci",
  "validate:predeploy",
  "quality:gate",
  "verify",
  "test:e2e:smoke",
  "check:staging",
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
for (const script of requiredScripts) {
  assert(pkg.scripts?.[script], `Missing npm script: ${script}`);
}
for (const script of requiredScripts.filter((script) => script.startsWith("verify:") && script !== "verify")) {
  assert(pkg.scripts?.["validate:predeploy"]?.includes(`npm run ${script}`), `validate:predeploy must include ${script}`);
}
assert(pkg.engines?.node?.includes(">=20"), "package.json should require Node >=20 for Vercel/GitHub consistency");
assert(pkg.engines?.node?.includes("<23"), "package.json should cap Node below 23 until dependencies are verified");

const nvmrc = read(".nvmrc").trim();
assert(nvmrc === "20", ".nvmrc should pin Node 20 for GitHub Actions and local parity");
const npmrc = read(".npmrc");
assert(npmrc.includes("registry=https://registry.npmjs.org/"), ".npmrc should force the public npm registry");
assert(npmrc.includes("engine-strict=true"), ".npmrc should enforce package engines");

const lock = read("package-lock.json");
assert(!/npmmirror|cnpm|taobao|verdaccio|localhost:4873/i.test(lock), "package-lock.json contains a non-public/internal npm registry reference");

const vercel = JSON.parse(read("vercel.json"));
assert(vercel.framework === "nextjs", "vercel.json framework must be nextjs");
assert(vercel.installCommand === "npm ci", "Vercel installCommand should be npm ci");
assert((vercel.buildCommand || "").includes("validate:predeploy") && (vercel.buildCommand || "").includes("build:ci"), "Vercel buildCommand should run validation and build:ci");
const cron = vercel.crons?.find((item) => item.path === "/api/system/module-health-worker");
assert(Boolean(cron), "Vercel cron for /api/system/module-health-worker is missing");
if (cron) {
  assert(cron.schedule === "0 20 * * *", "Default Vercel cron should be once daily at 20:00 UTC for Hobby-plan compatibility");
}

const gitignore = read(".gitignore");
for (const ignored of ["node_modules/", ".next/", ".vercel/", ".env", "*.zip"]) {
  assert(gitignore.includes(ignored), `.gitignore should ignore ${ignored}`);
}
const vercelignore = read(".vercelignore");
for (const ignored of ["node_modules", ".next", ".vercel", "*.zip", ".env", "*.key"]) {
  assert(vercelignore.includes(ignored), `.vercelignore should ignore ${ignored}`);
}

const workflowFile = ".github/workflows/ci.yml";
assert(exists(workflowFile), "Missing GitHub Actions quality gate workflow");
if (exists(workflowFile)) {
  const workflow = read(workflowFile);
  assert(workflow.includes("actions/checkout@v4"), "GitHub Actions should use stable actions/checkout@v4");
  assert(workflow.includes("actions/setup-node@v4"), "GitHub Actions should use actions/setup-node@v4");
  assert(workflow.includes("node-version-file: .nvmrc"), "GitHub Actions should read Node version from .nvmrc");
  assert(workflow.includes("npm run quality:gate"), "GitHub Actions should run npm run quality:gate");
}

const env = read(".env.example");
const requiredEnv = [
  "NEXT_PUBLIC_SITE_URL",
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
  "NANOFIX_ADMIN_TOKEN_FALLBACK_ENABLED=false",
  "ALLOW_ADMIN_API_SECRET_FALLBACK=false",
  "NANOFIX_ALLOW_FORM_WITHOUT_SUPABASE=false",
  "NANOFIX_BACKUP_ENCRYPTION_KEY",
  "CRON_SECRET",
  "PAYMENT_WEBHOOK_SECRET",
  "SOCIAL_WEBHOOK_SECRET"
];
for (const key of requiredEnv) assert(env.includes(key), `.env.example missing required deployment variable/default: ${key}`);

const middleware = read("middleware.ts");
assert(middleware.includes("x-admin-role") && middleware.includes("x-nanofix-role"), "middleware should explicitly strip untrusted client role headers");
assert(middleware.includes("/login"), "middleware should redirect protected pages to /login");
assert(middleware.includes("loginAliases") && middleware.includes("registerAliases"), "middleware should route role-based login/register aliases");

const migrations = fs.readdirSync(path.join(root, "supabase/migrations")).filter((f) => f.endsWith(".sql")).sort();
assert(migrations.length >= 13, "Expected complete Supabase migrations set including V28.1.2 hardening migrations");
assert(migrations.every((name, index, arr) => index === 0 || arr[index - 1] <= name), "Supabase migrations should be lexically ordered");
const joinedMigrations = migrations.map((file) => read(`supabase/migrations/${file}`)).join("\n");
for (const table of [
  "profiles",
  "customers",
  "unified_intake",
  "leads",
  "service_requests",
  "audit_logs",
  "app_modules",
  "social_accounts",
  "website_social_links",
  "portal_registration_requests"
]) {
  assert(joinedMigrations.includes(`public.${table}`), `Supabase migrations missing table reference: ${table}`);
}
assert(joinedMigrations.includes("revoke execute on function public.search_all_records"), "search_all_records RPC must be revoked from public/anon/authenticated");
assert(joinedMigrations.includes("grant execute on function public.transition_status_tx"), "transition_status_tx RPC must be granted only to service_role");
assert(joinedMigrations.includes("revoke execute on function public.handle_new_auth_user() from public, anon, authenticated"), "handle_new_auth_user must not be callable by public/anon/authenticated RPC");
assert(joinedMigrations.includes("with (security_invoker = true)"), "latest_module_health view must use security_invoker=true");
assert(joinedMigrations.includes("job_assignments_engineer_own") && joinedMigrations.includes("job_photos_engineer_assigned"), "Field work engineer ownership RLS policies are missing");
assert(joinedMigrations.includes("audit_logs_admin_select") && !joinedMigrations.includes("audit_logs_admin_all"), "audit_logs should remain admin select-only through RLS");
assert(joinedMigrations.includes("webhook_events_admin_select") && joinedMigrations.includes("otp_verifications_admin_select"), "Sensitive module event/OTP RLS select-only policies are missing");
assert(joinedMigrations.toLowerCase().includes("enable row level security"), "Supabase migrations must enable RLS");

const nextConfig = read("next.config.mjs");
assert(nextConfig.includes("Content-Security-Policy"), "next.config.mjs should define CSP");
assert(nextConfig.includes("Strict-Transport-Security"), "next.config.mjs should define HSTS");
warn(!nextConfig.includes("'unsafe-inline'"), "CSP still allows 'unsafe-inline' for legacy visual-lock HTML; acceptable now, remove in pure component rewrite");

const loginShell = read("app/login/LoginShell.tsx");
const registerShell = read("app/register/RegisterShell.tsx");
assert(loginShell.includes("team_on_site_premium.webp") && registerShell.includes("team_on_site_premium.webp"), "Login/Register pages must use homepage first hero image background");
assert(read("app/login/LoginForm.tsx").includes("NANOFIX Premium Member Portal"), "Login page must include role-based premium member welcome copy");
assert(read("app/register/RegisterForm.tsx").includes("Engineer Account Application"), "Register page must include role-based engineer application copy");

if (failures.length) {
  console.error("NANOFIX deployment readiness check failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log(JSON.stringify({ ok: true, checks: "github_vercel_supabase_v28_1_2_hardened", warnings }, null, 2));
