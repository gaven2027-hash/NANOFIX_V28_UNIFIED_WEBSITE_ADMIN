import fs from "node:fs";

const files = {
  jobs: "app/api/admin/backups/jobs/route.ts",
  backupCenter: "components/BackupCenter.tsx",
  legacySchedules: "app/api/admin/backup-schedules/route.ts",
  legacyBackup: "app/api/admin/backup/route.ts"
};

const findings = [];

function read(path) {
  return fs.existsSync(path) ? fs.readFileSync(path, "utf8") : "";
}

function add(severity, area, file, message) {
  findings.push({ severity, area, file, message });
}

function functionBody(source, functionName) {
  const start = source.indexOf(`function ${functionName}`) >= 0 ? source.indexOf(`function ${functionName}`) : source.indexOf(`async function ${functionName}`);
  if (start < 0) return "";
  const brace = source.indexOf("{", start);
  if (brace < 0) return "";
  let depth = 0;
  for (let index = brace; index < source.length; index += 1) {
    const char = source[index];
    if (char === "{") depth += 1;
    if (char === "}") depth -= 1;
    if (depth === 0) return source.slice(start, index + 1);
  }
  return source.slice(start);
}

for (const [key, path] of Object.entries(files)) {
  if (!fs.existsSync(path)) add("P0", "file", path, `Required ${key} file is missing.`);
}

const jobs = read(files.jobs);
const backupCenter = read(files.backupCenter);
const legacySchedules = read(files.legacySchedules);
const legacyBackup = read(files.legacyBackup);
const runEncryptedBackupBody = functionBody(jobs, "runEncryptedBackup");

for (const marker of ["BACKUP_TABLE_MANIFEST", "preferredColumns", "redaction_manifest", "SENSITIVE_COLUMN_PATTERN", "resolveExportColumns", "redactRows"]) {
  if (!jobs.includes(marker)) add("P0", "redaction", files.jobs, `Backup jobs route is missing redaction marker ${marker}.`);
}

if (/\.select\(\)\.limit\(1000\)/.test(jobs) || /\.select\(\)\s*\.limit/.test(jobs)) {
  add("P0", "redaction", files.jobs, "Backup jobs route still exports whole rows with select().limit().");
}

if (!jobs.includes("create_signed_url") || !jobs.includes("backup.signed_download_link_created")) {
  add("P0", "download_control", files.jobs, "Backup jobs route must generate signed links only through audited create_signed_url flow.");
}

if (/signed_url:\s*signed\.data\?\.signedUrl/.test(runEncryptedBackupBody)) {
  add("P0", "download_control", files.jobs, "runEncryptedBackup still returns a signed URL directly.");
}
if (!/signed_url:\s*null/.test(runEncryptedBackupBody) || !/download_requires_approval:\s*true/.test(runEncryptedBackupBody)) {
  add("P0", "download_control", files.jobs, "runEncryptedBackup must return signed_url:null and download_requires_approval:true.");
}

if (!backupCenter.includes("create_signed_url") || !backupCenter.includes("Generate audited link")) {
  add("P0", "ui", files.backupCenter, "Backup UI must request signed links through explicit audited action.");
}

if (/requirePermission\(request, "\*"\)/.test(legacySchedules)) {
  add("P0", "legacy_route", files.legacySchedules, "Legacy backup schedule route still uses wildcard permission.");
}
if (!legacySchedules.includes("requireAdmin") || !legacySchedules.includes("write:settings")) {
  add("P0", "legacy_route", files.legacySchedules, "Legacy backup schedule route must retain visible auth markers for static production scans.");
}
if (!legacySchedules.includes("/backups/schedules/route") && !legacySchedules.includes("canonicalPATCH")) {
  add("P1", "legacy_route", files.legacySchedules, "Legacy backup schedule route is not clearly routed to canonical handler.");
}

if (/create_backup_job_tx|module_key|signed_url/.test(legacyBackup)) {
  add("P0", "legacy_route", files.legacyBackup, "Legacy backup route still references old RPC/columns.");
}
if (!legacyBackup.includes("requireAdmin") || !legacyBackup.includes("write:settings")) {
  add("P0", "legacy_route", files.legacyBackup, "Retired legacy backup route must retain visible auth markers for static production scans.");
}
if (!legacyBackup.includes("status: 410") || !legacyBackup.includes("canonical_route")) {
  add("P1", "legacy_route", files.legacyBackup, "Legacy backup route should be retired with a 410 canonical-route response.");
}

const report = {
  ok: findings.filter((finding) => finding.severity === "P0").length === 0,
  verifier: "verify-v28-6-8-1-settings-backup-hardening",
  generated_at: new Date().toISOString(),
  branch: "v28-6-8-1-settings-backup-hardening",
  baseline: "main@bcbb14a",
  scope: "Focused hardening for V28.6.8 P1 backup findings.",
  summary: {
    files_checked: Object.keys(files).length,
    findings_total: findings.length,
    p0: findings.filter((finding) => finding.severity === "P0").length,
    p1: findings.filter((finding) => finding.severity === "P1").length
  },
  fixed_scope: [
    "Backup redaction manifest / export-safe column selection",
    "Audited signed download link action",
    "Legacy backup schedule route permission cleanup",
    "Legacy backup route retirement"
  ],
  findings
};

fs.writeFileSync("V28_6_8_1_SETTINGS_BACKUP_HARDENING_REPORT.json", JSON.stringify(report, null, 2));

const md = [
  "# V28.6.8.1 Settings / Backup Focused Hardening Report",
  "",
  `Generated: ${report.generated_at}`,
  "",
  `OK: ${report.ok}`,
  "",
  "## Summary",
  "",
  `- Files checked: ${report.summary.files_checked}`,
  `- Findings total: ${report.summary.findings_total}`,
  `- P0 findings: ${report.summary.p0}`,
  `- P1 findings: ${report.summary.p1}`,
  "",
  "## Fixed Scope",
  "",
  ...report.fixed_scope.map((item) => `- ${item}`),
  "",
  "## Findings",
  "",
  ...(findings.length ? findings.map((finding) => `- **${finding.severity} / ${finding.area}** ${finding.file}: ${finding.message}`) : ["- No hardening verifier findings detected."]),
  ""
].join("\n");

fs.writeFileSync("V28_6_8_1_SETTINGS_BACKUP_HARDENING_REPORT.md", md);

console.log(JSON.stringify(report, null, 2));
if (!report.ok) process.exitCode = 1;
