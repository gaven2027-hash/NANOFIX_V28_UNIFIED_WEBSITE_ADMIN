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
  "docs/NANOFIX_V28_2_MASTER_MEMORY_20260529.md",
  "components/AutomationNotificationWorkspace.tsx",
  "app/api/admin/automation-notifications/route.ts",
  "app/api/admin/internal-inbox/route.ts",
  "app/api/admin/unified-tasks/route.ts",
  "supabase/migrations/20260523_0000_unified_website_admin_schema_bridge.sql",
  "supabase/migrations/20260523_v28_production_hardening.sql",
  "supabase/migrations/202605290001_v28_2_automation_inbox_task_engine.sql"
];
for (const file of requiredFiles) assert(exists(file), `Missing required deployment file: ${file}`);

const pkg = JSON.parse(read("package.json"));
for (const script of ["build", "build:ci", "validate:predeploy", "quality:gate", "verify", "test:e2e:smoke", "check:staging"]) {
  assert(pkg.scripts?.[script], `Missing npm script: ${script}`);
}
assert(pkg.engines?.node?.includes(">=20"), "package.json should require Node >=20 for Vercel/GitHub consistency");
assert(pkg.engines?.node?.includes("<23"), "package.json should cap Node below 23 until dependencies are verified");
assert(String(pkg.version || "").includes("28.2.0"), "package.json version should identify the V28.2 automation/inbox/task phase");

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
assert(middleware.includes("/api/admin/:path*"), "middleware must protect V28.2 admin APIs through the /api/admin matcher");

const migrations = fs.readdirSync(path.join(root, "supabase/migrations")).filter((f) => f.endsWith(".sql")).sort();
assert(migrations.length >= 6, "Expected complete Supabase migrations set");
assert(migrations.every((name, index, arr) => index === 0 || arr[index - 1] <= name), "Supabase migrations should be lexically ordered");
const joinedMigrations = migrations.map((file) => read(`supabase/migrations/${file}`)).join("\n");
for (const table of ["profiles", "customers", "unified_intake", "leads", "service_requests", "audit_logs", "app_modules"]) {
  assert(joinedMigrations.includes(`public.${table}`), `Supabase migrations missing core table reference: ${table}`);
}
for (const table of ["automation_rules", "notification_outbox", "internal_inbox_messages", "unified_tasks", "task_events"]) {
  assert(joinedMigrations.includes(`public.${table}`), `V28.2 migration missing workflow table reference: ${table}`);
}
assert(joinedMigrations.includes("revoke execute on function public.search_all_records"), "search_all_records RPC must be revoked from public/anon/authenticated");
assert(joinedMigrations.includes("grant execute on function public.transition_status_tx"), "transition_status_tx RPC must be granted only to service_role");
assert(joinedMigrations.includes("create_unified_task_with_inbox"), "V28.2 unified task + inbox RPC is missing");
assert(joinedMigrations.toLowerCase().includes("enable row level security"), "Supabase migrations must enable RLS");

const readyRoute = read("app/api/ready/route.ts");
for (const table of ["automation_rules", "notification_outbox", "internal_inbox_messages", "unified_tasks", "task_events"]) {
  assert(readyRoute.includes(table), `/api/ready missing V28.2 table readiness check: ${table}`);
}
assert(readyRoute.includes("28.2.0-automation-inbox-task-engine"), "/api/ready should expose the V28.2 readiness version");

const dashboard = read("app/dashboard/page.tsx");
assert(dashboard.includes("AutomationNotificationWorkspace"), "Dashboard must render AutomationNotificationWorkspace");
const globalSearch = read("app/api/global-search/route.ts");
for (const needle of ["automation_rules", "notification_outbox", "internal_inbox_messages", "unified_tasks"]) {
  assert(globalSearch.includes(needle), `Global search fallback missing V28.2 source: ${needle}`);
}

const nextConfig = read("next.config.mjs");
assert(nextConfig.includes("Content-Security-Policy"), "next.config.mjs should define CSP");
assert(nextConfig.includes("Strict-Transport-Security"), "next.config.mjs should define HSTS");
warn(!nextConfig.includes("'unsafe-inline'"), "CSP still allows 'unsafe-inline' for legacy visual-lock HTML; acceptable now, remove in pure component rewrite");

if (failures.length) {
  console.error("NANOFIX deployment readiness check failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log(JSON.stringify({ ok: true, checks: "github_vercel_supabase_v28_2_automation_inbox_task_engine", warnings }, null, 2));
