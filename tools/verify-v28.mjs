import { spawn, spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const nextBin = process.platform === "win32" ? join(root, "node_modules", ".bin", "next.cmd") : join(root, "node_modules", ".bin", "next");
const port = Number(process.env.NANOFIX_VERIFY_PORT || 3941);
const v282ReadyTables = ["automation_rules", "notification_outbox", "internal_inbox_messages", "unified_tasks", "task_events", "workflow_settings"];

function run(cmd, args) {
  const label = `${cmd} ${args.join(" ")}`;
  console.log(`\nNANOFIX verify: ${label}`);
  const result = spawnSync(cmd, args, {
    stdio: "inherit",
    shell: process.platform === "win32",
    env: { ...process.env, NEXT_TELEMETRY_DISABLED: "1", NEXT_PRIVATE_BUILD_WORKER: "1" },
    timeout: 180000
  });
  if (result.status !== 0) {
    console.error(`NANOFIX verify failed: ${label}`);
    process.exit(result.status || 1);
  }
}

function requiredArtifactsExist() {
  const required = [
    ".next/BUILD_ID",
    ".next/routes-manifest.json",
    ".next/required-server-files.json",
    ".next/server/app-paths-manifest.json",
    ".next/server/middleware-manifest.json"
  ];
  const missing = required.filter((file) => !existsSync(join(root, file)));
  if (missing.length) {
    console.error("Missing required Next.js production artifacts:");
    missing.forEach((file) => console.error(`- ${file}`));
    return false;
  }
  return true;
}

async function waitForServer(baseUrl, timeoutMs = 30000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    try {
      const response = await fetch(`${baseUrl}/api/health`, { cache: "no-store" });
      if (response.status === 200) return;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`next start did not become ready at ${baseUrl}`);
}

async function expectStatus(baseUrl, path, expectedStatus, init = {}) {
  const response = await fetch(`${baseUrl}${path}`, { cache: "no-store", redirect: "manual", ...init });
  if (response.status !== expectedStatus) {
    const text = await response.text().catch(() => "");
    throw new Error(`${path} expected ${expectedStatus} but got ${response.status}. ${text.slice(0, 160)}`);
  }
  console.log(`NANOFIX route check passed: ${path} -> ${response.status}`);
  return response;
}

async function expectRedirectToLogin(baseUrl, path) {
  const response = await fetch(`${baseUrl}${path}`, { cache: "no-store", redirect: "manual" });
  const location = response.headers.get("location") || "";
  if (![302, 303, 307, 308].includes(response.status) || !location.includes("/login")) {
    throw new Error(`${path} expected redirect to /login but got ${response.status} ${location}`);
  }
  console.log(`NANOFIX protected page check passed: ${path} -> ${response.status} ${location}`);
}

async function expectReadyCoverage(baseUrl) {
  const response = await fetch(`${baseUrl}/api/ready`, { cache: "no-store" });
  if (![200, 503].includes(response.status)) {
    const text = await response.text().catch(() => "");
    throw new Error(`/api/ready expected 200 or 503 but got ${response.status}. ${text.slice(0, 160)}`);
  }
  const body = await response.json();
  if (!String(body.version || "").includes("28.2.0-automation-inbox-task-engine")) {
    throw new Error(`/api/ready missing V28.2 version marker: ${body.version}`);
  }
  const tableNames = Array.isArray(body.required_tables) ? body.required_tables.map((item) => item.table) : [];
  for (const table of v282ReadyTables) {
    if (!tableNames.includes(table)) throw new Error(`/api/ready missing V28.2 table check: ${table}`);
  }
  console.log(`NANOFIX ready coverage check passed: V28.2 tables present -> ${response.status}`);
}

run("npm", ["run", "typecheck"]);
run("npm", ["run", "lint"]);
run("npm", ["run", "build:css"]);
run("node", ["tools/verify-anchors-v28.mjs"]);
run("node", ["tools/audit-v28.mjs"]);
if (!requiredArtifactsExist()) {
  console.error("NANOFIX verify requires production artifacts. Run `npm run build` first, then run `npm run verify`.");
  process.exit(1);
}
console.log("NANOFIX verify: existing Next.js production artifacts found.");

const server = spawn(nextBin, ["start", "-p", String(port)], {
  cwd: root,
  env: {
    ...process.env,
    NEXT_TELEMETRY_DISABLED: "1",
    NODE_ENV: "production",
    NANOFIX_ADMIN_PUBLIC_PREVIEW: "false",
    NANOFIX_ADMIN_TOKEN_FALLBACK_ENABLED: "false",
    ALLOW_ADMIN_API_SECRET_FALLBACK: "false"
  },
  stdio: ["ignore", "pipe", "pipe"]
});
server.stdout.on("data", (chunk) => process.stdout.write(chunk));
server.stderr.on("data", (chunk) => process.stderr.write(chunk));

try {
  const baseUrl = `http://127.0.0.1:${port}`;
  await waitForServer(baseUrl);
  const checks = [
    ["/", 200],
    ["/leak-detection/thermal-imaging-scan", 200],
    ["/no-hacking-repair/toilet-no-hacking-repair", 200],
    ["/waterproofing-works/rc-roof-metal-roof", 200],
    ["/free-quote/book-site-inspection", 200],
    ["/en/leak-detection", 200],
    ["/zh/free-quote/contact-info-location", 200],
    ["/api/health", 200],
    ["/robots.txt", 200],
    ["/sitemap.xml", 200]
  ];
  for (const [path, status] of checks) await expectStatus(baseUrl, path, status);

  for (const path of [
    "/admin",
    "/dashboard",
    "/dashboard#automation-notification-engine",
    "/dashboard#internal-inbox",
    "/dashboard#unified-task-engine",
    "/website-management",
    "/system-settings",
    "/system-settings#automation-rule-settings",
    "/system-settings#notification-channel-settings",
    "/system-settings#unified-task-sla-settings",
    "/customer-portal",
    "/engineer-portal"
  ]) {
    await expectRedirectToLogin(baseUrl, path);
  }

  const spoofHeaders = { headers: { "x-admin-role": "super_admin", "x-nanofix-role": "super_admin" } };
  for (const path of [
    "/api/admin/search",
    "/api/global-search",
    "/api/portal/customer",
    "/api/portal/engineer",
    "/api/service-requests",
    "/api/admin/automation-notifications",
    "/api/admin/internal-inbox",
    "/api/admin/unified-tasks",
    "/api/admin/workflow-audit",
    "/api/admin/workflow-settings"
  ]) {
    await expectStatus(baseUrl, path, 401, spoofHeaders);
  }

  await expectReadyCoverage(baseUrl);
  console.log("\nNANOFIX V28 production verification completed successfully.");
} catch (error) {
  console.error(error);
  process.exitCode = 1;
} finally {
  server.kill("SIGTERM");
  setTimeout(() => server.kill("SIGKILL"), 1000).unref();
}