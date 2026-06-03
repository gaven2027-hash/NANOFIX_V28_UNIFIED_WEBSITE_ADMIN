#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const reportsDir = path.join(root, 'reports');
const skipDirs = new Set(['.git', '.next', 'node_modules', 'reports', 'out', 'dist', 'coverage']);
const sourceExt = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs']);

const modules = [
  { index: 0, key: 'admin-home', title: 'Admin Home', route: '/admin', page: 'app/admin/page.tsx', keywords: ['admin', 'home', 'overview'] },
  { index: 1, key: 'dashboard', title: 'Dashboard, Analytics & Alerts', route: '/dashboard', page: 'app/dashboard/page.tsx', keywords: ['dashboard', 'analytics', 'alerts'] },
  { index: 2, key: 'service-operations', title: 'Service & Order Operations', route: '/service-operations', page: 'app/service-operations/page.tsx', keywords: ['service', 'operations', 'job', 'quotation', 'invoice', 'warranty', 'payment'] },
  { index: 3, key: 'website-management', title: 'Website Management / CMS', route: '/website-management', page: 'app/website-management/page.tsx', keywords: ['website', 'cms', 'content', 'guide', 'seo'] },
  { index: 4, key: 'social-media', title: 'Social Media Management', route: '/social-media', page: 'app/social-media/page.tsx', keywords: ['social', 'media', 'facebook', 'instagram', 'tiktok', 'youtube', 'google-business'] },
  { index: 5, key: 'advertising', title: 'Advertising & Acquisition', route: '/advertising', page: 'app/advertising/page.tsx', keywords: ['advertising', 'ads', 'campaign', 'attribution'] },
  { index: 6, key: 'ai-intelligence', title: 'AI Intelligence Center', route: '/ai-intelligence', page: 'app/ai-intelligence/page.tsx', keywords: ['ai', 'intelligence', 'draft', 'suggestion', 'analysis'] },
  { index: 7, key: 'customer-center', title: 'Customer Center', route: '/customer-center', page: 'app/customer-center/page.tsx', keywords: ['customer', 'portal', 'member', 'claim', 'document'] },
  { index: 8, key: 'system-settings', title: 'Website & System Settings', route: '/system-settings', page: 'app/system-settings/page.tsx', keywords: ['system', 'settings', 'backup', 'api', 'role', 'permission'] }
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

function rel(file) {
  return path.relative(root, file).replaceAll('\\', '/');
}

function read(file) {
  try { return fs.readFileSync(file, 'utf8'); } catch { return ''; }
}

function lineHits(text, regex, limit = 20) {
  return text.split(/\r?\n/).map((line, i) => ({ line: i + 1, text: line.trim() })).filter((row) => regex.test(row.text)).slice(0, limit);
}

function count(regex, text) {
  return (text.match(regex) || []).length;
}

function unique(items) {
  return [...new Set(items.filter(Boolean))];
}

function extractComponentImports(text) {
  const names = [];
  const importRegex = /import\s+(?:\{([^}]+)\}|([A-Za-z0-9_]+))\s+from\s+['"]([^'"]+)['"]/g;
  let match;
  while ((match = importRegex.exec(text))) {
    const source = match[3] || '';
    if (!source.includes('components')) continue;
    if (match[1]) names.push(...match[1].split(',').map((item) => item.trim().split(/\s+as\s+/i).pop()?.trim()));
    if (match[2]) names.push(match[2].trim());
    const sourceBase = path.basename(source).replace(/\.(tsx|ts|jsx|js)$/i, '');
    if (sourceBase && sourceBase !== 'components') names.push(sourceBase);
  }
  return unique(names);
}

function camelToKebab(value) {
  return value.replace(/([a-z0-9])([A-Z])/g, '$1-$2').replace(/[\s_]+/g, '-').toLowerCase();
}

function findComponentFiles(allFiles, importNames, keywords) {
  const wanted = new Set(importNames.flatMap((name) => [name, camelToKebab(name || '')]).filter(Boolean));
  return allFiles.filter((file) => {
    const fileRel = rel(file);
    if (!fileRel.startsWith('components/')) return false;
    const base = path.basename(fileRel).replace(/\.(tsx|ts|jsx|js)$/i, '');
    const kebabBase = camelToKebab(base);
    if (wanted.has(base) || wanted.has(kebabBase)) return true;
    return keywords.some((kw) => fileRel.toLowerCase().includes(kw.toLowerCase()));
  });
}

function extractApiCalls(text) {
  const calls = [];
  const patterns = [
    /fetch\(\s*['"]([^'"]*\/api\/[^'"]+)['"]/g,
    /fetch\(\s*`([^`]*\/api\/[^`]+)`/g,
    /axios\.[a-z]+\(\s*['"]([^'"]*\/api\/[^'"]+)['"]/g
  ];
  for (const regex of patterns) {
    let match;
    while ((match = regex.exec(text))) calls.push(match[1]);
  }
  return unique(calls.map((call) => call.replace(/\$\{[^}]+\}/g, '[param]').replace(/^https?:\/\/[^/]+/, '')));
}

function normalizeApiRoute(fileRel) {
  return '/' + fileRel
    .replace(/^app\//, '')
    .replace(/\/route\.(ts|js)$/, '')
    .replace(/\[([^\]]+)\]/g, ':$1')
    .replace(/\/index$/, '');
}

function routeMatchesCall(route, call) {
  const baseCall = call.split('?')[0].replace(/\[param\]/g, '[param]');
  const routeParts = route.split('/').filter(Boolean);
  const callParts = baseCall.split('/').filter(Boolean);
  if (routeParts.length !== callParts.length) return false;
  return routeParts.every((part, i) => part.startsWith(':') || part === callParts[i] || callParts[i] === '[param]');
}

function apiSignals(file) {
  const fileRel = rel(file);
  const text = read(file);
  const methods = ['GET', 'POST', 'PATCH', 'PUT', 'DELETE'].filter((method) => new RegExp(`export\\s+async\\s+function\\s+${method}\\b`).test(text));
  const hasAuth = /require(Admin|Actor|SuperAdmin)Api|requireAdmin\(|requireActor\(|requirePermission\(|requireWebhookSecret\(|CRON_SECRET|NANOFIX_SYSTEM_WORKER_TOKEN|x-system-worker-token/.test(text);
  const hasAudit = /writeAuditLog\s*\(|auditLog\s*\(|\.from\(["']audit_logs["']\)\.insert|_tx['"]|_tx\b|record_.*_snapshot|reconcile_.*_webhook|ingest_.*_tx/.test(text);
  const hasDb = /create(Admin)?Client\(|createSupabaseAdminClient\(|createClient\(|\.from\(|\.rpc\(|supabaseRequest\(|insertIfConfigured\(|listIfConfigured\(/.test(text);
  const hasRead = /\.select\(|\.rpc\(|listIfConfigured\(|method:\s*['"]GET['"]/.test(text) || methods.includes('GET');
  const hasWrite = /\.insert\(|\.update\(|\.delete\(|\.upsert\(|\.rpc\(|insertIfConfigured\(|method:\s*['"]POST['"]|method:\s*['"]PATCH['"]|method:\s*['"]PUT['"]|method:\s*['"]DELETE['"]/.test(text) || methods.some((m) => m !== 'GET');
  const selectStar = /\.select\(\s*['"]\*['"]\s*\)/.test(text);
  return { file: fileRel, route: normalizeApiRoute(fileRel), methods, hasAuth, hasAudit, hasDb, hasRead, hasWrite, selectStar };
}

function pageAndComponentSignals(files) {
  const text = files.map((file) => read(file)).join('\n');
  return {
    buttons: count(/<button\b/g, text),
    forms: count(/<form\b/g, text),
    inputs: count(/<input\b|<textarea\b|<select\b/g, text),
    links: count(/<Link\b|<a\b/g, text),
    onClick: count(/onClick\s*=/g, text),
    onSubmit: count(/onSubmit\s*=/g, text),
    useEffect: count(/useEffect\s*\(/g, text),
    apiCalls: unique(files.flatMap((file) => extractApiCalls(read(file)))),
    hashLinks: files.flatMap((file) => lineHits(read(file), /href=['"]#['"]|href=\{['"]#['"]\}/g, 10).map((hit) => ({ file: rel(file), ...hit }))),
    disabledButtons: files.flatMap((file) => lineHits(read(file), /<button[^>]*(disabled|aria-disabled)/g, 10).map((hit) => ({ file: rel(file), ...hit }))),
    staticRiskHits: files.flatMap((file) => lineHits(read(file), /mock|demo|sample|placeholder|coming soon|TODO|FIXME|TBD|fake success|localStorage/gi, 12).map((hit) => ({ file: rel(file), ...hit }))),
    staticArrays: count(/const\s+[A-Za-z0-9_]+\s*=\s*\[/g, text)
  };
}

function relatedApiRoutes(module, apiRoutes, apiCalls) {
  const byCall = apiRoutes.filter((api) => apiCalls.some((call) => routeMatchesCall(api.route, call)));
  const byKeyword = apiRoutes.filter((api) => module.keywords.some((kw) => api.file.toLowerCase().includes(kw.toLowerCase())));
  return unique([...byCall, ...byKeyword].map((api) => api.file)).map((file) => apiRoutes.find((api) => api.file === file)).filter(Boolean);
}

function moduleIssues(module, pageExists, signals, apis) {
  const issues = [];
  const hasWriteApi = apis.some((api) => api.hasWrite);
  const hasReadApi = apis.some((api) => api.hasRead || api.methods.includes('GET'));
  const hasMutationUi = signals.forms > 0 || signals.onSubmit > 0 || signals.onClick > 0 || signals.buttons > 0;

  if (!pageExists) issues.push({ severity: 'P0', code: 'missing_module_page', detail: `${module.page} is missing.` });
  if (pageExists && !apis.length) issues.push({ severity: 'P0', code: 'no_related_api_routes', detail: 'Module has no detected related API route or API call.' });
  if (pageExists && hasMutationUi && !hasWriteApi) issues.push({ severity: 'P1', code: 'ui_actions_without_write_api', detail: 'Buttons/forms detected but no related write API found.' });
  if (pageExists && !hasReadApi) issues.push({ severity: 'P1', code: 'no_read_data_api', detail: 'No related read API detected for real data loading.' });
  if (signals.apiCalls.length === 0 && (signals.buttons > 0 || signals.forms > 0)) issues.push({ severity: 'P1', code: 'page_or_components_have_no_fetch_calls', detail: 'UI exists but no direct fetch(/api/...) call found in page/components.' });
  if (signals.hashLinks.length) issues.push({ severity: 'P1', code: 'hash_links_or_fake_links', detail: `${signals.hashLinks.length} empty # link(s) detected.` });
  if (signals.staticRiskHits.length) issues.push({ severity: 'P1', code: 'static_demo_placeholder_markers', detail: `${signals.staticRiskHits.length} static/demo/placeholder markers detected.` });

  for (const api of apis) {
    if (api.hasWrite && !api.hasAudit) issues.push({ severity: 'P0', code: 'write_api_without_audit', detail: api.file });
    if (api.hasWrite && !api.hasAuth && !api.file.includes('/public/') && !api.file.includes('/webhooks/')) issues.push({ severity: 'P0', code: 'write_api_without_auth', detail: api.file });
    if (api.selectStar) issues.push({ severity: 'P1', code: 'select_star_in_related_api', detail: api.file });
    if ((api.hasRead || api.hasWrite) && !api.hasDb) issues.push({ severity: 'P1', code: 'api_without_db_signal', detail: api.file });
  }

  return issues;
}

function severityCounts(issues) {
  return issues.reduce((acc, issue) => {
    acc[issue.severity] = (acc[issue.severity] || 0) + 1;
    return acc;
  }, {});
}

function scoreModule(issues, signals, apis, pageExists) {
  let score = 100;
  for (const issue of issues) {
    if (issue.severity === 'P0') score -= 25;
    if (issue.severity === 'P1') score -= 10;
    if (issue.severity === 'P2') score -= 4;
  }
  if (pageExists) score += 5;
  if (signals.forms || signals.buttons) score += 5;
  if (signals.apiCalls.length) score += 5;
  if (apis.some((api) => api.hasRead)) score += 5;
  if (apis.some((api) => api.hasWrite && api.hasAudit)) score += 5;
  return Math.max(0, Math.min(100, score));
}

function riskFromScore(score, issues) {
  if (issues.some((issue) => issue.severity === 'P0')) return 'HIGH';
  if (score < 75 || issues.some((issue) => issue.severity === 'P1')) return 'MEDIUM';
  return 'LOW';
}

function markdown(report) {
  const lines = [];
  lines.push('# V28 Admin 0-8 Reality Deep Audit');
  lines.push('');
  lines.push(`Generated: ${report.generated_at}`);
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(`- Modules scanned: ${report.summary.modules_scanned}`);
  lines.push(`- Total issues: ${report.summary.total_issues}`);
  lines.push(`- P0 issues: ${report.summary.issue_counts.P0 || 0}`);
  lines.push(`- P1 issues: ${report.summary.issue_counts.P1 || 0}`);
  lines.push(`- P2 issues: ${report.summary.issue_counts.P2 || 0}`);
  lines.push(`- High risk modules: ${report.summary.high_risk_modules.join(', ') || 'None'}`);
  lines.push('');
  lines.push('## Module Reality Table');
  lines.push('');
  lines.push('| # | Module | Page | Components | API Calls | Related APIs | Buttons | Forms | Score | Risk |');
  lines.push('|---:|---|---|---:|---:|---:|---:|---:|---:|---|');
  for (const item of report.modules) {
    lines.push(`| ${item.index} | ${item.title} | ${item.page_exists ? 'yes' : 'missing'} | ${item.component_files.length} | ${item.signals.apiCalls.length} | ${item.related_apis.length} | ${item.signals.buttons} | ${item.signals.forms} | ${item.score} | ${item.risk} |`);
  }
  lines.push('');
  lines.push('## P0 Issues');
  lines.push('');
  const p0 = report.modules.flatMap((item) => item.issues.filter((issue) => issue.severity === 'P0').map((issue) => ({ module: item.title, ...issue })));
  if (!p0.length) lines.push('No P0 issues detected.');
  for (const issue of p0) lines.push(`- **${issue.code}** / ${issue.module}: ${issue.detail}`);
  lines.push('');
  lines.push('## P1 Issues');
  lines.push('');
  const p1 = report.modules.flatMap((item) => item.issues.filter((issue) => issue.severity === 'P1').map((issue) => ({ module: item.title, ...issue })));
  if (!p1.length) lines.push('No P1 issues detected.');
  for (const issue of p1.slice(0, 120)) lines.push(`- **${issue.code}** / ${issue.module}: ${issue.detail}`);
  lines.push('');
  lines.push('## Module Details');
  for (const item of report.modules) {
    lines.push('');
    lines.push(`### ${item.index}. ${item.title}`);
    lines.push('');
    lines.push(`- Page: ${item.page}`);
    lines.push(`- Component files: ${item.component_files.join(', ') || 'None detected'}`);
    lines.push(`- API calls: ${item.signals.apiCalls.join(', ') || 'None detected'}`);
    lines.push(`- Related APIs: ${item.related_apis.map((api) => api.file).join(', ') || 'None detected'}`);
    lines.push(`- Score/Risk: ${item.score} / ${item.risk}`);
    if (item.issues.length) {
      lines.push('- Issues:');
      for (const issue of item.issues) lines.push(`  - ${issue.severity} ${issue.code}: ${issue.detail}`);
    } else {
      lines.push('- Issues: none');
    }
  }
  return `${lines.join('\n')}\n`;
}

fs.mkdirSync(reportsDir, { recursive: true });
const allFiles = walk(root);
const apiRoutes = allFiles.filter((file) => rel(file).startsWith('app/api/') && /\/route\.(ts|js)$/.test(rel(file))).map(apiSignals);
const results = [];

for (const module of modules) {
  const pageFile = path.join(root, module.page);
  const pageExists = fs.existsSync(pageFile);
  const pageText = pageExists ? read(pageFile) : '';
  const importNames = extractComponentImports(pageText);
  const componentFiles = findComponentFiles(allFiles, importNames, module.keywords);
  const scannedFiles = pageExists ? [pageFile, ...componentFiles] : [...componentFiles];
  const signals = pageAndComponentSignals(scannedFiles);
  const relatedApis = relatedApiRoutes(module, apiRoutes, signals.apiCalls);
  const issues = moduleIssues(module, pageExists, signals, relatedApis);
  const score = scoreModule(issues, signals, relatedApis, pageExists);
  results.push({
    index: module.index,
    key: module.key,
    title: module.title,
    route: module.route,
    page: module.page,
    page_exists: pageExists,
    component_files: componentFiles.map(rel),
    signals,
    related_apis: relatedApis,
    issues,
    issue_counts: severityCounts(issues),
    score,
    risk: riskFromScore(score, issues)
  });
}

const allIssues = results.flatMap((item) => item.issues);
const report = {
  generated_at: new Date().toISOString(),
  summary: {
    modules_scanned: results.length,
    total_issues: allIssues.length,
    issue_counts: severityCounts(allIssues),
    high_risk_modules: results.filter((item) => item.risk === 'HIGH').map((item) => item.key),
    medium_risk_modules: results.filter((item) => item.risk === 'MEDIUM').map((item) => item.key),
    average_score: Math.round(results.reduce((sum, item) => sum + item.score, 0) / results.length)
  },
  modules: results
};

fs.writeFileSync(path.join(reportsDir, 'v28-admin-0-8-reality-deep-audit.json'), JSON.stringify(report, null, 2));
fs.writeFileSync(path.join(reportsDir, 'v28-admin-0-8-reality-deep-audit.md'), markdown(report));

console.log('V28 Admin 0-8 reality deep audit completed.');
console.log('Report JSON: reports/v28-admin-0-8-reality-deep-audit.json');
console.log('Report MD:   reports/v28-admin-0-8-reality-deep-audit.md');
console.log(`Average score: ${report.summary.average_score}`);
console.log(`Total issues: ${report.summary.total_issues}`);
console.log(`P0 issues: ${report.summary.issue_counts.P0 || 0}`);
console.log(`P1 issues: ${report.summary.issue_counts.P1 || 0}`);
console.log(`High risk modules: ${report.summary.high_risk_modules.join(', ') || 'None'}`);
