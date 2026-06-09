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
  ".vercelignore",
  ".env.example",
  "middleware.ts",
  "docs/NANOFIX_V28_2_MASTER_MEMORY_20260529.md",
  "docs/NANOFIX_V28_2_FINAL_DEPLOYMENT_RUNBOOK_20260529.md",
  "docs/NANOFIX_V28_2_FINAL_RELEASE_HANDOFF_20260529.md",
  "components/AutomationNotificationWorkspace.tsx",
  "components/WorkflowAuditTrail.tsx",
  "components/WorkflowSettingsWorkspace.tsx",
  "app/dashboard/page.tsx",
  "app/system-settings/page.tsx",
  "app/api/admin/automation-notifications/route.ts",
  "app/api/admin/internal-inbox/route.ts",
  "app/api/admin/unified-tasks/route.ts",
  "app/api/admin/workflow-audit/route.ts",
  "app/api/admin/workflow-settings/route.ts",
  "app/api/global-search/route.ts",
  "app/api/ready/route.ts",
  "tools/e2e-smoke.mjs",
  "tools/static-v28-2-issue-scan.mjs",
  "tools/verify-v28-2-workflow-engine.mjs",
  "supabase/migrations/20260523_0000_unified_website_admin_schema_bridge.sql",
  "supabase/migrations/20260523_v28_production_hardening.sql",
  "supabase/migrations/202605290001_v28_2_automation_inbox_task_engine.sql",
  "supabase/migrations/202605290002_v28_2_workflow_settings.sql",
  "supabase/seed/20260529_v28_2_workflow_engine_seed.sql"
];
for (const file of requiredFiles) assert(exists(file), `Missing required deployment file: ${file}`);

const pkg = JSON.parse(read("package.json"));
for (const script of ["build", "build:ci", "validate:predeploy", "quality:gate", "verify", "test:e2e:smoke", "check:staging", "verify:v28-2-workflow", "scan:v28-2-static", "validate:package", "validate:platform"]) {
  assert(pkg.scripts?.[script], `Missing npm script: ${script}`);
}
assert((pkg.scripts?.["validate:predeploy"] || "").includes("scan:v28-2-static"), "validate:predeploy must run scan:v28-2-static");
assert((pkg.scripts?.["validate:predeploy"] || "").includes("verify:v28-2-workflow"), "validate:predeploy must run verify:v28-2-workflow");
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
if (cron) assert(cron.schedule === "0 20 * * *", "Default Vercel cron should be once daily at 20:00 UTC for Hobby-plan compatibility");

if (exists(".gitignore")) {
  const gitignore = read(".gitignore");
  for (const ignored of ["node_modules/", ".next/", ".vercel/", ".env", "*.zip"]) assert(gitignore.includes(ignored), `.gitignore should ignore ${ignored}`);
} else {
  warn(false, ".gitignore is missing from the current build context; continuing because Vercel CLI upload can omit dotfiles while .vercelignore remains the deployment source-control guard");
}
const vercelignore = read(".vercelignore");
for (const ignored of ["node_modules", ".next", ".vercel", "*.zip", ".env", "*.key"]) assert(vercelignore.includes(ignored), `.vercelignore should ignore ${ignored}`);

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
  "JWT_SECRET",
  "CRON_SECRET",
  "PAYMENT_WEBHOOK_SECRET",
  "SOCIAL_WEBHOOK_SECRET",
  "ADMIN_REPAIR_REQUEST_URL",
  "ADMIN_REPAIR_REQUEST_WEBHOOK_SECRET",
  "CLOUDFLARE_TURNSTILE_SECRET_KEY",
  "NEXT_PUBLIC_TURNSTILE_SITE_KEY",
  "NANOFIX_PUBLIC_FORM_RATE_LIMIT_MAX"
];
for (const key of requiredEnv) assert(env.includes(key), `.env.example missing required deployment variable/default: ${key}`);
assert(!/sb_secret_|service_role_[A-Za-z0-9]{20,}|eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}/.test(env), ".env.example appears to contain a real token/key instead of placeholders");
assert(!/NEXT_PUBLIC_SUPABASE_SERVICE_ROLE/i.test(env), ".env.example must never expose a public service role key");

const middleware = read("middleware.ts");
assert(middleware.includes("x-admin-role") && middleware.includes("x-nanofix-role"), "middleware should explicitly strip untrusted client role headers");
assert(middleware.includes("/login"), "middleware should redirect protected pages to /login");
assert(middleware.includes("/api/admin/:path*"), "middleware must protect V28.2 admin APIs through the /api/admin matcher");

const migrations = fs.readdirSync(path.join(root, "supabase/migrations")).filter((f) => f.endsWith(".sql")).sort();
assert(migrations.length >= 7, "Expected complete Supabase migrations set including V28.2 settings");
assert(migrations.every((name, index, arr) => index === 0 || arr[index - 1] <= name), "Supabase migrations should be lexically ordered");
const joinedMigrations = migrations.map((file) => read(`supabase/migrations/${file}`)).join("\n");
for (const table of ["profiles", "customers", "unified_intake", "leads", "service_requests", "audit_logs", "app_modules", "automation_rules", "notification_outbox", "internal_inbox_messages", "unified_tasks", "task_events", "workflow_settings"]) {
  assert(joinedMigrations.includes(`public.${table}`), `Supabase migrations missing table reference: ${table}`);
}
assert(joinedMigrations.includes("revoke execute on function public.search_all_records"), "search_all_records RPC must be revoked from public/anon/authenticated");
assert(joinedMigrations.includes("grant execute on function public.transition_status_tx"), "transition_status_tx RPC must be granted only to service_role");
assert(joinedMigrations.includes("create_unified_task_with_inbox"), "V28.2 unified task + inbox RPC is missing");
assert(joinedMigrations.includes("notification.channel.internal.default"), "V28.2 workflow settings migration missing default internal channel");
assert(joinedMigrations.includes("automation.rules.safe_write_policy"), "V28.2 workflow settings migration missing safe write policy");
assert(joinedMigrations.toLowerCase().includes("enable row level security"), "Supabase migrations must enable RLS");

const seed = read("supabase/seed/20260529_v28_2_workflow_engine_seed.sql");
for (const marker of ["service_request.created.p0_triage", "quotation.approval.overdue", "review.privacy.redaction_required", "payment.mismatch.finance_review", "public.automation_rules", "public.notification_outbox", "public.internal_inbox_messages", "public.unified_tasks", "public.task_events"]) {
  assert(seed.includes(marker), `V28.2 seed missing marker/table: ${marker}`);
}
assert(seed.includes("notification.channel.internal"), "Workflow seed should configure internal notification channel setting");
assert(seed.includes("feature_flag.automation.enabled"), "Workflow seed should configure automation feature flag");

for (const message of warnings) console.warn("WARNING:", message);
if (failures.length) {
  console.error(JSON.stringify({ ok: false, failures }, null, 2));
  process.exit(1);
}
console.log(JSON.stringify({ ok: true, checked_files: requiredFiles.length, warnings }, null, 2));
