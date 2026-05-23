import { spawn } from "node:child_process";
import { setTimeout as sleep } from "node:timers/promises";

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
  "/customer-portal",
  "/engineer-portal"
];

const apiRoutes = [
  ["/api/health", 200],
  ["/api/admin/search", 401],
  ["/api/global-search", 401],
  ["/api/service-requests", 401],
  ["/api/portal/customer", 401],
  ["/api/portal/engineer", 401]
];

let server = null;

function log(message) {
  console.log(`[nanofix-e2e] ${message}`);
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
      NANOFIX_ADMIN_TOKEN_FALLBACK_ENABLED: "false"
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

async function run() {
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
