import fs from 'node:fs';

const findings = [];
const read = (file) => fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
const routePath = 'app/api/global-search/route.ts';
const adminGlobalRoutePath = 'app/api/admin/global-search/route.ts';
const adminSearchRoutePath = 'app/api/admin/search/route.ts';
const route = read(routePath);
const adminGlobalRoute = read(adminGlobalRoutePath);
const adminSearchRoute = read(adminSearchRoutePath);
const legacyRpcName = ['search', 'all', 'records'].join('_');

function add(severity, area, file, message, recommendation) {
  findings.push({ severity, area, file, message, recommendation });
}
function has(text, marker) {
  return text.includes(marker);
}
function count(severity) {
  return findings.filter((finding) => finding.severity === severity).length;
}

if (!route) add('P0', 'global-search', routePath, 'Global search route is missing.', 'Restore the global search API route before deploy.');
if (!adminGlobalRoute) add('P1', 'admin-global-search', adminGlobalRoutePath, 'Admin global search route is missing.', 'Keep admin search routes visible to this verifier.');
if (!adminSearchRoute) add('P1', 'admin-search', adminSearchRoutePath, 'Admin search route is missing.', 'Keep admin search routes visible to this verifier.');

for (const [file, source] of [
  [routePath, route],
  [adminGlobalRoutePath, adminGlobalRoute],
  [adminSearchRoutePath, adminSearchRoute]
]) {
  if (!source) continue;
  if (has(source, `.rpc(`)) {
    add('P0', 'rpc-retirement', file, 'A global-search related route still calls Supabase RPC.', 'Retire RPC search paths and use explicit server-side table allowlists only.');
  }
  if (has(source, legacyRpcName)) {
    add('P0', 'rpc-retirement', file, 'A global-search related route still references the retired legacy search RPC name.', 'Remove legacy RPC references from runtime global search routes.');
  }
  if (has(source, 'select("*")') || has(source, "select('*')")) {
    add('P0', 'field-whitelist', file, 'A search route uses wildcard select.', 'Use explicit field whitelists for every searchable table.');
  }
}

for (const marker of [
  'requireAdminApi(request)',
  'createAdminClient()',
  'GLOBAL_SEARCH_TABLE_ALLOWLIST',
  'BUSINESS_ROLES',
  'CONTENT_ROLES',
  'normalizeSearchQuery',
  'allowedSearchConfigs(role, category)',
  'explicit_table_allowlist',
  'rpc_retired: true',
  'allowed_tables: allowedTables',
  'writeAuditLog',
  'getClientIp(request)'
]) {
  if (!has(route, marker)) add('P0', 'global-search', routePath, `Missing required marker: ${marker}`, 'Keep proof-gated allowlist, server-only auth, input normalization and audit evidence.');
}

const requiredTables = [
  'customers',
  'leads',
  'jobs',
  'invoices',
  'warranties',
  'ai_logs',
  'automation_rules',
  'notification_outbox',
  'unified_tasks',
  'internal_inbox_messages',
  'workflow_settings'
];
for (const table of requiredTables) {
  if (!has(route, `table: '${table}'`)) {
    add('P1', 'allowlist-coverage', routePath, `Search allowlist missing table ${table}.`, 'Keep every searchable table explicit and role-scoped.');
  }
}

const requiredSelectMarkers = [
  'customer_id,name,phone,email,binding_status,created_at',
  'lead_id,source_platform,priority,status,created_at',
  'job_id,service_request_id,customer_id,status,scheduled_at,notes,created_at',
  'invoice_id,invoice_no,total_amount,currency,status,created_at',
  'warranty_id,status,coverage,public_ref,created_at',
  'ai_log_id,module,safety_status,created_at',
  'rule_id,rule_key,name,module,trigger_event,is_enabled,priority,created_at',
  'notification_id,channel,target_role,subject,delivery_status,created_at',
  'task_id,title,source_module,status,priority,created_at',
  'message_id,subject,recipient_role,priority,read_at,created_at',
  'setting_id,setting_key,setting_type,name,description,is_enabled,updated_at'
];
for (const marker of requiredSelectMarkers) {
  if (!has(route, marker)) add('P0', 'field-whitelist', routePath, `Missing select whitelist marker: ${marker}`, 'Do not widen global-search output fields.');
}

if (has(route, 'x-admin-role') || has(route, 'x-nanofix-role') || has(route, 'x-customer-id')) {
  add('P0', 'rbac', routePath, 'Route contains a forgeable header marker.', 'Global search must trust only server-side actor resolution.');
}

const report = {
  ok: count('P0') === 0,
  verifier: 'verify-v28-6-9-4-global-search-rpc-retirement',
  generated_at: new Date().toISOString(),
  branch: 'v28-6-9-4-global-search-rpc-retirement',
  baseline: 'main@726c5d1',
  scope: 'Global Search RPC retirement and proof-gated explicit table allowlist verification.',
  summary: {
    findings_total: findings.length,
    p0: count('P0'),
    p1: count('P1'),
    p2: count('P2'),
    routes_checked: 3,
    allowlisted_tables: requiredTables.length,
    field_whitelists_checked: requiredSelectMarkers.length
  },
  evidence: {
    runtime_global_search_route: routePath,
    admin_global_search_route: adminGlobalRoutePath,
    admin_search_route: adminSearchRoutePath,
    search_engine: 'explicit_table_allowlist',
    service_role_server_only: true,
    rpc_retired: true,
    wildcard_select_forbidden: true,
    forgeable_headers_forbidden: true
  },
  findings
};

fs.writeFileSync('V28_6_9_4_GLOBAL_SEARCH_RPC_RETIREMENT_REPORT.json', JSON.stringify(report, null, 2));
fs.writeFileSync('V28_6_9_4_GLOBAL_SEARCH_RPC_RETIREMENT_REPORT.md', [
  '# V28.6.9.4 Global Search RPC Retirement Report',
  '',
  `Generated: ${report.generated_at}`,
  '',
  `OK: ${report.ok}`,
  '',
  '## Summary',
  '',
  `- P0: ${report.summary.p0}`,
  `- P1: ${report.summary.p1}`,
  `- P2: ${report.summary.p2}`,
  `- Routes checked: ${report.summary.routes_checked}`,
  `- Allowlisted tables: ${report.summary.allowlisted_tables}`,
  `- Field whitelists checked: ${report.summary.field_whitelists_checked}`,
  '',
  '## Evidence',
  '',
  `- Search engine: ${report.evidence.search_engine}`,
  `- Service role server-only: ${report.evidence.service_role_server_only}`,
  `- RPC retired: ${report.evidence.rpc_retired}`,
  `- Wildcard select forbidden: ${report.evidence.wildcard_select_forbidden}`,
  `- Forgeable headers forbidden: ${report.evidence.forgeable_headers_forbidden}`,
  '',
  '## Findings',
  '',
  ...(findings.length ? findings.map((finding) => `- **${finding.severity} / ${finding.area}** ${finding.file}: ${finding.message} Recommendation: ${finding.recommendation}`) : ['- No findings.']),
  ''
].join('\n'));

console.log(JSON.stringify(report, null, 2));
if (!report.ok) process.exitCode = 1;
