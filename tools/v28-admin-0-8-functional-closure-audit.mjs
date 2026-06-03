#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const reportsDir = path.join(root, 'reports');
const skipDirs = new Set(['.git', '.next', 'node_modules', 'reports', 'out', 'dist', 'coverage']);
const sourceExt = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs']);

const modules = [
  {
    key: 'service-operations',
    title: 'Service Operations',
    page: 'app/service-operations/page.tsx',
    requiredApis: [
      '/api/service-requests',
      '/api/admin/status-transition',
      '/api/admin/payments/reconcile',
      '/api/admin/entity-events'
    ],
    expectedChains: ['intake_to_service_request', 'status_transition', 'payment_reconcile', 'audit_event']
  },
  {
    key: 'customer-center',
    title: 'Customer Center',
    page: 'app/customer-center/page.tsx',
    requiredApis: [
      '/api/customer/register',
      '/api/customer-portal/claim-existing-account',
      '/api/portal/repair-tracking',
      '/api/public/registration-requests'
    ],
    expectedChains: ['customer_registration', 'account_claim', 'repair_tracking', 'audit_event']
  },
  {
    key: 'dashboard',
    title: 'Dashboard, Analytics & Alerts',
    page: 'app/dashboard/page.tsx',
    requiredApis: [
      '/api/admin/automation-rules',
      '/api/admin/notifications',
      '/api/admin/tasks',
      '/api/admin/inbox'
    ],
    expectedChains: ['automation_rules', 'notifications_outbox', 'tasks', 'internal_inbox']
  },
  {
    key: 'website-management',
    title: 'Website CMS',
    page: 'app/website-management/page.tsx',
    requiredApis: [
      '/api/cms/blocks',
      '/api/admin/website-content',
      '/api/admin/seo-aeo',
      '/api/admin/entity-events'
    ],
    expectedChains: ['cms_read', 'content_draft', 'seo_aeo', 'audit_event']
  },
  {
    key: 'system-settings',
    title: 'System Settings',
    page: 'app/system-settings/page.tsx',
    requiredApis: [
      '/api/admin/backup',
      '/api/admin/backup-schedules',
      '/api/system/health',
      '/api/system/module-health-worker'
    ],
    expectedChains: ['backup_job', 'backup_schedule', 'module_health', 'worker_secret']
  },
  {
    key: 'advertising',
    title: 'Advertising',
    page: 'app/advertising/page.tsx',
    requiredApis: [
      '/api/admin/advertising-center',
      '/api/ads/accounts/:platform/:action',
      '/api/ads/google/:action'
    ],
    expectedChains: ['campaign_draft', 'account_connector', 'audit_event']
  },
  {
    key: 'social-media',
    title: 'Social Media',
    page: 'app/social-media/page.tsx',
    requiredApis: [
      '/api/social/accounts/:platform/:action',
      '/api/webhooks/social',
      '/api/admin/entity-events'
    ],
    expectedChains: ['social_connector', 'webhook_ingest', 'audit_event']
  },
  {
    key: 'ai-intelligence',
    title: 'AI Intelligence',
    page: 'app/ai-intelligence/page.tsx',
    requiredApis: [
      '/api/admin/ai-draft',
      '/api/admin/ai/drafts',
      '/api/admin/entity-events'
    ],
    expectedChains: ['ai_draft', 'human_review', 'audit_event']
  }
];

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (skipDirs.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (sourceExt.has(path.extname(entry.name))) out.push(full);
  }
  return out;
}

function rel(file) { return path.relative(root, file).replaceAll('\\', '/'); }
function read(file) { try { return fs.readFileSync(file, 'utf8'); } catch { return ''; } }
function unique(items) { return [...new Set(items.filter(Boolean))]; }

function normalizeApiRoute(fileRel) {
  return '/' + fileRel
    .replace(/^app\//, '')
    .replace(/\/route\.(ts|js)$/, '')
    .replace(/\[([^\]]+)\]/g, ':$1')
    .replace(/\/index$/, '');
}

function routeMatches(required, actual) {
  const a = required.split('/').filter(Boolean);
  const b = actual.split('/').filter(Boolean);
  if (a.length !== b.length) return false;
  return a.every((part, i) => part.startsWith(':') || b[i].startsWith(':') || part === b[i]);
}

function apiSignals(file) {
  const fileRel = rel(file);
  const text = read(file);
  const route = normalizeApiRoute(fileRel);
  const methods = ['GET', 'POST', 'PATCH', 'PUT', 'DELETE'].filter((method) => new RegExp(`export\\s+async\\s+function\\s+${method}\\b`).test(text));
  const hasAuth = /require(Admin|Actor|SuperAdmin)Api|requireAdmin\(|requireActor\(|requirePermission\(|requireWebhookSecret\(|CRON_SECRET|NANOFIX_SYSTEM_WORKER_TOKEN|x-system-worker-token|authorized\(request\)/.test(text);
  const hasAudit = /writeAuditLog\s*\(|auditLog\s*\(|\.from\(["']audit_logs["']\)\.insert|_tx['"]|_tx\b|record_.*_snapshot|reconcile_.*_webhook|ingest_.*_tx/.test(text);
  const hasDb = /createSupabaseAdminClient\(|createClient\(|\.from\(|\.rpc\(|supabaseRequest\(|insertIfConfigured\(|listIfConfigured\(|handlePublicRepairRequest\(|\/rest\/v1\//.test(text);
  const hasRead = methods.includes('GET') || /\.select\(|listIfConfigured\(|method:\s*['"]GET['"]/.test(text);
  const hasWrite = methods.some((m) => m !== 'GET') || /\.insert\(|\.update\(|\.delete\(|\.upsert\(|\.rpc\(|insertIfConfigured\(|method:\s*['"]POST['"]|method:\s*['"]PATCH['"]|method:\s*['"]PUT['"]|method:\s*['"]DELETE['"]/.test(text);
  const returnsFakeSuccess = /fake success|fallback success|simulated success|pretend success/i.test(text) && !/without fake success|no local fake success|instead of fake success|not create client-side fake success/i.test(text);
  const tx = /_tx['"]|_tx\b/.test(text);
  return { file: fileRel, route, methods, hasAuth, hasAudit, hasDb, hasRead, hasWrite, returnsFakeSuccess, tx };
}

function pageSignals(file) {
  const text = read(file);
  const fetches = unique([...text.matchAll(/fetch\(\s*['"`]([^'"`]+\/api\/[^'"`]+)/g)].map((m) => m[1]));
  return {
    exists: fs.existsSync(file),
    buttons: (text.match(/<button\b/g) || []).length,
    forms: (text.match(/<form\b/g) || []).length,
    fetches,
    hasMutationUi: /onClick\s*=|onSubmit\s*=|method:\s*['"]POST['"]|method:\s*['"]PATCH['"]|method:\s*['"]PUT['"]|method:\s*['"]DELETE['"]/.test(text),
    fakeMarkers: /fake success|pretend success|localStorage/i.test(text) && !/without fake success|no local fake success|not create-client-side fake success/i.test(text)
  };
}

function scoreModule(module, page, apis) {
  const issues = [];
  const matched = module.requiredApis.map((required) => ({ required, api: apis.find((api) => routeMatches(required, api.route)) || null }));

  if (!page.exists) issues.push({ severity: 'P0', code: 'missing_page', detail: module.page });
  for (const row of matched) {
    if (!row.api) issues.push({ severity: 'P1', code: 'missing_expected_api', detail: row.required });
  }

  const related = matched.map((row) => row.api).filter(Boolean);
  if (page.hasMutationUi && !related.some((api) => api.hasWrite)) issues.push({ severity: 'P1', code: 'mutation_ui_without_write_api', detail: 'Page has mutation UI but no expected write API matched.' });
  if (!related.some((api) => api.hasRead)) issues.push({ severity: 'P1', code: 'no_expected_read_api', detail: 'No expected read API matched.' });
  if (related.some((api) => api.hasWrite && !api.hasAudit)) issues.push({ severity: 'P0', code: 'write_without_audit', detail: related.filter((api) => api.hasWrite && !api.hasAudit).map((api) => api.file).join(', ') });
  if (related.some((api) => api.hasWrite && !api.hasAuth && !api.file.includes('/public/') && !api.file.includes('/webhooks/'))) issues.push({ severity: 'P0', code: 'write_without_auth', detail: related.filter((api) => api.hasWrite && !api.hasAuth).map((api) => api.file).join(', ') });
  if (related.some((api) => (api.hasRead || api.hasWrite) && !api.hasDb)) issues.push({ severity: 'P1', code: 'api_without_db_signal', detail: related.filter((api) => (api.hasRead || api.hasWrite) && !api.hasDb).map((api) => api.file).join(', ') });
  if (page.fakeMarkers || related.some((api) => api.returnsFakeSuccess)) issues.push({ severity: 'P0', code: 'fake_success_marker', detail: 'Fake success marker found in page or expected API.' });

  let score = 100;
  for (const issue of issues) score -= issue.severity === 'P0' ? 25 : 8;
  if (page.exists) score += 5;
  if (related.length >= Math.min(module.requiredApis.length, 2)) score += 5;
  if (related.some((api) => api.hasWrite && api.hasAudit)) score += 5;
  score = Math.max(0, Math.min(100, score));

  return {
    key: module.key,
    title: module.title,
    page: module.page,
    pageSignals: page,
    requiredApis: module.requiredApis,
    matchedApis: matched,
    expectedChains: module.expectedChains,
    issues,
    score,
    risk: issues.some((i) => i.severity === 'P0') ? 'HIGH' : score < 85 || issues.length ? 'MEDIUM' : 'LOW'
  };
}

function counts(issues) {
  return issues.reduce((acc, issue) => { acc[issue.severity] = (acc[issue.severity] || 0) + 1; return acc; }, {});
}

function markdown(report) {
  const lines = [];
  lines.push('# V28 Admin 0-8 Functional Closure Audit');
  lines.push('');
  lines.push(`Generated: ${report.generated_at}`);
  lines.push('');
  lines.push('## Summary');
  lines.push(`- Average score: ${report.summary.average_score}`);
  lines.push(`- Total issues: ${report.summary.total_issues}`);
  lines.push(`- P0 issues: ${report.summary.issue_counts.P0 || 0}`);
  lines.push(`- P1 issues: ${report.summary.issue_counts.P1 || 0}`);
  lines.push(`- High risk modules: ${report.summary.high_risk_modules.join(', ') || 'None'}`);
  lines.push('');
  lines.push('| Module | Score | Risk | Matched APIs | Issues |');
  lines.push('|---|---:|---|---:|---:|');
  for (const item of report.modules) lines.push(`| ${item.title} | ${item.score} | ${item.risk} | ${item.matchedApis.filter((x) => x.api).length}/${item.requiredApis.length} | ${item.issues.length} |`);
  lines.push('');
  lines.push('## Issues');
  const all = report.modules.flatMap((m) => m.issues.map((i) => ({ module: m.key, ...i })));
  if (!all.length) lines.push('No functional closure issues detected by this static audit.');
  for (const issue of all) lines.push(`- **${issue.severity} ${issue.code}** / ${issue.module}: ${issue.detail}`);
  lines.push('');
  lines.push('## Details');
  for (const item of report.modules) {
    lines.push('');
    lines.push(`### ${item.title}`);
    lines.push(`- Score/Risk: ${item.score} / ${item.risk}`);
    lines.push(`- Page buttons/forms/fetches: ${item.pageSignals.buttons}/${item.pageSignals.forms}/${item.pageSignals.fetches.length}`);
    lines.push('- Expected API closure:');
    for (const row of item.matchedApis) lines.push(`  - ${row.required}: ${row.api ? `${row.api.file} [${row.api.methods.join(',') || 'no-method'}]` : 'missing'}`);
  }
  return `${lines.join('\n')}\n`;
}

fs.mkdirSync(reportsDir, { recursive: true });
const allFiles = walk(root);
const apis = allFiles.filter((file) => rel(file).startsWith('app/api/') && /\/route\.(ts|js)$/.test(rel(file))).map(apiSignals);
const results = modules.map((module) => scoreModule(module, pageSignals(path.join(root, module.page)), apis));
const allIssues = results.flatMap((m) => m.issues);
const report = {
  generated_at: new Date().toISOString(),
  summary: {
    average_score: Math.round(results.reduce((sum, m) => sum + m.score, 0) / results.length),
    total_issues: allIssues.length,
    issue_counts: counts(allIssues),
    high_risk_modules: results.filter((m) => m.risk === 'HIGH').map((m) => m.key),
    medium_risk_modules: results.filter((m) => m.risk === 'MEDIUM').map((m) => m.key)
  },
  modules: results
};

fs.writeFileSync(path.join(reportsDir, 'v28-admin-0-8-functional-closure-audit.json'), JSON.stringify(report, null, 2));
fs.writeFileSync(path.join(reportsDir, 'v28-admin-0-8-functional-closure-audit.md'), markdown(report));

console.log('V28 Admin 0-8 functional closure audit completed.');
console.log('Report JSON: reports/v28-admin-0-8-functional-closure-audit.json');
console.log('Report MD:   reports/v28-admin-0-8-functional-closure-audit.md');
console.log(`Average score: ${report.summary.average_score}`);
console.log(`Total issues: ${report.summary.total_issues}`);
console.log(`P0 issues: ${report.summary.issue_counts.P0 || 0}`);
console.log(`P1 issues: ${report.summary.issue_counts.P1 || 0}`);
console.log(`High risk modules: ${report.summary.high_risk_modules.join(', ') || 'None'}`);
