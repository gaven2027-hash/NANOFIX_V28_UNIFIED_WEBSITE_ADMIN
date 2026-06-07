import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const reportFile = 'V28_5_REAL_MODULE_LINKAGE_AUDIT_REPORT.json';
const reportPath = path.join(root, reportFile);
const textExt = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.json', '.sql', '.md', '.css', '.html', '.yml', '.yaml']);
const skipDirs = new Set(['.git', '.next', 'node_modules', '.vercel', 'out', 'dist', 'coverage', '.turbo']);
const generatedReportPattern = /^V28_.*_REPORT(?:\.[^.]+)?\.json$/;

const exists = (p) => fs.existsSync(path.join(root, p));
const isDir = (p) => {
  try { return fs.statSync(path.join(root, p)).isDirectory(); } catch { return false; }
};
const read = (p) => {
  try { return fs.readFileSync(path.join(root, p), 'utf8'); } catch { return ''; }
};

function shouldSkipFile(relative) {
  return relative === reportFile || generatedReportPattern.test(relative);
}

function walk(dir = root, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (skipDirs.has(entry.name)) continue;
    const absolute = path.join(dir, entry.name);
    const relative = path.relative(root, absolute).replace(/\\/g, '/');
    if (entry.isDirectory()) walk(absolute, out);
    if (entry.isFile() && textExt.has(path.extname(entry.name)) && !shouldSkipFile(relative)) out.push(relative);
  }
  return out;
}

const allFiles = walk();
const cache = new Map();
const body = (file) => {
  if (!cache.has(file)) cache.set(file, read(file));
  return cache.get(file);
};
const under = (prefixes) => {
  const found = new Set();
  for (const raw of prefixes) {
    const p = raw.replace(/\\/g, '/').replace(/\/$/, '');
    for (const file of allFiles) if (file === p || file.startsWith(`${p}/`)) found.add(file);
  }
  return [...found].sort();
};
const routeLikeExists = (p) => exists(p) || isDir(p) || exists(`${p}/page.tsx`) || exists(`${p}/page.ts`) || exists(`${p}/route.ts`);
const anyPath = (paths) => paths.some(routeLikeExists);
const termFiles = (terms, files = allFiles) => files.filter((file) => terms.some((term) => `${file}\n${body(file)}`.toLowerCase().includes(term.toLowerCase())));
const hasAny = (files, terms) => termFiles(terms, files).length > 0;
const foundTerms = (files, terms) => terms.filter((term) => hasAny(files, [term])).sort();

const supabaseTerms = ['createClient', 'createServerClient', 'supabase', '.from(', '.rpc(', 'service_role', 'NEXT_PUBLIC_SUPABASE_URL'];
const authTerms = ['requireAdmin', 'requireActor', 'requireRole', 'getActor', 'auth.getUser', 'getUser', 'requireCustomer', 'customer_id'];
const auditTerms = ['audit_logs', 'writeAuditLog', 'audit log', 'status_transition_logs', 'logStatusTransition', 'actor_id', 'actor_role'];
const placeholderTerms = ['placeholder', 'coming soon', 'demo', 'mock', 'fake success', 'fake_success', 'sample data', 'dummy', 'todo:', 'not implemented', 'localStorage', 'sessionStorage'];
const forgeableHeaderTerms = ['x-admin-role', 'x-nanofix-role'];

const modules = [
  ['public_website', 'Public Website', ['app/page.tsx', 'app/(public)', 'app/leak-detection', 'app/no-hacking-repair', 'app/waterproofing-works', 'app/track-record-warranty', 'app/get-a-free-quote'], ['app/api/public', 'app/api/repair-request', 'app/api/submit-request', 'app/api/website'], ['lead_id', 'service_request_id', 'customer_id']],
  ['admin_backend', 'Admin Backend', ['app/admin', 'app/(admin)', 'components/admin', 'app/dashboard'], ['app/api/admin', 'app/api/dashboard', 'app/api/system'], ['customer_id', 'lead_id', 'service_request_id', 'job_id']],
  ['customer_portal', 'Customer Portal', ['app/customer-portal', 'components/CustomerPortalActivityTimeline.tsx', 'components/customer-portal'], ['app/api/customer-portal'], ['customer_id', 'service_request_id', 'quotation_id', 'invoice_id', 'payment_id', 'warranty_id']],
  ['service_order_operations', 'Service & Order Operations', ['app/admin/service-operations', 'app/admin/service-order-operations', 'app/service-operations', 'components/service-operations'], ['app/api/service-operations', 'app/api/service-requests', 'app/api/jobs', 'app/api/quotations', 'app/api/invoices'], ['service_request_id', 'job_id', 'quotation_id', 'invoice_id', 'customer_id']],
  ['website_cms', 'Website CMS', ['app/admin/website-management', 'app/website-management', 'components/website-management', 'components/WebsiteCMS'], ['app/api/website-cms', 'app/api/website-management', 'app/api/cms'], ['content_id', 'page_id', 'section_id']],
  ['social_media_management', 'Social Media Management', ['app/admin/social-media', 'app/social-media', 'components/social-media'], ['app/api/social-media', 'app/api/social', 'app/api/google-business-profile'], ['customer_id', 'lead_id', 'content_id', 'post_id']],
  ['advertising_center', 'Advertising Center', ['app/admin/advertising-center', 'app/advertising-center', 'components/advertising'], ['app/api/advertising', 'app/api/ad-center', 'app/api/campaigns'], ['campaign_id', 'lead_id', 'customer_id']],
  ['ai_intelligence_center', 'AI Intelligence Center', ['app/admin/ai-intelligence-center', 'app/ai-intelligence-center', 'components/ai'], ['app/api/ai', 'app/api/ai-intelligence', 'app/api/global-web-search'], ['lead_id', 'customer_id', 'service_request_id', 'content_id', 'ai_log_id']],
  ['backup_download_center', 'Backup & Download Center', ['app/admin/settings/backup', 'app/admin/backup', 'app/backup-download-center', 'components/backup'], ['app/api/backups', 'app/api/backup', 'app/api/download-center'], ['backup_id', 'module_key', 'actor_id']],
  ['system_settings', 'System Settings', ['app/admin/settings', 'app/settings', 'components/settings'], ['app/api/settings', 'app/api/system/settings', 'app/api/admin/settings'], ['setting_key', 'actor_id']],
  ['payment_pdf_warranty', 'Payment / PDF / Warranty', ['app/admin/payments', 'app/admin/warranty', 'app/customer-portal/warranty', 'components/warranty'], ['app/api/payments', 'app/api/payment', 'app/api/invoice-pdf', 'app/api/quotation-pdf', 'app/api/warranty'], ['customer_id', 'invoice_id', 'payment_id', 'quotation_id', 'warranty_id']]
];

const add = (arr, priority, code, message, extra = {}) => arr.push({ priority, code, message, ...extra });

function auditModule([key, name, workspacePaths, apiPaths, linkageKeys]) {
  const workspaceFiles = under(workspacePaths);
  const apiFiles = under(apiPaths);
  const namedFiles = termFiles([key.replaceAll('_', '-'), key.replaceAll('_', ' ')]).slice(0, 60);
  const files = [...new Set([...workspaceFiles, ...apiFiles, ...namedFiles])].sort();
  const findings = [];
  const hasWorkspace = anyPath(workspacePaths) || workspaceFiles.length > 0;
  const hasApi = anyPath(apiPaths) || apiFiles.some((file) => file.endsWith('/route.ts'));
  const hasSupabase = hasAny(files, supabaseTerms);
  const hasAuth = hasAny(files, authTerms);
  const hasAudit = hasAny(files, auditTerms);
  const placeholders = foundTerms(files, placeholderTerms);
  const linkageFound = foundTerms(files, linkageKeys);
  const linkageMissing = linkageKeys.filter((keyName) => !linkageFound.includes(keyName));

  if (!hasWorkspace) add(findings, 'P0', 'MISSING_WORKSPACE_ROUTE', `${name} has no detectable real workspace route/component.`);
  if (!hasApi) add(findings, 'P0', 'MISSING_REAL_API_ROUTE', `${name} has no detectable API route.`);
  if (hasApi && !hasAuth) add(findings, 'P0', 'MISSING_AUTH_BOUNDARY', `${name} API/workspace has no detectable auth or actor boundary.`);
  if (placeholders.length) add(findings, 'P1', 'PLACEHOLDER_DEMO_OR_BROWSER_STORAGE_RISK', `${name} contains placeholder/demo/fake/localStorage indicators: ${placeholders.join(', ')}.`, { files: termFiles(placeholderTerms, files).slice(0, 12) });
  if (hasApi && !hasSupabase) add(findings, 'P2', 'API_WITHOUT_SUPABASE_READ_WRITE', `${name} has API files but no detectable Supabase read/write pattern.`);
  if ((hasApi || hasSupabase) && !hasAudit) add(findings, 'P3', 'MISSING_AUDIT_OR_STATUS_LOG', `${name} has API/data access but no detectable audit log or status transition log.`);
  if (linkageMissing.length) add(findings, 'P4', 'MISSING_MODULE_LINKAGE_KEYS', `${name} is missing detectable linkage keys: ${linkageMissing.join(', ')}.`, { found_linkage_keys: linkageFound });

  return {
    key,
    name,
    route_or_workspace_detected: hasWorkspace,
    api_detected: hasApi,
    supabase_detected: hasSupabase,
    auth_boundary_detected: hasAuth,
    audit_or_status_log_detected: hasAudit,
    required_linkage_keys: linkageKeys,
    found_linkage_keys: linkageFound,
    missing_linkage_keys: linkageMissing,
    scanned_files_count: files.length,
    sample_files: files.slice(0, 25),
    findings
  };
}

function auditMainChain() {
  const files = under(['app/api/service-operations', 'app/api/service-requests', 'app/api/jobs', 'app/api/quotations', 'app/api/invoices', 'app/api/payments', 'app/api/warranty', 'app/admin/service-operations', 'components/service-operations']);
  const required = ['service_request_id', 'job_id', 'quotation_id', 'invoice_id', 'payment_id', 'warranty_id', 'customer_id'];
  const found = foundTerms(files, required);
  const missing = required.filter((term) => !found.includes(term));
  const findings = [];
  if (!files.length) add(findings, 'P0', 'MAIN_CHAIN_FILES_MISSING', 'Service Operations request → job → quotation → invoice → payment → warranty files were not detected.');
  if (missing.length) add(findings, 'P4', 'MAIN_CHAIN_LINKAGE_INCOMPLETE', `Main service chain missing linkage keys: ${missing.join(', ')}.`, { found_linkage_keys: found });
  if (!hasAny(files, ['status_transition_logs', 'logStatusTransition'])) add(findings, 'P3', 'MAIN_CHAIN_STATUS_LOG_MISSING', 'Main service chain has no detectable status transition log integration.');
  return { key: 'request_job_quotation_invoice_payment_warranty', name: 'Service Operations Main Chain', scanned_files_count: files.length, required_linkage_keys: required, found_linkage_keys: found, missing_linkage_keys: missing, findings };
}

function auditCustomerIsolation() {
  const files = under(['app/api/customer-portal', 'app/customer-portal', 'components/customer-portal', 'components/CustomerPortalActivityTimeline.tsx']);
  const findings = [];
  if (!files.length) add(findings, 'P0', 'CUSTOMER_PORTAL_FILES_MISSING', 'Customer Portal files are missing.');
  if (!hasAny(files, ['customer_id'])) add(findings, 'P0', 'CUSTOMER_SCOPE_MISSING', 'Customer Portal has no detectable customer_id scoping.');
  if (hasAny(files, ['select("*")', "select('*')"])) add(findings, 'P1', 'CUSTOMER_PORTAL_WILDCARD_SELECT', 'Customer Portal contains wildcard select; verify customer cannot read unrelated records.', { files: termFiles(['select("*")', "select('*')"], files).slice(0, 12) });
  if (hasAny(files, forgeableHeaderTerms)) add(findings, 'P0', 'CUSTOMER_PORTAL_FORGEABLE_HEADER_RISK', 'Customer Portal contains forgeable role header indicators.', { files: termFiles(forgeableHeaderTerms, files).slice(0, 12) });
  return { key: 'customer_portal_isolation', name: 'Customer Portal Own-Record Isolation', scanned_files_count: files.length, findings };
}

function auditSecurityCore() {
  const files = termFiles(['requireAdmin', 'requireActor', 'requireRole', 'RLS', 'audit_logs', 'status_transition_logs', ...forgeableHeaderTerms]);
  const findings = [];
  if (!hasAny(files, ['requireAdmin', 'requireActor', 'requireRole'])) add(findings, 'P0', 'RBAC_HELPERS_NOT_DETECTED', 'No central RBAC helper was detected.');
  if (!hasAny(allFiles, ['audit_logs'])) add(findings, 'P0', 'AUDIT_LOGS_NOT_DETECTED', 'audit_logs integration was not detected anywhere in the repository.');
  const headerFiles = termFiles(forgeableHeaderTerms);
  if (headerFiles.length) add(findings, 'P0', 'FORGEABLE_ROLE_HEADER_DETECTED', 'Potential forgeable admin role headers detected. Verify these are not trusted as auth source.', { files: headerFiles.slice(0, 25) });
  return { key: 'rbac_rls_audit_layer', name: 'RBAC / RLS / Audit Layer', scanned_files_count: files.length, findings };
}

const productionSchemaSelectRules = [
  { table: 'customers', forbidden: ['source'], safe: 'Use created_source for public/customer origin metadata.' },
  { table: 'quotations', forbidden: ['job_id', 'current_version', 'total', 'approval_status', 'visible_to_customer', 'public_ref'], safe: 'Use service_request_id/customer_id, version, total_amount, and status.' },
  { table: 'invoices', forbidden: ['total', 'payment_url', 'public_ref', 'updated_at'], safe: 'Use total_amount; payment links/public refs are not columns on invoices in production.' },
  { table: 'payments', forbidden: ['fee', 'visible_to_customer', 'payment_url', 'updated_at'], safe: 'Use payment_id, invoice_id, customer_id, amount, currency, status, reconciled_at, created_at.' },
  { table: 'warranties', forbidden: ['starts_at', 'ends_at', 'updated_at'], safe: 'Use starts_on and ends_on for warranty dates.' }
];

function normalizeSelectedColumn(raw) {
  return raw
    .trim()
    .split(/\s+/)[0]
    .replace(/^['"`]+|['"`]+$/g, '')
    .replace(/!inner$/g, '')
    .replace(/\(.*$/g, '');
}

function findSelectColumnsForTable(fileText, table) {
  const regex = new RegExp(`\\.from\\(\\s*['"\`]${table}['"\`]\\s*\\)[\\s\\S]{0,600}?\\.select\\(\\s*(['"\`])([\\s\\S]*?)\\1\\s*\\)`, 'g');
  const selections = [];
  for (const match of fileText.matchAll(regex)) {
    const selectText = match[2] ?? '';
    const columns = selectText.split(',').map(normalizeSelectedColumn).filter(Boolean);
    selections.push({ columns, selectText: selectText.replace(/\s+/g, ' ').trim() });
  }
  return selections;
}

function auditProductionSchemaCompatibility() {
  const findings = [];
  const affectedFiles = [];

  for (const file of allFiles) {
    const fileText = body(file);
    if (!fileText.includes('.from(') || !fileText.includes('.select(')) continue;

    for (const rule of productionSchemaSelectRules) {
      const selections = findSelectColumnsForTable(fileText, rule.table);
      for (const selection of selections) {
        const forbiddenFound = rule.forbidden.filter((name) => selection.columns.includes(name));
        if (!forbiddenFound.length) continue;
        affectedFiles.push(file);
        add(
          findings,
          'P2',
          'PRODUCTION_SCHEMA_MISMATCH_SELECT',
          `${file} selects invalid production columns from ${rule.table}: ${forbiddenFound.join(', ')}. ${rule.safe}`,
          { file, table: rule.table, forbidden_columns: forbiddenFound, select: selection.selectText }
        );
      }
    }
  }

  return {
    key: 'production_schema_compatibility',
    name: 'Production Schema Compatibility Guard',
    scanned_files_count: allFiles.length,
    affected_files: [...new Set(affectedFiles)].sort(),
    rules: productionSchemaSelectRules,
    findings
  };
}

const moduleReports = modules.map(auditModule);
const crossModuleChecks = [auditMainChain(), auditCustomerIsolation(), auditSecurityCore(), auditProductionSchemaCompatibility()];
const findings = [...moduleReports, ...crossModuleChecks].flatMap((module) => module.findings.map((finding) => ({ module_key: module.key, module_name: module.name, ...finding })));
const order = { P0: 0, P1: 1, P2: 2, P3: 3, P4: 4 };
findings.sort((a, b) => order[a.priority] - order[b.priority] || a.module_key.localeCompare(b.module_key) || a.code.localeCompare(b.code));
const counts = Object.fromEntries(['P0', 'P1', 'P2', 'P3', 'P4'].map((p) => [p, findings.filter((f) => f.priority === p).length]));
const blocking = findings.filter((f) => ['P0', 'P1', 'P2'].includes(f.priority));
const report = {
  ok: blocking.length === 0,
  verifier: 'verify-v28-5-real-module-linkage-batch-audit',
  generated_at: new Date().toISOString(),
  production_baseline: {
    locked_tag: 'v28.4.9.2-production-live-20260606',
    expected_main_commit: '2dfe6388862fb7d60ef08d1577143f50504073b4',
    production_domain: 'https://app.nanofixsg.com'
  },
  audit_scope: {
    goal: 'V28.5 full-system real module linkage batch audit',
    mode: 'read-only repository scan; no Supabase production connection; no database mutation',
    priority_rules: {
      P0: 'missing route/API/auth boundary',
      P1: 'placeholder/demo/fake success/browser storage/local state risk',
      P2: 'API exists but no detectable Supabase read/write or code selects columns that do not exist in production schema',
      P3: 'read/write exists but no audit/status log detected',
      P4: 'module linkage keys missing'
    }
  },
  scanned_files_count: allFiles.length,
  counts_by_priority: counts,
  blocking_findings_count: blocking.length,
  modules: moduleReports,
  cross_module_checks: crossModuleChecks,
  findings
};
fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify({ ok: report.ok, verifier: report.verifier, report: reportFile, scanned_files_count: report.scanned_files_count, counts_by_priority: counts, blocking_findings_count: blocking.length }, null, 2));
if (!report.ok) process.exit(1);
