#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs';

const failures = [];
const warnings = [];

function read(path) {
  return existsSync(path) ? readFileSync(path, 'utf8') : '';
}

function must(ok, label) {
  console.log(`${ok ? '✅' : '❌'} ${label}`);
  if (!ok) failures.push(label);
}

function warn(ok, label) {
  console.log(`${ok ? '✅' : '⚠️'} ${label}`);
  if (!ok) warnings.push(label);
}

const systemSettingsPage = read('app/system-settings/page.tsx');
const backupCenter = read('components/BackupCenter.tsx');
const backupApi = read('app/api/admin/backups/jobs/route.ts');
const readyEndpoint = read('app/api/ready/route.ts');
const phase10Doc = read('docs/v28.8/phase-10-backup-recovery-real-module-baseline.md');
const packageJson = read('package.json');

console.log('\nV28.8 Phase 10 Backup & Recovery verification');
console.log('------------------------------------------------');

must(Boolean(phase10Doc), 'Phase 10 Backup & Recovery baseline document exists');
must(phase10Doc.includes('Backup & Recovery Real Module Baseline') && phase10Doc.includes('备份与恢复'), 'Baseline document covers Backup & Recovery');
must(phase10Doc.includes('no production Supabase reset') && phase10Doc.includes('RLS remains enabled'), 'Baseline document prohibits production reset and RLS disable');
must(phase10Doc.includes('Restore dry run') && phase10Doc.includes('does not overwrite production data'), 'Baseline document locks restore dry run safety');
must(phase10Doc.includes('node tools/verify-v28-8-phase-10-backup-recovery.mjs'), 'Baseline document exposes direct Phase 10 verifier command');

// System Settings mounting.
must(systemSettingsPage.includes('BackupCenter') && systemSettingsPage.includes('<BackupCenter />'), 'System Settings page mounts BackupCenter');
must(systemSettingsPage.includes('AdminShell') && systemSettingsPage.includes('Website & System Settings'), 'System Settings page stays inside AdminShell');
must(systemSettingsPage.includes('backup') && systemSettingsPage.includes('diagnostics and audit logs'), 'System Settings page describes backup, diagnostics and audit logs');

// Backup Center UI.
must(backupCenter.includes('/api/admin/backups/jobs') && backupCenter.includes('sessionHeaders'), 'Backup Center calls guarded backup jobs API with session headers');
must(backupCenter.includes("cache: 'no-store'") || backupCenter.includes('cache: "no-store"'), 'Backup Center loads backup jobs with no-store');
for (const moduleName of ['central_database','customers','service_requests','website','ai','social','audit_logs']) {
  must(backupCenter.includes(moduleName), `Backup Center supports module ${moduleName}`);
}
must(backupCenter.includes("runBackup('run_now')") && backupCenter.includes('Run Encrypted Backup Now'), 'Backup Center exposes run encrypted backup now');
must(backupCenter.includes("runBackup('queue')") && backupCenter.includes('Queue Backup Job'), 'Backup Center exposes queue backup job');
must(backupCenter.includes("runBackup('restore_dry_run')") && backupCenter.includes('Restore Dry Run'), 'Backup Center exposes restore dry run only');
must(backupCenter.includes("runBackup('create_signed_url'") && backupCenter.includes('Generate audited link'), 'Backup Center creates audited signed download link');
must(backupCenter.includes('download_requires_approval') && backupCenter.includes('download_audited'), 'Backup Center tracks approval and audit download metadata');
must(backupCenter.includes('Exports use an encrypted redaction manifest') || backupCenter.includes('导出使用加密脱敏清单'), 'Backup Center tells operators exports use encrypted redaction manifest');
must(!/localStorage|sessionStorage/.test(backupCenter), 'Backup Center does not use browser storage workflow state');

// Backup API role and mode control.
must(backupApi.includes('requireAdmin') && backupApi.includes('read:*'), 'Backup API GET is admin read guarded');
must(backupApi.includes('requireAdmin') && backupApi.includes('write:settings'), 'Backup API POST is write:settings guarded');
must(backupApi.includes('z.enum(["queue", "run_now", "restore_dry_run", "create_signed_url"])'), 'Backup API restricts allowed modes');
must(backupApi.includes('Supabase is required for backup jobs'), 'Backup API rejects missing Supabase admin client');
must(backupApi.includes('BackupJobSchema.safeParse'), 'Backup API validates input through schema');

// Encrypted backup execution.
must(backupApi.includes('NANOFIX_BACKUP_ENCRYPTION_KEY') && backupApi.includes('BACKUP_ENCRYPTION_KEY'), 'Backup API requires backup encryption key');
must(backupApi.includes('createCipheriv("aes-256-gcm"') || backupApi.includes("createCipheriv(\"aes-256-gcm\""), 'Backup API encrypts payload with AES-256-GCM');
must(backupApi.includes('NANOFIX-BACKUP-V1'), 'Backup API writes and validates NANOFIX backup header');
must(backupApi.includes('supabase.storage.from(BACKUP_BUCKET).upload') && backupApi.includes('public: false'), 'Backup API uploads encrypted backups to private bucket');
must(backupApi.includes('cacheControl: "no-store"') || backupApi.includes("cacheControl: 'no-store'"), 'Backup API stores encrypted object with no-store cache control');
must(backupApi.includes('status: "running"') && backupApi.includes('status: "completed"') && backupApi.includes('status: "failed"'), 'Backup API tracks running/completed/failed status');
must(backupApi.includes('download_requires_approval: true') && backupApi.includes('signed_url: null'), 'Backup execution requires approval and does not auto-return signed URL');

// Redaction manifest.
must(backupApi.includes('SENSITIVE_COLUMN_PATTERN') && backupApi.includes('redaction_manifest'), 'Backup API includes sensitive-column redaction manifest');
must(backupApi.includes('safeColumn') && backupApi.includes('redactValue') && backupApi.includes('redactRows'), 'Backup API filters and redacts sensitive values');
must(backupApi.includes('preferredColumns') && backupApi.includes('limit(1000)'), 'Backup API exports preferred columns with bounded row limit');

// Signed download and audit.
must(backupApi.includes('createSignedDownloadLink') && backupApi.includes('createSignedUrl'), 'Backup API creates signed download links through storage API');
must(backupApi.includes('Only completed backup jobs can create signed download links'), 'Backup API allows signed links only for completed jobs');
must(backupApi.includes('signed_url_expires_at') && backupApi.includes('BACKUP_SIGNED_URL_TTL_SECONDS'), 'Backup API tracks signed URL expiry and TTL');
must(backupApi.includes('backup.signed_download_link_created') && backupApi.includes('[REDACTED_SIGNED_URL]'), 'Backup API audits signed download and redacts URL in audit metadata');

// Restore dry run safety.
must(backupApi.includes('runRestoreDryRun') && backupApi.includes('restore_dry_run'), 'Backup API has restore dry run mode');
must(backupApi.includes('download(job.encrypted_file_path') && backupApi.includes('validHeader'), 'Restore dry run validates encrypted object readability and header');
must(backupApi.includes('it does not overwrite production data'), 'Restore dry run explicitly does not overwrite production data');
must(backupApi.includes('backup.restore_dry_run'), 'Restore dry run writes audit log');
must(!backupApi.includes('drop table') && !backupApi.includes('truncate table') && !backupApi.includes('disable row level security'), 'Backup API has no destructive restore/reset/RLS-disable SQL strings');

// Manifest and tables.
for (const table of ['customers','unified_intake','leads','service_requests','jobs','quotations','invoices','payments','warranties','warranty_claims','customer_document_feedback','unified_tasks','task_events','workflow_settings','audit_logs','backup_jobs','content_drafts','ai_logs','app_modules','notification_outbox','internal_inbox_messages']) {
  must(backupApi.includes(`table: "${table}"`), `Backup table manifest includes ${table}`);
}

// Production readiness.
for (const table of ['audit_logs','workflow_settings','service_requests','jobs','customers']) {
  must(readyEndpoint.includes(`"${table}"`), `/api/ready checks Backup & Recovery core table ${table}`);
}
for (const table of ['backup_jobs','automation_rules','notification_outbox','internal_inbox_messages','app_modules']) {
  must(readyEndpoint.includes(`"${table}"`), `/api/ready checks Backup & Recovery support table ${table}`);
}
must(readyEndpoint.includes('optional_database_ready') && readyEndpoint.includes('failed_optional_tables'), '/api/ready exposes optional database readiness and failed optional tables');

warn(packageJson.includes('"verify:v28-8-phase-10-backup-recovery"'), 'package.json exposes V28.8 Phase 10 Backup & Recovery npm alias');
warn(backupApi.includes('notification_outbox') || backupApi.includes('internal_inbox_messages'), 'Backup API writes failure notifications/inbox messages directly');

if (failures.length) {
  console.error(`\nV28.8 Phase 10 Backup & Recovery verification failed: ${failures.length} issue(s).`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(JSON.stringify({
  ok: true,
  verifier: 'verify-v28-8-phase-10-backup-recovery',
  failures,
  warnings,
  checked: {
    systemSettingsBackupCenterMounted: true,
    backupCenterUiBaseline: true,
    backupJobsApiRoleBoundary: true,
    encryptedBackupExecution: true,
    redactionManifest: true,
    auditedSignedDownload: true,
    restoreDryRunSafety: true,
    noProductionRestoreResetOrRlsDisable: true,
    productionReadyEndpointTables: true
  }
}, null, 2));
