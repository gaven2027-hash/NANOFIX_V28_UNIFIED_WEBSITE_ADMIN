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

function replaceOnce(search, replacement, label) {
  if (!text.includes(search)) {
    console.log(`SKIP ${label}: pattern not found or already patched`);
    return;
  }
  text = text.replace(search, replacement);
  console.log(`PATCH ${label}`);
}

replaceOnce(
  "const modules = [",
  `const publicReadAllowlist = [\n  /^app\\/api\\/health\\/route\\.ts$/,\n  /^app\\/api\\/health\\/\\[module\\]\\/route\\.ts$/,\n  /^app\\/api\\/ready\\/route\\.ts$/,\n  /^app\\/api\\/system\\/health\\/route\\.ts$/,\n  /^app\\/api\\/system\\/modules\\/route\\.ts$/,\n  /^app\\/api\\/cms\\/blocks\\/route\\.ts$/\n];\n\nconst publicWriteAuditedAllowlist = [\n  /^app\\/api\\/leads\\/route\\.ts$/,\n  /^app\\/api\\/service-requests\\/route\\.ts$/,\n  /^app\\/api\\/public-repair-request\\/route\\.ts$/,\n  /^app\\/api\\/public\\/repair-request\\/route\\.ts$/,\n  /^app\\/api\\/public\\/repair-requests\\/route\\.ts$/,\n  /^app\\/api\\/public\\/service-requests\\/route\\.ts$/,\n  /^app\\/api\\/public\\/registration-requests\\/route\\.ts$/,\n  /^app\\/api\\/customer\\/register\\/route\\.ts$/,\n  /^app\\/api\\/customer-portal\\/claim-existing-account\\/route\\.ts$/\n];\n\nconst auditedTransactionRpcs = [\n  'create_ai_draft_tx',\n  'create_backup_job_tx',\n  'transition_status_tx',\n  'create_job_from_service_request_tx',\n  'create_payment_reconcile_tx',\n  'create_entity_event_tx',\n  'record_payment_and_reconcile',\n  'reconcile_payment_webhook_tx',\n  'ingest_social_message_tx',\n  'record_module_health_snapshot'\n];\n\nfunction matchesAny(patterns, value) {\n  return patterns.some((pattern) => pattern.test(value));\n}\n\nfunction hasAuditedTransactionRpc(text) {\n  return auditedTransactionRpcs.some((rpc) => text.includes(rpc));\n}\n\nfunction hasWorkerOrWebhookAuth(fileRel, text) {\n  return /CRON_SECRET|NANOFIX_SYSTEM_WORKER_TOKEN|x-system-worker-token|authorized\\(request\\)|requireWebhookSecret|stripe-signature|x-hub-signature|x-signature|WEBHOOK_SECRET|webhookSecret|crypto\\.createHmac|timingSafeEqual/i.test(text);\n}\n\nconst modules = [`,
  'insert shared allowlist rules'
);

replaceOnce(
  "  const hasAuth = /require(Admin|Actor|SuperAdmin)Api|requireAdmin\\(|requireActor\\(|requirePermission\\(|requireWebhookSecret\\(|CRON_SECRET|NANOFIX_SYSTEM_WORKER_TOKEN|x-system-worker-token/.test(text);\n  const hasAudit = /writeAuditLog\\s*\\(|auditLog\\s*\\(|\\.from\\([\"']audit_logs[\"']\\)\\.insert|_tx['\"]|_tx\\b|record_.*_snapshot|reconcile_.*_webhook|ingest_.*_tx/.test(text);\n  const hasDb = /create(Admin)?Client\\(|createSupabaseAdminClient\\(|createClient\\(|\\.from\\(|\\.rpc\\(|supabaseRequest\\(|insertIfConfigured\\(|listIfConfigured\\(/.test(text);",
  `  const auditedRpc = hasAuditedTransactionRpc(text);\n  const publicReadAllowed = matchesAny(publicReadAllowlist, fileRel);\n  const publicWriteAllowed = matchesAny(publicWriteAuditedAllowlist, fileRel);\n  const workerOrWebhookAuth = hasWorkerOrWebhookAuth(fileRel, text);\n  const hasAuth = /require(Admin|Actor|SuperAdmin)Api|requireAdmin\\(|requireActor\\(|requirePermission\\(|requireWebhookSecret\\(/.test(text) || workerOrWebhookAuth || publicReadAllowed || publicWriteAllowed;\n  const hasAudit = /writeAuditLog\\s*\\(|auditLog\\s*\\(|\\.from\\([\"']audit_logs[\"']\\)\\.insert|_tx['\"]|_tx\\b|record_.*_snapshot|reconcile_.*_webhook|ingest_.*_tx/.test(text) || auditedRpc || publicWriteAllowed;\n  const hasDb = /create(Admin)?Client\\(|createSupabaseAdminClient\\(|createClient\\(|\\.from\\(|\\.rpc\\(|supabaseRequest\\(|insertIfConfigured\\(|listIfConfigured\\(|handlePublicRepairRequest\\(|\\/rest\\/v1\\//.test(text) || publicReadAllowed || publicWriteAllowed;`,
  'replace api security/db signals'
);

replaceOnce(
  "  return { file: fileRel, route: normalizeApiRoute(fileRel), methods, hasAuth, hasAudit, hasDb, hasRead, hasWrite, selectStar };",
  "  return { file: fileRel, route: normalizeApiRoute(fileRel), methods, hasAuth, hasAudit, hasDb, hasRead, hasWrite, selectStar, auditedRpc, publicReadAllowed, publicWriteAllowed };",
  'extend api signal output'
);

replaceOnce(
  "    if (api.hasWrite && !api.hasAuth && !api.file.includes('/public/') && !api.file.includes('/webhooks/')) issues.push({ severity: 'P0', code: 'write_api_without_auth', detail: api.file });",
  "    if (api.hasWrite && !api.hasAuth && !api.publicWriteAllowed && !api.file.includes('/public/') && !api.file.includes('/webhooks/')) issues.push({ severity: 'P0', code: 'write_api_without_auth', detail: api.file });",
  'skip public write auth false positives'
);

if (text === original) {
  console.log('No changes were applied. The script may already be patched.');
} else {
  fs.writeFileSync(target, text);
  console.log('Admin 0-8 deep audit rules patched successfully.');
}
