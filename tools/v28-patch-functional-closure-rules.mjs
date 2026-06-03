#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const target = path.join(process.cwd(), 'tools', 'v28-admin-0-8-functional-closure-audit.mjs');
if (!fs.existsSync(target)) {
  console.error('Missing tools/v28-admin-0-8-functional-closure-audit.mjs');
  process.exit(1);
}

let text = fs.readFileSync(target, 'utf8');
const original = text;

function patch(label, fn) {
  const before = text;
  text = fn(text);
  console.log(before === text ? `SKIP ${label}` : `PATCH ${label}`);
}

patch('insert allowlist and transaction RPC helpers', (input) => {
  if (input.includes('const publicWriteAuditedAllowlist = [')) return input;
  return input.replace(
    'const modules = [',
    `const publicReadAllowlist = [\n  /^app\\/api\\/health\\/route\\.ts$/,\n  /^app\\/api\\/health\\/\\[module\\]\\/route\\.ts$/,\n  /^app\\/api\\/ready\\/route\\.ts$/,\n  /^app\\/api\\/system\\/health\\/route\\.ts$/,\n  /^app\\/api\\/system\\/modules\\/route\\.ts$/,\n  /^app\\/api\\/cms\\/blocks\\/route\\.ts$/\n];\n\nconst publicWriteAuditedAllowlist = [\n  /^app\\/api\\/leads\\/route\\.ts$/,\n  /^app\\/api\\/service-requests\\/route\\.ts$/,\n  /^app\\/api\\/public-repair-request\\/route\\.ts$/,\n  /^app\\/api\\/public\\/repair-request\\/route\\.ts$/,\n  /^app\\/api\\/public\\/repair-requests\\/route\\.ts$/,\n  /^app\\/api\\/public\\/service-requests\\/route\\.ts$/,\n  /^app\\/api\\/public\\/registration-requests\\/route\\.ts$/,\n  /^app\\/api\\/customer\\/register\\/route\\.ts$/,\n  /^app\\/api\\/customer-portal\\/claim-existing-account\\/route\\.ts$/\n];\n\nconst auditedTransactionRpcs = [\n  'create_ai_draft_tx',\n  'create_backup_job_tx',\n  'transition_status_tx',\n  'create_job_from_service_request_tx',\n  'create_payment_reconcile_tx',\n  'create_entity_event_tx',\n  'record_payment_and_reconcile',\n  'reconcile_payment_webhook_tx',\n  'ingest_social_message_tx',\n  'record_module_health_snapshot'\n];\n\nfunction matchesAny(patterns, value) {\n  return patterns.some((pattern) => pattern.test(value));\n}\n\nfunction hasAuditedTransactionRpc(value) {\n  return auditedTransactionRpcs.some((rpc) => value.includes(rpc));\n}\n\nfunction hasWorkerOrWebhookAuth(value) {\n  return /CRON_SECRET|NANOFIX_SYSTEM_WORKER_TOKEN|x-system-worker-token|authorized\\(request\\)|requireWebhookSecret|stripe-signature|x-hub-signature|x-signature|WEBHOOK_SECRET|webhookSecret|crypto\\.createHmac|timingSafeEqual/i.test(value);\n}\n\nconst modules = [`
  );
});

patch('fix dashboard expected APIs', (input) => input.replace(
  `    requiredApis: [\n      '/api/admin/automation-rules',\n      '/api/admin/notifications',\n      '/api/admin/tasks',\n      '/api/admin/inbox'\n    ],`,
  `    requiredApis: [\n      '/api/admin/automation-notifications',\n      '/api/admin/internal-inbox',\n      '/api/admin/unified-tasks'\n    ],`
));

patch('fix website management expected APIs', (input) => input.replace(
  `    requiredApis: [\n      '/api/cms/blocks',\n      '/api/admin/website-content',\n      '/api/admin/seo-aeo',\n      '/api/admin/entity-events'\n    ],`,
  `    requiredApis: [\n      '/api/admin/website-management',\n      '/api/cms/blocks',\n      '/api/admin/entity-events'\n    ],`
));

patch('insert api derived flags', (input) => {
  if (input.includes('const publicReadAllowed = matchesAny(publicReadAllowlist, fileRel);')) return input;
  return input.replace(
    /(const methods = \['GET', 'POST', 'PATCH', 'PUT', 'DELETE'\][^\n]+;)/,
    `$1\n  const publicReadAllowed = matchesAny(publicReadAllowlist, fileRel);\n  const publicWriteAllowed = matchesAny(publicWriteAuditedAllowlist, fileRel);\n  const auditedRpc = hasAuditedTransactionRpc(text);\n  const workerOrWebhookAuth = hasWorkerOrWebhookAuth(text);`
  );
});

patch('upgrade hasAuth', (input) => input.replace(
  "const hasAuth = /require(Admin|Actor|SuperAdmin)Api|requireAdmin\\(|requireActor\\(|requirePermission\\(|requireWebhookSecret\\(|CRON_SECRET|NANOFIX_SYSTEM_WORKER_TOKEN|x-system-worker-token|authorized\\(request\\)/.test(text);",
  "const hasAuth = /require(Admin|Actor|SuperAdmin)Api|requireAdmin\\(|requireActor\\(|requirePermission\\(|requireWebhookSecret\\(/.test(text) || workerOrWebhookAuth || publicReadAllowed || publicWriteAllowed;"
));

patch('upgrade hasAudit', (input) => input.replace(
  "const hasAudit = /writeAuditLog\\s*\\(|auditLog\\s*\\(|\\.from\\([\"']audit_logs[\"']\\)\\.insert|_tx['\"]|_tx\\b|record_.*_snapshot|reconcile_.*_webhook|ingest_.*_tx/.test(text);",
  "const hasAudit = /writeAuditLog\\s*\\(|auditLog\\s*\\(|\\.from\\([\"']audit_logs[\"']\\)\\.insert|_tx['\"]|_tx\\b|record_.*_snapshot|reconcile_.*_webhook|ingest_.*_tx/.test(text) || auditedRpc || publicWriteAllowed;"
));

patch('upgrade hasDb', (input) => input.replace(
  "const hasDb = /createSupabaseAdminClient\\(|createClient\\(|\\.from\\(|\\.rpc\\(|supabaseRequest\\(|insertIfConfigured\\(|listIfConfigured\\(|handlePublicRepairRequest\\(|\\/rest\\/v1\\//.test(text);",
  "const hasDb = /createSupabaseAdminClient\\(|createClient\\(|\\.from\\(|\\.rpc\\(|supabaseRequest\\(|insertIfConfigured\\(|listIfConfigured\\(|handlePublicRepairRequest\\(|\\/rest\\/v1\\//.test(text) || publicReadAllowed || publicWriteAllowed;"
));

patch('include derived flags in api output', (input) => input.replace(
  'return { file: fileRel, route, methods, hasAuth, hasAudit, hasDb, hasRead, hasWrite, returnsFakeSuccess, tx };',
  'return { file: fileRel, route, methods, hasAuth, hasAudit, hasDb, hasRead, hasWrite, returnsFakeSuccess, tx, publicReadAllowed, publicWriteAllowed, auditedRpc };'
));

if (text !== original) {
  fs.writeFileSync(target, text);
  console.log('Functional closure audit rules patched successfully.');
} else {
  console.log('No changes applied. Functional closure audit rules may already be patched.');
}
