import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";

const projectRoot = process.cwd();
const nextBin = process.platform === "win32"
  ? join(projectRoot, "node_modules", ".bin", "next.cmd")
  : join(projectRoot, "node_modules", ".bin", "next");

const hardTimeoutMs = Number(process.env.NANOFIX_NEXT_BUILD_TIMEOUT_MS || 420_000);
const gracefulAfterSummaryMs = Number(process.env.NANOFIX_NEXT_BUILD_GRACEFUL_AFTER_SUMMARY_MS || 2_500);
let routeSummarySeen = false;
let outputBuffer = "";
let exited = false;
let summaryTimer;

function buildArtifactsExist() {
  return [
    join(projectRoot, ".next", "BUILD_ID"),
    join(projectRoot, ".next", "routes-manifest.json"),
    join(projectRoot, ".next", "server", "app-paths-manifest.json")
  ].every((file) => existsSync(file));
}

function finishFromSummary(child) {
  if (exited) return;
  if (!routeSummarySeen || !buildArtifactsExist()) return;
  exited = true;
  child.kill("SIGTERM");
  setTimeout(() => {
    if (!child.killed) child.kill("SIGKILL");
  }, 1_000).unref();
  console.log("\nNANOFIX build guard: Next.js route summary and build artifacts detected. Closing lingering build worker handles safely.");
  process.exit(0);
}

const child = spawn(nextBin, ["build"], {
  cwd: projectRoot,
  env: {
    ...process.env,
    NEXT_TELEMETRY_DISABLED: "1"
  },
  stdio: ["ignore", "pipe", "pipe"]
});

function consume(chunk, stream) {
  const text = chunk.toString();
  stream.write(text);
  outputBuffer = (outputBuffer + text).slice(-8000);
  if (outputBuffer.includes("ƒ  (Dynamic)  server-rendered on demand")) {
    routeSummarySeen = true;
    clearTimeout(summaryTimer);
    summaryTimer = setTimeout(() => finishFromSummary(child), gracefulAfterSummaryMs);
    summaryTimer.unref();
  }
}

child.stdout.on("data", (chunk) => consume(chunk, process.stdout));
child.stderr.on("data", (chunk) => consume(chunk, process.stderr));

const hardTimer = setTimeout(() => {
  if (exited) return;
  child.kill("SIGTERM");
  console.error(`NANOFIX build guard: next build exceeded ${hardTimeoutMs}ms before a completed route summary was detected.`);
  process.exit(1);
}, hardTimeoutMs);
hardTimer.unref();

child.on("exit", (code, signal) => {
  if (exited) return;
  clearTimeout(hardTimer);
  clearTimeout(summaryTimer);
  exited = true;
  if (code === 0) {
    process.exit(0);
  }
  if (routeSummarySeen && buildArtifactsExist() && signal === "SIGTERM") {
    process.exit(0);
  }
  process.exit(code ?? 1);
});
