import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { setTimeout as sleep } from "node:timers/promises";

const root = process.cwd();
const port = Number(process.env.NANOFIX_E2E_PORT || 3941);
const baseURL = process.env.PLAYWRIGHT_BASE_URL || `http://127.0.0.1:${port}`;
const shouldStartServer = process.env.NANOFIX_E2E_USE_EXISTING_SERVER !== "true";
const serverCommand = process.env.NANOFIX_E2E_SERVER_COMMAND || "npm";
const serverArgs = process.env.NANOFIX_E2E_SERVER_ARGS
  ? process.env.NANOFIX_E2E_SERVER_ARGS.split(" ").filter(Boolean)
  : ["run", "start", "--", "-p", String(port)];

const publicRoutes = [
  "/",
  "/leak-detection",
  "/leak-detection/thermal-imaging-scan",
  "/no-hacking-repair/toilet-no-hacking-repair",
  "/waterproofing-works/rc-roof-metal-roof",
  "/track-record-warranty/service-warranty-terms",
  "/free-quote/book-site-inspection",
  "/en",
  "/zh"
];

const protectedRoutes = [
  "/admin",
  "/dashboard",
  "/dashboard#automation-notification-engine",
  "/dashboard#internal-inbox",
  "/dashboard#unified-task-engine",
  "/customer-portal",
  "/engineer-portal",
  "/system-settings",
  "/system-settings#automation-rule-settings",
  "/system-settings#notification-channel-settings",
  "/system-settings#unified-task-sla-settings",
  "/admin/advertising-center",
  "/admin/advertising-center/import",
  "/admin/advertising-center/insights",
  "/admin/advertising-center/creatives",
  "/admin/advertising-center/budgets"
];

const apiRoutes = [
  ["/api/health", 200],
  ["/api/admin/search", 401],
  ["/api/global-search", 401],
  ["/api/service-requests", 401],
  ["/api/portal/customer", 401],
  ["/api/portal/engineer", 401],
  ["/api/admin/advertising-center", 401],
  ["/api/admin/advertising-center/import", 401],
  ["/api/admin/advertising-center/insights", 401],
  ["/api/admin/advertising-center/creatives", 401],
  ["/api/admin/advertising-center/budgets", 401],
  ["/api/admin/automation-notifications", 401],
  ["/api/admin/internal-inbox", 401],
  ["/api/admin/unified-tasks", 401],
  ["/api/admin/workflow-audit", 401],
  ["/api/admin/workflow-settings", 401]
];

const readyTables = [
  "automation_rules",
  "notification_outbox",
  "internal_inbox_messages",
  "unified_tasks",
  "task_events",
  "workflow_settings"
];

let server = null;

function log(message) {
  console.log(`[nanofix-e2e] ${message}`);
}

function readRepoFile(file) {
  return fs.readFileSync(path.join(root, file), "utf8");
}

async function request(pathname, init = {}) {
  const response = await fetch(`${baseURL}${pathname}`, { redirect: "manual", ...init });
  const text = await response.text().catch(() => "");
  return { response, text };
}

async function waitForServer() {
  const deadline = Date.now() + Number(process.env.NANOFIX_E2E_SERVER_TIMEOUT_MS || 60000);
  let lastError = null;
  while (Date.now() < deadline) {
    try {
      const { response } = await request("/api/health");
      if (response.status < 500) return;
      lastError = new Error(`Health returned ${response.status}`);
    } catch (error) {
      lastError = error;
    }
    await sleep(750);
  }
  throw lastError || new Error("Server did not become ready in time");
}

function startServer() {
  log(`starting server: ${serverCommand} ${serverArgs.join(" ")}`);
  server = spawn(serverCommand, serverArgs, {
    cwd: process.cwd(),
    env: {
      ...process.env,
      NODE_ENV: "production",
      NEXT_TELEMETRY_DISABLED: "1",
      NANOFIX_ADMIN_PUBLIC_PREVIEW: "false",
      NANOFIX_ADMIN_TOKEN_FALLBACK_ENABLED: "false",
      ALLOW_ADMIN_API_SECRET_FALLBACK: "false"
    },
    stdio: ["ignore", "pipe", "pipe"],
    detached: process.platform !== "win32"
  });
  server.stdout.on("data", (chunk) => process.stdout.write(chunk));
  server.stderr.on("data", (chunk) => process.stderr.write(chunk));
}

async function stopServer() {
  if (!server?.pid) return;
  try {
    if (process.platform !== "win32") process.kill(-server.pid, "SIGTERM");
    else server.kill("SIGTERM");
  } catch {
    server.kill("SIGTERM");
  }
  await sleep(500);
  try {
    if (process.platform !== "win32") process.kill(-server.pid, "SIGKILL");
  } catch {
    if (!server.killed) server.kill("SIGKILL");
  }
}

function parseJson(text, route) {
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`${route} did not return valid JSON`);
  }
}

function checkStaticV282SettingsSearchMarkers() {
  const globalSearch = readRepoFile("app/api/global-search/route.ts");
  for (const marker of [
    "workflow_settings",
    "workflowSettingHref",
    "/system-settings#automation-rule-settings",
    "/system-settings#notification-channel-settings",
    "/system-settings#unified-task-sla-settings",
    "mergeResults",
    "rpc_result_count",
    "fallback_result_count"
  ]) {
    if (!globalSearch.includes(marker)) throw new Error(`Global Search missing V28.2 settings marker: ${marker}`);
  }

  const settingsPage = readRepoFile("app/system-settings/page.tsx");
  if (!settingsPage.includes("WorkflowSettingsWorkspace")) throw new Error("System Settings page must render WorkflowSettingsWorkspace");
  if (settingsPage.includes("AutomationNotificationWorkspace")) throw new Error("System Settings page must not render dashboard AutomationNotificationWorkspace");

  const settingsComponent = readRepoFile("components/WorkflowSettingsWorkspace.tsx");
  for (const marker of ["/api/admin/workflow-settings", "automation_rule_setting", "notification_channel", "unified_task_sla", "PATCH"]) {
    if (!settingsComponent.includes(marker)) throw new Error(`WorkflowSettingsWorkspace missing marker: ${marker}`);
  }
  log("static V28.2 settings/search markers ok");
}

async function checkReadyRoute() {
  const { response, text } = await request("/api/ready");
  if (![200, 503].includes(response.status)) {
    throw new Error(`/api/ready expected 200 or 503; got ${response.status}`);
  }
  const body = parseJson(text, "/api/ready");
  if (body.service !== "nanofix-v28-unified-website-admin") {
    throw new Error(`/api/ready service marker mismatch: ${body.service}`);
  }
  if (!String(body.version || "").includes("28.2.0-automation-inbox-task-engine")) {
    throw new Error(`/api/ready missing V28.2 readiness version; got ${body.version}`);
  }
  const tableNames = Array.isArray(body.required_tables) ? body.required_tables.map((item) => item.table) : [];
  for (const table of readyTables) {
    if (!tableNames.includes(table)) throw new Error(`/api/ready missing V28.2 table check: ${table}`);
  }
  log(`/api/ready ok for V28.2 table coverage -> ${response.status}`);
}

async function run() {
  checkStaticV282SettingsSearchMarkers();

  if (shouldStartServer) startServer();
  await waitForServer();
  log(`server ready at ${baseURL}`);

  for (const route of publicRoutes) {
    const { response, text } = await request(route);
    if (response.status >= 400) throw new Error(`Public route ${route} returned ${response.status}`);
    if (!/NANOFIX|Waterproofing|漏水|防水/i.test(text)) {
      throw new Error(`Public route ${route} did not include expected NANOFIX content marker`);
    }
    log(`public route ok: ${route} -> ${response.status}`);
  }

  for (const route of protectedRoutes) {
    const { response } = await request(route);
    const location = response.headers.get("location") || "";
    if (![302, 303, 307, 308].includes(response.status) || !location.includes("/login")) {
      throw new Error(`Protected route ${route} should redirect to /login; got ${response.status} ${location}`);
    }
    log(`protected route ok: ${route} -> ${response.status} ${location}`);
  }

  for (const [route, expectedStatus] of apiRoutes) {
    const { response } = await request(route, {
      headers: { "x-admin-role": "super_admin", "x-nanofix-role": "super_admin" }
    });
    if (response.status !== expectedStatus) {
      throw new Error(`API route ${route} expected ${expectedStatus}; got ${response.status}`);
    }
    log(`api route ok: ${route} -> ${response.status}`);
  }

  await checkReadyRoute();

  log("E2E smoke checks passed.");
}

let exitCode = 0;
try {
  await run();
} catch (error) {
  exitCode = 1;
  console.error(`[nanofix-e2e] failed: ${error instanceof Error ? error.message : String(error)}`);
} finally {
  await stopServer();
}
process.exit(exitCode);
