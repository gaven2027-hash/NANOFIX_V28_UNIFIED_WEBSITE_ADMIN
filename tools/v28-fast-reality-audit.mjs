#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const reportsDir = path.join(root, 'reports');
const skipDirs = new Set(['.git', '.next', 'node_modules', 'reports', 'out', 'dist']);
const scanExt = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs']);

const menu = [
  { index: 0, key: 'admin-home', title: 'Admin Home', route: '/admin', page: 'app/admin/page.tsx' },
  { index: 1, key: 'dashboard', title: 'Dashboard', route: '/dashboard', page: 'app/dashboard/page.tsx' },
  { index: 2, key: 'service-operations', title: 'Service Operations', route: '/service-operations', page: 'app/service-operations/page.tsx' },
  { index: 3, key: 'website-management', title: 'Website Management', route: '/website-management', page: 'app/website-management/page.tsx' },
  { index: 4, key: 'social-media', title: 'Social Media', route: '/social-media', page: 'app/social-media/page.tsx' },
  { index: 5, key: 'advertising', title: 'Advertising', route: '/advertising', page: 'app/advertising/page.tsx' },
  { index: 6, key: 'ai-intelligence', title: 'AI Intelligence', route: '/ai-intelligence', page: 'app/ai-intelligence/page.tsx' },
  { index: 7, key: 'customer-center', title: 'Customer Center', route: '/customer-center', page: 'app/customer-center/page.tsx' },
  { index: 8, key: 'system-settings', title: 'System Settings', route: '/system-settings', page: 'app/system-settings/page.tsx' }
];

const publicReadAllowlist = [
  /^app\/api\/health\/route\.ts$/,
  /^app\/api\/health\/\[module\]\/route\.ts$/,
  /^app\/api\/ready\/route\.ts$/,
  /^app\/api\/system\/health\/route\.ts$/,
  /^app\/api\/system\/modules\/route\.ts$/,
  /^app\/api\/cms\/blocks\/route\.ts$/
];

const webhookRoute = /^app\/api\/webhooks\//;

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (skipDirs.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (scanExt.has(path.extname(entry.name))) out.push(full);
  }
  return out;
}

function rel(file) {
  return path.relative(root, file).replaceAll('\\', '/');
}

function read(file) {
  try { return fs.readFileSync(file, 'utf8'); } catch { return ''; }
}

function count(pattern, text) {
  const match = text.match(pattern);
  return match ? match.length : 0;
}

function linesWith(text, regex, limit = 12) {
  return text.split(/\r?\n/).map((line, index) => ({ line: index + 1, text: line.trim() })).filter((item) => regex.test(item.text)).slice(0, limit);
}

function importedComponents(text) {
  const items = [];
  const regex = /import\s+\{?\s*([A-Za-z0-9_,\s]+)\s*\}?\s+from\s+['"]@?\/?(?:components|\.\.\/components|\.\/components)\/?([^'"]*)['"]/g;
  let match;
  while ((match = regex.exec(text))) {
    const names = match[1].split(',').map((name) => name.trim()).filter(Boolean);
    items.push(...names);
  }
  return [...new Set(items)].sort();
}

function pageSignals(file, text) {
  const buttons = count(/<button\b/g, text);
  const forms = count(/<form\b/g, text);
  const links = count(/<Link\b|<a\b/g, text);
  const fetches = count(/\bfetch\s*\(/g, text);
  const staticArrays = count(/const\s+[A-Za-z0-9_]+\s*=\s*\[/g, text);
  return { file: rel(file), buttons, forms, links, fetches, staticArrays, imports: importedComponents(text) };
}

function issueScan(files) {
  const checks = [
    { severity: 'P0', code: 'local_storage_business_state', regex: /\blocalStorage\b/g, why: 'Browser storage may create data divergence.' },
    { severity: 'P0', code: 'fake_success', regex: /fake success|fallback success|simulated success|pretend success/gi, why: 'Explicit fake/fallback success marker.' },
    { severity: 'P0', code: 'header_role_trust', regex: /x-admin-role|x-nanofix-role|x-user-role/gim, why: 'Client controlled role headers are risky.' },
    { severity: 'P1', code: 'hash_link', regex: /href=['"]#['"]/g, why: 'Empty hash link may be a fake button.' },
    { severity: 'P1', code: 'todo_marker', regex: /TODO|FIXME|TBD/g, why: 'Unfinished implementation marker.' },
    { severity: 'P1', code: 'mock_demo_sample', regex: /\bmock\b|\bdemo\b|\bsample\b|placeholder/gi, why: 'May indicate static or demo content.' },
    { severity: 'P1', code: 'test_seed_identity', regex: /workflow-test|test@nanofix|nanofix\.local|0000 0000/gi, why: 'Test identity should not create production records.' }
  ];
  const findings = [];
  for (const file of files) {
    const fileRel = rel(file);
    if (!fileRel.startsWith('app/') && !fileRel.startsWith('components/') && !fileRel.startsWith('lib/')) continue;
    const text = read(file);
    for (const check of checks) {
      const hits = linesWith(text, check.regex, 8);
      if (hits.length) findings.push({ file: fileRel, ...check, hits });
    }
  }
  return findings;
}

function isPublicReadAllowed(file, methods, hasWrite) {
  if (hasWrite) return false;
  if (methods.some((method) => method !== 'GET' && method !== 'HEAD')) return false;
  return publicReadAllowlist.some((pattern) => pattern.test(file));
}

function hasWebhookSignatureCheck(text) {
  return /stripe-signature|webhook-signature|x-hub-signature|x-signature|verifyWebhook|verifySignature|WEBHOOK_SECRET|webhookSecret|crypto\.createHmac|timingSafeEqual/i.test(text);
}

function apiCoverage(files) {
  return files.filter((file) => rel(file).startsWith('app/api/') && rel(file).endsWith('/route.ts')).map((file) => {
    const fileRel = rel(file);
    const text = read(file);
    const methods = ['GET', 'POST', 'PATCH', 'PUT', 'DELETE'].filter((method) => new RegExp(`export\\s+async\\s+function\\s+${method}\\b`).test(text));
    const writeMethods = methods.filter((method) => method !== 'GET');
    const hasAuth = /require(Admin|Actor|SuperAdmin)Api|requireAdmin\(|requireActor\(/.test(text);
    const hasAudit = /writeAuditLog\s*\(/.test(text);
    const hasSupabase = /createAdminClient\(|createClient\(|\.from\(|\.rpc\(/.test(text);
    const hasWrite = /\.insert\(|\.update\(|\.delete\(|\.upsert\(|\.rpc\(/.test(text) || writeMethods.length > 0;
    const selectStar = /\.select\(\s*['"]\*['"]\s*\)/.test(text);
    const rawRoleHeader = /x-admin-role|x-nanofix-role|x-user-role/i.test(text);
    const publicReadAllowed = isPublicReadAllowed(fileRel, methods, hasWrite);
    const isWebhook = webhookRoute.test(fileRel);
    const webhookSignature = isWebhook ? hasWebhookSignatureCheck(text) : false;
    const risks = [];
    const notes = [];
    if (publicReadAllowed) notes.push('public_read_allowlisted');
    if (isWebhook) notes.push(webhookSignature ? 'webhook_signature_detected' : 'webhook_signature_not_detected');
    if (!hasAuth && !publicReadAllowed && !isWebhook) risks.push('P0:no_auth_gate');
    if (isWebhook && !webhookSignature) risks.push('P0:webhook_without_signature_check');
    if (hasWrite && !hasAudit) risks.push('P0:write_without_audit_log');
    if (selectStar) risks.push('P1:select_star');
    if (rawRoleHeader) risks.push('P0:raw_role_header');
    if (hasSupabase && methods.length === 0) risks.push('P2:no_exported_http_method');
    return { file: fileRel, methods, hasAuth, hasAudit, hasSupabase, hasWrite, selectStar, rawRoleHeader, publicReadAllowed, isWebhook, webhookSignature, notes, risks };
  }).sort((a, b) => b.risks.length - a.risks.length || a.file.localeCompare(b.file));
}

function menuMap(files) {
  const apiFiles = files.filter((file) => rel(file).startsWith('app/api/') && rel(file).endsWith('/route.ts')).map(rel);
  return menu.map((item) => {
    const pagePath = path.join(root, item.page);
    const exists = fs.existsSync(pagePath);
    const text = exists ? read(pagePath) : '';
    const imports = exists ? importedComponents(text) : [];
    const keyWords = item.key.split('-').filter(Boolean);
    const relatedApis = apiFiles.filter((api) => keyWords.some((word) => api.toLowerCase().includes(word)) || api.toLowerCase().includes(item.key));
    const pageSignal = exists ? pageSignals(pagePath, text) : null;
    const score = (exists ? 25 : 0) + Math.min(imports.length, 20) + Math.min(relatedApis.length * 5, 30) + (text.includes('LiveCore') ? 15 : 0) + (text.includes('MenuAnchorSections') ? 10 : 0);
    const risk = score >= 70 ? 'LOW' : score >= 45 ? 'MEDIUM' : 'HIGH';
    return { ...item, exists, imports, relatedApis, pageSignal, score, risk };
  });
}

function bySeverity(findings) {
  return findings.reduce((acc, item) => {
    acc[item.severity] = (acc[item.severity] || 0) + 1;
    return acc;
  }, {});
}

function markdown(report) {
  const lines = [];
  lines.push('# V28 Fast Reality Audit');
  lines.push('');
  lines.push(`Generated: ${report.generated_at}`);
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(`- Files scanned: ${report.summary.files_scanned}`);
  lines.push(`- API routes scanned: ${report.summary.api_routes_scanned}`);
  lines.push(`- Public read allowlisted APIs: ${report.summary.public_read_allowlisted_api_routes}`);
  lines.push(`- P0 findings: ${report.summary.findings_by_severity.P0 || 0}`);
  lines.push(`- P1 findings: ${report.summary.findings_by_severity.P1 || 0}`);
  lines.push(`- P2 findings: ${report.summary.findings_by_severity.P2 || 0}`);
  lines.push(`- API routes with risks: ${report.summary.api_routes_with_risks}`);
  lines.push('');
  lines.push('## Admin 0-8 Reality Map');
  lines.push('');
  lines.push('| # | Module | Page | Components | APIs | Score | Risk |');
  lines.push('|---:|---|---|---:|---:|---:|---|');
  for (const item of report.admin_menu_reality_map) {
    lines.push(`| ${item.index} | ${item.title} | ${item.exists ? 'yes' : 'missing'} | ${item.imports.length} | ${item.relatedApis.length} | ${item.score} | ${item.risk} |`);
  }
  lines.push('');
  lines.push('## P0 Findings');
  lines.push('');
  const p0 = report.static_reality_findings.filter((item) => item.severity === 'P0');
  if (!p0.length) lines.push('No P0 static findings from fast scan.');
  for (const item of p0.slice(0, 80)) {
    lines.push(`- **${item.code}** in \`${item.file}\` (${item.hits.length} hits): ${item.why}`);
  }
  lines.push('');
  lines.push('## API Coverage Risks');
  lines.push('');
  const riskyApis = report.api_coverage.filter((item) => item.risks.length);
  if (!riskyApis.length) lines.push('No API coverage risks from fast scan.');
  for (const item of riskyApis.slice(0, 120)) {
    lines.push(`- \`${item.file}\`: ${item.risks.join(', ')}`);
  }
  lines.push('');
  lines.push('## Public Read Allowlist');
  lines.push('');
  const allowlisted = report.api_coverage.filter((item) => item.publicReadAllowed);
  if (!allowlisted.length) lines.push('No public read allowlisted APIs detected.');
  for (const item of allowlisted) {
    lines.push(`- \`${item.file}\``);
  }
  lines.push('');
  lines.push('## Next Action');
  lines.push('');
  lines.push('Start with P0 API risks that are not public read allowlisted, then P0 static findings, then HIGH/MEDIUM admin modules.');
  return `${lines.join('\n')}\n`;
}

fs.mkdirSync(reportsDir, { recursive: true });
const files = walk(root);
const staticFindings = issueScan(files);
const api = apiCoverage(files);
const map = menuMap(files);
const report = {
  generated_at: new Date().toISOString(),
  summary: {
    files_scanned: files.length,
    api_routes_scanned: api.length,
    public_read_allowlisted_api_routes: api.filter((item) => item.publicReadAllowed).length,
    findings_by_severity: bySeverity(staticFindings),
    api_routes_with_risks: api.filter((item) => item.risks.length).length,
    high_risk_admin_modules: map.filter((item) => item.risk === 'HIGH').map((item) => item.key)
  },
  admin_menu_reality_map: map,
  api_coverage: api,
  static_reality_findings: staticFindings
};

fs.writeFileSync(path.join(reportsDir, 'v28-fast-reality-audit.json'), JSON.stringify(report, null, 2));
fs.writeFileSync(path.join(reportsDir, 'v28-fast-reality-audit.md'), markdown(report));
console.log('V28 fast reality audit completed.');
console.log(`Report JSON: reports/v28-fast-reality-audit.json`);
console.log(`Report MD:   reports/v28-fast-reality-audit.md`);
console.log(`Public read allowlisted APIs: ${report.summary.public_read_allowlisted_api_routes}`);
console.log(`P0 findings: ${report.summary.findings_by_severity.P0 || 0}`);
console.log(`API routes with risks: ${report.summary.api_routes_with_risks}`);
