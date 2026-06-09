import fs from "node:fs";

const requiredFiles = [
  "app/system-settings/page.tsx",
  "components/BackupCenter.tsx",
  "app/api/admin/backups/jobs/route.ts",
  "app/api/admin/backups/schedules/route.ts",
  "app/api/admin/backup-schedules/route.ts",
  "supabase/migrations"
];

const optionalLegacyFiles = [
  "app/api/admin/backup/route.ts"
];

const findings = [];

function read(file) {
  return fs.existsSync(file) && fs.statSync(file).isFile() ? fs.readFileSync(file, "utf8") : "";
}

function exists(path) {
  return fs.existsSync(path);
}

function add(severity, area, file, message) {
  findings.push({ severity, area, file, message });
}

for (const file of requiredFiles) {
  if (!exists(file)) add("P0", "file", file, "Required Settings / Backup module file or directory is missing.");
}

const systemSettings = read("app/system-settings/page.tsx");
if (!/BackupCenter/.test(systemSettings)) {
  add("P0", "ui", "app/system-settings/page.tsx", "System Settings page must render BackupCenter.");
}

const backupCenter = read("components/BackupCenter.tsx");
for (const marker of ["/api/admin/backups/jobs", "Run Encrypted Backup Now", "restore_dry_run", "createBrowserClient", "signed_url", "No plaintext passwords"]) {
  if (!backupCenter.includes(marker)) {
    add("P1", "ui", "components/BackupCenter.tsx", `BackupCenter is missing expected marker: ${marker}`);
  }
}

const jobs = read("app/api/admin/backups/jobs/route.ts");
for (const marker of ["requireAdmin", "write:settings", "read:*", "NANOFIX_BACKUP_ENCRYPTION_KEY", "aes-256-gcm", "public: false", "createSignedUrl", "restore_dry_run", "auditLog", "backup_jobs", "encrypted_file_path", "signed_url_expires_at"]) {
  if (!jobs.includes(marker)) {
    add("P0", "backup_jobs", "app/api/admin/backups/jobs/route.ts", `Backup jobs API is missing expected marker: ${marker}`);
  }
}
if (/\.select\(\)\.limit\(1000\)/.test(jobs) || /\.select\(\)\s*\.limit/.test(jobs)) {
  add("P1", "data_safety", "app/api/admin/backups/jobs/route.ts", "Backup data collector exports whole selected table rows without explicit redaction allowlist. Keep encrypted, but add a future redaction manifest before target 94-96.");
}
if (/signed_url\s*[:=]|signed\.data\?\.signedUrl/.test(jobs) && /return\s*\{[\s\S]*signed_url/.test(jobs)) {
  add("P1", "download_control", "app/api/admin/backups/jobs/route.ts", "Run-now response returns a signed URL directly. Acceptable for Super Admin workflow, but future target should require approval/download audit step.");
}

const schedules = read("app/api/admin/backups/schedules/route.ts");
for (const marker of ["requireAdmin", "read:*", "write:settings", "backup_schedules", "auditLog", "retention_days", "nextRunPreview"]) {
  if (!schedules.includes(marker)) {
    add("P0", "backup_schedules", "app/api/admin/backups/schedules/route.ts", `Backup schedules API is missing expected marker: ${marker}`);
  }
}

const legacySchedule = read("app/api/admin/backup-schedules/route.ts");
if (legacySchedule) {
  if (/requirePermission\(request, "\*"\)/.test(legacySchedule)) {
    add("P1", "legacy_route", "app/api/admin/backup-schedules/route.ts", "Legacy backup schedule route uses wildcard permission for POST. Prefer canonical /api/admin/backups/schedules with write:settings.");
  }
}

const legacyBackup = read("app/api/admin/backup/route.ts");
if (legacyBackup) {
  if (/module_key|schedule_text|signed_url|create_backup_job_tx/.test(legacyBackup)) {
    add("P1", "legacy_route", "app/api/admin/backup/route.ts", "Legacy backup API appears to use older backup_jobs columns/RPC. Keep disabled from UI or retire/redirect to /api/admin/backups/jobs.");
  }
  if (!/auditLog|create_backup_job_tx/.test(legacyBackup)) {
    add("P1", "audit", "app/api/admin/backup/route.ts", "Legacy backup API does not clearly write audit logs itself.");
  }
}

const report = {
  ok: findings.filter((finding) => finding.severity === "P0").length === 0,
  verifier: "verify-v28-6-8-settings-backup-real-module-audit",
  generated_at: new Date().toISOString(),
  branch: "v28-6-8-settings-backup-real-module-audit",
  baseline: "main@51e77f8",
  scope: "Audit only. No repair code and no production database changes.",
  live_checks_to_attach: [
    "backup_jobs and backup_schedules RLS/policy status",
    "system-backups storage bucket privacy",
    "production env readiness for NANOFIX_BACKUP_ENCRYPTION_KEY"
  ],
  summary: {
    required_files_checked: requiredFiles.length,
    optional_legacy_files_checked: optionalLegacyFiles.length,
    findings_total: findings.length,
    p0: findings.filter((finding) => finding.severity === "P0").length,
    p1: findings.filter((finding) => finding.severity === "P1").length
  },
  findings,
  recommendation: findings.some((finding) => finding.severity === "P0")
    ? "Open V28.6.8.1 focused repair before merge."
    : findings.some((finding) => finding.severity === "P1")
      ? "No blocking P0. Create V28.6.8.1 focused hardening for legacy route cleanup, redaction manifest, and download approval before target 94-96."
      : "No structural findings. Proceed with production smoke/live checks."
};

fs.writeFileSync("V28_6_8_SETTINGS_BACKUP_REAL_MODULE_AUDIT_REPORT.json", JSON.stringify(report, null, 2));

const md = [
  "# V28.6.8 Settings / Backup Real Module Audit Report",
  "",
  `Generated: ${report.generated_at}`,
  "",
  `OK: ${report.ok}`,
  "",
  "## Summary",
  "",
  `- Required files checked: ${report.summary.required_files_checked}`,
  `- Optional legacy files checked: ${report.summary.optional_legacy_files_checked}`,
  `- Findings total: ${report.summary.findings_total}`,
  `- P0 findings: ${report.summary.p0}`,
  `- P1 findings: ${report.summary.p1}`,
  "",
  "## Findings",
  "",
  ...(findings.length ? findings.map((finding) => `- **${finding.severity} / ${finding.area}** ${finding.file}: ${finding.message}`) : ["- No blocking structural findings detected."]),
  "",
  "## Live Checks To Attach",
  "",
  ...report.live_checks_to_attach.map((item) => `- ${item}`),
  "",
  "## Recommendation",
  "",
  report.recommendation,
  ""
].join("\n");

fs.writeFileSync("V28_6_8_SETTINGS_BACKUP_REAL_MODULE_AUDIT_REPORT.md", md);

console.log(JSON.stringify(report, null, 2));
if (!report.ok) process.exitCode = 1;
