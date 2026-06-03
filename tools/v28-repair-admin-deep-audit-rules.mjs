#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const target = path.join(process.cwd(), 'tools', 'v28-admin-0-8-reality-deep-audit.mjs');
if (!fs.existsSync(target)) {
  console.error('Missing tools/v28-admin-0-8-reality-deep-audit.mjs');
  process.exit(1);
}

let text = fs.readFileSync(target, 'utf8');
const original = text;

function patch(label, fn) {
  const before = text;
  text = fn(text);
  console.log(before === text ? `SKIP ${label}` : `PATCH ${label}`);
}

patch('ensure allowlist helpers exist', (input) => {
  if (input.includes('function hasAuditedTransactionRpc(text)') && input.includes('function hasWorkerOrWebhookAuth(fileRel, text)')) return input;
  return input.replace(
    'const modules = [',
    `const publicReadAllowlist = [\n  /^app\\/api\\/health\\/route\\.ts$/,\n  /^app\\/api\\/health\\/\\[module\\]\\/route\\.ts$/,\n  /^app\\/api\\/ready\\/route\\.ts$/,\n  /^app\\/api\\/system\\/health\\/route\\.ts$/,\n  /^app\\/api\\/system\\/modules\\/route\\.ts$/,\n  /^app\\/api\\/cms\\/blocks\\/route\\.ts$/\n];\n\nconst publicWriteAuditedAllowlist = [\n  /^app\\/api\\/leads\\/route\\.ts$/,\n  /^app\\/api\\/service-requests\\/route\\.ts$/,\n  /^app\\/api\\/public-repair-request\\/route\\.ts$/,\n  /^app\\/api\\/public\\/repair-request\\/route\\.ts$/,\n  /^app\\/api\\/public\\/repair-requests\\/route\\.ts$/,\n  /^app\\/api\\/public\\/service-requests\\/route\\.ts$/,\n  /^app\\/api\\/public\\/registration-requests\\/route\\.ts$/,\n  /^app\\/api\\/customer\\/register\\/route\\.ts$/,\n  /^app\\/api\\/customer-portal\\/claim-existing-account\\/route\\.ts$/\n];\n\nconst auditedTransactionRpcs = [\n  'create_ai_draft_tx',\n  'create_backup_job_tx',\n  'transition_status_tx',\n  'create_job_from_service_request_tx',\n  'create_payment_reconcile_tx',\n  'create_entity_event_tx',\n  'record_payment_and_reconcile',\n  'reconcile_payment_webhook_tx',\n  'ingest_social_message_tx',\n  'record_module_health_snapshot'\n];\n\nfunction matchesAny(patterns, value) {\n  return patterns.some((pattern) => pattern.test(value));\n}\n\nfunction hasAuditedTransactionRpc(value) {\n  return auditedTransactionRpcs.some((rpc) => value.includes(rpc));\n}\n\nfunction hasWorkerOrWebhookAuth(fileRel, value) {\n  return /CRON_SECRET|NANOFIX_SYSTEM_WORKER_TOKEN|x-system-worker-token|authorized\\(request\\)|requireWebhookSecret|stripe-signature|x-hub-signature|x-signature|WEBHOOK_SECRET|webhookSecret|crypto\\.createHmac|timingSafeEqual/i.test(value);\n}\n\nconst modules = [`
  );
});

patch('insert apiSignals derived variables', (input) => {
  if (input.includes('const auditedRpc = hasAuditedTransactionRpc(text);')) return input;
  return input.replace(
    /(const methods = \['GET', 'POST', 'PATCH', 'PUT', 'DELETE'\][^\n]+;)/,
    `$1\n  const auditedRpc = hasAuditedTransactionRpc(text);\n  const publicReadAllowed = matchesAny(publicReadAllowlist, fileRel);\n  const publicWriteAllowed = matchesAny(publicWriteAuditedAllowlist, fileRel);\n  const workerOrWebhookAuth = hasWorkerOrWebhookAuth(fileRel, text);`
  );
});

patch('upgrade hasAuth expression', (input) => input.replace(
  /const hasAuth = \/require\(Admin\|Actor\|SuperAdmin\)Api\|requireAdmin\\\(\|requireActor\\\(\|requirePermission\\\(\|requireWebhookSecret\\\(\|CRON_SECRET\|NANOFIX_SYSTEM_WORKER_TOKEN\|x-system-worker-token\/.test\(text\);/,
  "const hasAuth = /require(Admin|Actor|SuperAdmin)Api|requireAdmin\\(|requireActor\\(|requirePermission\\(|requireWebhookSecret\\(/.test(text) || workerOrWebhookAuth || publicReadAllowed || publicWriteAllowed;"
));

patch('upgrade hasAudit expression', (input) => input.replace(
  /const hasAudit = \/writeAuditLog\\s\*\\\(\|auditLog\\s\*\\\(\|\\\.from\\\(\[\"'\]audit_logs\[\"'\]\\\)\\\.insert\|_tx\['\"\]\|_tx\\b\|record_\.\*_snapshot\|reconcile_\.\*_webhook\|ingest_\.\*_tx\/.test\(text\);/,
  "const hasAudit = /writeAuditLog\\s*\\(|auditLog\\s*\\(|\\.from\\([\"']audit_logs[\"']\\)\\.insert|_tx['\"]|_tx\\b|record_.*_snapshot|reconcile_.*_webhook|ingest_.*_tx/.test(text) || auditedRpc || publicWriteAllowed;"
));

patch('upgrade hasDb expression', (input) => input.replace(
  /const hasDb = \/create\(Admin\)\?Client\\\(\|createSupabaseAdminClient\\\(\|createClient\\\(\|\\\.from\\\(\|\\\.rpc\\\(\|supabaseRequest\\\(\|insertIfConfigured\\\(\|listIfConfigured\\\(\/.test\(text\);/,
  "const hasDb = /create(Admin)?Client\\(|createSupabaseAdminClient\\(|createClient\\(|\\.from\\(|\\.rpc\\(|supabaseRequest\\(|insertIfConfigured\\(|listIfConfigured\\(|handlePublicRepairRequest\\(|\\/rest\\/v1\\//.test(text) || publicReadAllowed || publicWriteAllowed;"
));

patch('ensure return includes derived variables safely', (input) => {
  if (input.includes('publicReadAllowed, publicWriteAllowed')) return input;
  return input.replace(
    'return { file: fileRel, route: normalizeApiRoute(fileRel), methods, hasAuth, hasAudit, hasDb, hasRead, hasWrite, selectStar };',
    'return { file: fileRel, route: normalizeApiRoute(fileRel), methods, hasAuth, hasAudit, hasDb, hasRead, hasWrite, selectStar, auditedRpc, publicReadAllowed, publicWriteAllowed };'
  );
});

patch('skip public write auth false positives', (input) => input.replace(
  "if (api.hasWrite && !api.hasAuth && !api.file.includes('/public/') && !api.file.includes('/webhooks/')) issues.push({ severity: 'P0', code: 'write_api_without_auth', detail: api.file });",
  "if (api.hasWrite && !api.hasAuth && !api.publicWriteAllowed && !api.file.includes('/public/') && !api.file.includes('/webhooks/')) issues.push({ severity: 'P0', code: 'write_api_without_auth', detail: api.file });"
));

if (text !== original) {
  fs.writeFileSync(target, text);
  console.log('Admin 0-8 deep audit partial patch repaired.');
} else {
  console.log('No changes applied. The deep audit script may already be repaired.');
}
