import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const jsonReportFile = 'V28_6_FULL_OA_ERP_REAL_MODULE_AUDIT_REPORT.json';
const mdReportFile = 'V28_6_FULL_OA_ERP_REAL_MODULE_AUDIT_REPORT.md';
const scanRoots = ['app', 'app/admin', 'app/api', 'components', 'lib', 'supabase/migrations', 'tools'];
const skipDirs = new Set(['.git', '.next', 'node_modules', '.vercel', 'out', 'dist', 'coverage', '.turbo']);
const textExt = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.json', '.sql', '.md', '.css', '.html', '.yml', '.yaml']);

function exists(p) { return fs.existsSync(path.join(root, p)); }
function isDir(p) { try { return fs.statSync(path.join(root, p)).isDirectory(); } catch { return false; } }
function read(p) { try { return fs.readFileSync(path.join(root, p), 'utf8'); } catch { return ''; } }
function skipFile(p) { return p === jsonReportFile || p === mdReportFile || /^V28_.*_REPORT.*\.(json|md)$/i.test(path.basename(p)); }
function walk(abs, out = []) {
  if (!fs.existsSync(abs)) return out;
  for (const e of fs.readdirSync(abs, { withFileTypes: true })) {
    if (skipDirs.has(e.name)) continue;
    const full = path.join(abs, e.name);
    const rel = path.relative(root, full).replace(/\\/g, '/');
    if (e.isDirectory()) walk(full, out);
    else if (e.isFile() && textExt.has(path.extname(e.name)) && !skipFile(rel)) out.push(rel);
  }
  return out;
}
const allFiles = [...new Set(scanRoots.flatMap((r) => walk(path.join(root, r))))].sort();
const cache = new Map();
function body(file) { if (!cache.has(file)) cache.set(file, read(file)); return cache.get(file); }
function route(p) { return exists(p) || isDir(p) || exists(`${p}/page.tsx`) || exists(`${p}/page.ts`) || exists(`${p}/route.ts`); }
function under(paths) {
  const set = new Set();
  for (const raw of paths) {
    const p = raw.replace(/\/$/, '');
    for (const f of allFiles) if (f === p || f.startsWith(`${p}/`)) set.add(f);
  }
  return [...set].sort();
}
function hits(terms, files = allFiles) {
  const t = terms.map((x) => x.toLowerCase());
  return files.filter((f) => {
    const h = `${f}\n${body(f)}`.toLowerCase();
    return t.some((term) => h.includes(term));
  });
}
function found(files, terms) { return terms.filter((term) => hits([term], files).length).sort(); }
function add(list, priority, code, message, extra = {}) { list.push({ priority, code, message, ...extra }); }
const weights = { P0: 18, P1: 12, P2: 8, P3: 6, P4: 4 };
function score(findings) { return Math.max(0, 100 - findings.reduce((s, f) => s + (weights[f.priority] || 0), 0)); }

const common = {
  read: ['.from(', '.select(', '.rpc(', 'supabase'],
  write: ['.insert(', '.update(', '.upsert(', '.delete(', '.upload('],
  rbac: ['requireAdmin', 'requireActor', 'requireRole', 'requireCustomer', 'auth.getUser', 'getUser', 'admin_profiles', 'profiles'],
  audit: ['audit_logs', 'writeAuditLog', 'actor_id', 'actor_role'],
  status: ['status_transition_logs', 'logStatusTransition', 'from_status', 'to_status'],
  static: ['placeholder', 'coming soon', 'demo', 'mock', 'fake success', 'localStorage', 'sessionStorage', 'not implemented'],
  unsafe: ['x-admin-role', 'x-nanofix-role', 'x-customer-id']
};

const modules = [
  ['P0_dashboard_analytics_alerts', 'Dashboard, Analytics & Alerts', ['app/admin/dashboard', 'app/dashboard', 'components/dashboard'], ['app/api/admin/dashboard', 'app/api/dashboard', 'app/api/analytics', 'app/api/alerts'], ['leads','jobs','quotations','invoices','payments','warranties','alerts','audit_logs'], ['customer_id','lead_id','service_request_id','job_id','quotation_id','invoice_id','payment_id','warranty_id'], ['filter','search','refresh','export','alert','status']],
  ['P1_service_order_operations', 'Service & Order Operations', ['app/admin/service-operations','app/admin/service-order-operations','components/service-operations'], ['app/api/admin/service-operations','app/api/service-operations','app/api/service-requests','app/api/jobs','app/api/quotations','app/api/invoices','app/api/payments','app/api/warranty'], ['unified_intake','leads','service_requests','jobs','inspections','quotations','invoices','payments','warranties','status_transition_logs','audit_logs'], ['customer_id','lead_id','service_request_id','job_id','quotation_id','invoice_id','payment_id','warranty_id'], ['create','update','approve','reject','accept','invoice','payment','warranty','status']],
  ['P2_website_management_cms', 'Website Management / CMS', ['app/admin/website-management','app/website-management','components/website-management','components/WebsiteCMS'], ['app/api/website-cms','app/api/website-management','app/api/cms','app/api/website'], ['website_pages','website_content_blocks','website_media','media_library','website_page_versions','seo','schema','faq','audit_logs'], ['page_id','content_block_id','media_id','version_id','published_by','actor_id'], ['draft','preview','publish','rollback','upload','replace','seo','schema']],
  ['P3_social_media_management', 'Social Media Management', ['app/admin/social-media','app/social-media','components/social-media'], ['app/api/social-media','app/api/social','app/api/google-business-profile','app/api/gbp'], ['social_accounts','social_assets','social_posts','social_drafts','social_schedules','ai_logs','audit_logs'], ['account_id','asset_id','post_id','draft_id','schedule_id','lead_id','customer_id'], ['upload','draft','approve','reject','schedule','publish','preview']],
  ['P4_ai_intelligence_center', 'AI Intelligence Center', ['app/admin/ai-intelligence-center','app/ai-intelligence-center','components/ai'], ['app/api/ai','app/api/ai-intelligence','app/api/global-web-search'], ['ai_settings','ai_logs','ai_alerts','ai_usage','ai_costs','material_ai_suggestions','audit_logs'], ['ai_log_id','lead_id','customer_id','service_request_id','content_id','actor_id'], ['generate','search','suggest','alert','log','cost']],
  ['P5_customer_center', 'Customer Center', ['app/admin/customer-center','app/admin/customers','components/customer-center','components/customers'], ['app/api/admin/customers','app/api/customer-center','app/api/customers','app/api/customer-record-links'], ['customers','profiles','customer_account_claims','customer_record_links','service_requests','quotations','invoices','payments','warranties','audit_logs'], ['customer_id','profile_id','auth_user_id','service_request_id','quotation_id','invoice_id','warranty_id'], ['search','bind','freeze','blacklist','reset','archive','audit']],
  ['P6_customer_portal', 'Customer Portal', ['app/customer-portal','components/customer-portal','components/CustomerPortalActivityTimeline.tsx'], ['app/api/customer-portal','app/api/customer-auth','app/api/quote-response'], ['customers','profiles','service_requests','quotations','invoices','payments','warranties','customer_documents','status_transition_logs','audit_logs'], ['customer_id','service_request_id','quotation_id','invoice_id','payment_id','warranty_id'], ['login','register','accept','reject','pay','download','upload','claim']],
  ['P7_settings_backup', 'Website & System Settings / Backup', ['app/admin/settings','app/admin/settings/backup','app/admin/backup','components/settings','components/backup'], ['app/api/settings','app/api/system/settings','app/api/admin/settings','app/api/backups','app/api/backup','app/api/download-center'], ['system_settings','module_settings','backup_jobs','backup_history','backup_downloads','audit_logs'], ['setting_key','module_key','backup_id','actor_id'], ['save','backup','restore','download','generate','rotate','audit']],
  ['P8_public_global_rbac_rls', 'Public Website / Global Search / RBAC / RLS Layer', ['app/page.tsx','app/(public)','app/get-a-free-quote','app/track-record-warranty','app/login','app/register','components/public','middleware.ts'], ['app/api/public','app/api/repair-request','app/api/submit-request','app/api/service-requests','app/api/search','app/api/global-search','app/api/auth'], ['unified_intake','leads','service_requests','customers','profiles','customer_record_links','audit_logs','status_transition_logs'], ['customer_id','lead_id','service_request_id','profile_id','auth_user_id'], ['submit','register','login','search','upload','track']]
];

function auditModule([key, name, workspaces, apis, tables, links, actions]) {
  const files = [...new Set([...under(workspaces), ...under(apis), ...hits(tables), ...hits(links)])].sort();
  const workspace = workspaces.some(route) || under(workspaces).length > 0;
  const api = apis.some(route) || under(apis).length > 0;
  const read = found(files, common.read).length > 0;
  const write = found(files, common.write).length > 0;
  const rbac = found(files, common.rbac).length > 0;
  const audit = found(files, common.audit).length > 0;
  const status = found(files, common.status).length > 0;
  const staticHits = found(files, common.static);
  const unsafeHits = found(files, common.unsafe);
  const detectedTables = found(files, tables);
  const detectedLinks = found(files, links);
  const detectedActions = found(files, actions);
  const findings = [];
  if (!workspace) add(findings, 'P0', 'MISSING_WORKSPACE_ROUTE', `${name} has no detectable real workspace route/component.`);
  if (!api) add(findings, 'P0', 'MISSING_API_ROUTE', `${name} has no detectable API route.`);
  if (api && !rbac) add(findings, 'P0', 'MISSING_RBAC_BOUNDARY', `${name} has API/workspace files but no detectable actor/customer/admin boundary.`);
  if (unsafeHits.length) add(findings, 'P0', 'FORGEABLE_HEADER_RISK', `${name} contains potentially forgeable header indicators: ${unsafeHits.join(', ')}.`);
  if (staticHits.length) add(findings, 'P1', 'PLACEHOLDER_DEMO_OR_BROWSER_STORAGE_RISK', `${name} contains static/demo/mock/browser-state indicators: ${staticHits.join(', ')}.`);
  if (api && !read && !write) add(findings, 'P2', 'API_WITHOUT_SUPABASE_READ_WRITE', `${name} has API files but no detectable Supabase read/write pattern.`);
  if (read && !write && actions.some((a) => ['create','update','publish','upload','approve','reject','pay','backup','restore','submit','register'].includes(a))) add(findings, 'P2', 'READ_ONLY_WHERE_WRITE_REQUIRED', `${name} appears read-only where write/status-changing actions are required.`);
  if ((api || read || write) && !audit) add(findings, 'P3', 'MISSING_AUDIT_LOG', `${name} has API/data access but no detectable audit log integration.`);
  if (['P1_service_order_operations','P6_customer_portal','P8_public_global_rbac_rls'].includes(key) && !status) add(findings, 'P3', 'MISSING_STATUS_TRANSITION_LOG', `${name} should integrate status_transition_logs for state changes.`);
  const missingTables = tables.filter((t) => !detectedTables.includes(t));
  const missingLinks = links.filter((l) => !detectedLinks.includes(l));
  const missingActions = actions.filter((a) => !detectedActions.includes(a));
  if (missingTables.length) add(findings, 'P4', 'MISSING_TABLE_COVERAGE', `${name} missing table references: ${missingTables.join(', ')}.`);
  if (missingLinks.length) add(findings, 'P4', 'MISSING_LINKAGE_KEYS', `${name} missing linkage keys: ${missingLinks.join(', ')}.`);
  if (missingActions.length) add(findings, 'P4', 'MISSING_REAL_OPERATION_ACTIONS', `${name} missing operation terms: ${missingActions.join(', ')}.`);
  const real = workspace && api && read && write && rbac && audit && (!['P1_service_order_operations','P6_customer_portal','P8_public_global_rbac_rls'].includes(key) || status) && !staticHits.length;
  return { key, name, route_or_workspace_detected: workspace, api_detected: api, supabase_read_detected: read, supabase_write_detected: write, rbac_boundary_detected: rbac, audit_log_detected: audit, status_log_detected: status, detected_tables: detectedTables, missing_tables: missingTables, found_linkage_keys: detectedLinks, missing_linkage_keys: missingLinks, detected_actions: detectedActions, missing_actions: missingActions, reality_classification: real ? 'real_operable_candidate' : (workspace || api || read || write ? 'partial_real_candidate' : 'static_or_missing_review_required'), scanned_files_count: files.length, sample_files: files.slice(0, 25), score: score(findings), repair_priority: findings[0]?.priority || 'NONE', findings };
}

function chain(key, name, paths, requiredTerms, requiredApis) {
  const files = under(paths);
  const f = found(files, requiredTerms);
  const missingTerms = requiredTerms.filter((x) => !f.includes(x));
  const apiFound = requiredApis.filter((x) => route(x) || under([x]).length);
  const missingApis = requiredApis.filter((x) => !apiFound.includes(x));
  const findings = [];
  if (!files.length) add(findings, 'P0', 'CHAIN_FILES_MISSING', `${name} files were not detected.`);
  if (missingApis.length) add(findings, 'P0', 'CHAIN_API_MISSING', `${name} missing APIs/routes: ${missingApis.join(', ')}.`);
  if (!found(files, common.rbac).length) add(findings, 'P0', 'CHAIN_AUTH_BOUNDARY_MISSING', `${name} has no detectable auth/RBAC boundary.`);
  if (!found(files, common.audit).length) add(findings, 'P3', 'CHAIN_AUDIT_LOG_MISSING', `${name} has no detectable audit log integration.`);
  if (!found(files, common.status).length) add(findings, 'P3', 'CHAIN_STATUS_LOG_MISSING', `${name} has no detectable status transition log integration.`);
  if (missingTerms.length) add(findings, 'P4', 'CHAIN_TERMS_MISSING', `${name} missing terms: ${missingTerms.join(', ')}.`);
  return { key, name, scanned_files_count: files.length, expected_apis_or_routes: requiredApis, detected_apis_or_routes: apiFound, missing_apis_or_routes: missingApis, found_terms: f, missing_terms: missingTerms, score: score(findings), findings };
}

const moduleReports = modules.map(auditModule);
const coreChainChecks = [
  chain('chain_A_public_submit_register_login', 'A. Public Submit Request / Repair / Warranty Tracking / Customer Register & Login', ['app/get-a-free-quote','app/track-record-warranty','app/customer-portal','app/login','app/register','app/api/public','app/api/repair-request','app/api/submit-request','app/api/service-requests','app/api/customer-portal','app/api/customer-auth','components/customer-portal','components/public'], ['unified_intake','leads','service_requests','customers','profiles','customer_record_links','customer_id','lead_id','service_request_id','auth_user_id','storage','upload'], ['app/api/service-requests','app/api/customer-portal','app/customer-portal']),
  chain('chain_B_website_cms_publish_render', 'B. Website Management / CMS / SEO-AEO / Public Rendering', ['app/admin/website-management','app/api/website-cms','app/api/website-management','app/api/cms','app/api/website','components/website-management','components/WebsiteCMS','app/page.tsx'], ['website_pages','website_content_blocks','website_page_versions','media_library','draft','preview','publish','rollback','schema','meta','faq','internal links'], ['app/api/website-cms','app/admin/website-management']),
  chain('chain_C_full_oa_erp_timeline', 'C. Public Website → Backend → Customer Center → Service Request → Job → Quotation → Invoice → Payment → Warranty → Customer Portal Timeline', ['app/api/public','app/api/repair-request','app/api/service-requests','app/api/admin/service-operations','app/api/service-operations','app/api/jobs','app/api/quotations','app/api/invoices','app/api/payments','app/api/warranty','app/api/customer-portal','app/admin/service-operations','app/admin/customer-center','components/service-operations','components/customer-portal'], ['unified_intake','lead_id','customer_id','service_request_id','job_id','quotation_id','invoice_id','payment_id','warranty_id','status_transition_logs','audit_logs'], ['app/api/service-requests','app/api/admin/service-operations','app/api/customer-portal'])
];
const globalFindings = [];
if (hits(common.unsafe).length) add(globalFindings, 'P0', 'GLOBAL_FORGEABLE_HEADER_RISK', 'Potential forgeable auth/role/customer headers detected.', { files: hits(common.unsafe).slice(0, 30) });
if (hits(['select("*")', "select('*')"]).length) add(globalFindings, 'P1', 'GLOBAL_WILDCARD_SELECT_RISK', 'Wildcard Supabase select detected.', { files: hits(['select("*")', "select('*')"]).slice(0, 30) });
if (hits(['localStorage', 'sessionStorage']).length) add(globalFindings, 'P1', 'GLOBAL_BROWSER_STORAGE_STATE_RISK', 'Browser storage state detected; verify no business state depends on it.', { files: hits(['localStorage', 'sessionStorage']).slice(0, 30) });
const globalRiskCheck = { key: 'global_security_reality_risks', name: 'Global Search / RBAC / RLS / Audit / Mock-Fallback Risk Sweep', scanned_files_count: allFiles.length, score: score(globalFindings), findings: globalFindings };
const findings = [...moduleReports, ...coreChainChecks, globalRiskCheck].flatMap((m) => m.findings.map((f) => ({ module_key: m.key, module_name: m.name, ...f })));
const counts = Object.fromEntries(['P0','P1','P2','P3','P4'].map((p) => [p, findings.filter((f) => f.priority === p).length]));
const blocking = findings.filter((f) => ['P0','P1','P2'].includes(f.priority));
const allScores = [...moduleReports, ...coreChainChecks, globalRiskCheck].map((x) => x.score);
const overallScore = Math.round(allScores.reduce((a,b) => a + b, 0) / Math.max(1, allScores.length));
const report = { ok: blocking.length === 0, verifier: 'verify-v28-6-full-oa-erp-real-module-audit', generated_at: new Date().toISOString(), audit_mode: 'read-only repository static scan; no production Supabase connection; no database mutation; no business-code repair', production_baseline: { repo: 'gaven2027-hash/NANOFIX_V28_UNIFIED_WEBSITE_ADMIN', branch_base_commit: '2ad06bd507a23b5c7f11f18e652cd2c09f7dfc82', merged_pr: 19, production_domain: 'https://app.nanofixsg.com' }, scanned_roots: scanRoots, priority_rules: { P0: 'missing workspace/API/auth boundary or unsafe auth foundation risk', P1: 'placeholder/demo/fake success/browser state/static-workflow risk', P2: 'API exists but no real Supabase read/write or read-only behavior where mutation is required', P3: 'read/write exists but audit/status log integration is missing or incomplete', P4: 'missing linkage keys, expected tables, operation actions, or cross-module relationship terms' }, scanned_files_count: allFiles.length, overall_score: overallScore, counts_by_priority: counts, blocking_findings_count: blocking.length, modules: moduleReports, core_chain_checks: coreChainChecks, global_risk_check: globalRiskCheck, findings, next_repair_sequence: ['V28.6.1 P0 Dashboard','V28.6.2 P1 Service & Order Operations','V28.6.3 P2 Website CMS','V28.6.4 P3 Social Media','V28.6.5 P4 AI Center','V28.6.6 P5 Customer Center','V28.6.7 P6 Customer Portal','V28.6.8 P7 Settings / Backup','V28.6.9 P8 Public Website / Global Search / RBAC / RLS'] };
function esc(x) { return String(x).replace(/\|/g, '\\|'); }
function md(data) {
  const lines = ['# NANOFIX V28.6 Full OA/ERP Real Module Audit Report', '', `- Verifier: \`${data.verifier}\``, `- Generated at: ${data.generated_at}`, `- Mode: ${data.audit_mode}`, `- Baseline: PR #${data.production_baseline.merged_pr}, commit \`${data.production_baseline.branch_base_commit}\``, `- Overall score: **${data.overall_score}/100**`, `- Blocking findings: **${data.blocking_findings_count}**`, `- Priority counts: P0=${data.counts_by_priority.P0}, P1=${data.counts_by_priority.P1}, P2=${data.counts_by_priority.P2}, P3=${data.counts_by_priority.P3}, P4=${data.counts_by_priority.P4}`, '', '## P0-P8 Module Reality Summary', '', '| Module | Score | Reality | Workspace | API | Supabase Read | Supabase Write | RBAC | Audit | Status | Repair Priority |', '|---|---:|---|---|---|---|---|---|---|---|---|'];
  for (const m of data.modules) lines.push(`| ${esc(m.name)} | ${m.score} | ${esc(m.reality_classification)} | ${m.route_or_workspace_detected ? 'yes' : 'no'} | ${m.api_detected ? 'yes' : 'no'} | ${m.supabase_read_detected ? 'yes' : 'no'} | ${m.supabase_write_detected ? 'yes' : 'no'} | ${m.rbac_boundary_detected ? 'yes' : 'no'} | ${m.audit_log_detected ? 'yes' : 'no'} | ${m.status_log_detected ? 'yes' : 'no'} | ${m.repair_priority} |`);
  lines.push('', '## Core Chain Checks', '', '| Chain | Score | Missing APIs/Routes | Missing Terms |', '|---|---:|---|---|');
  for (const c of data.core_chain_checks) lines.push(`| ${esc(c.name)} | ${c.score} | ${esc(c.missing_apis_or_routes.join(', ') || 'none')} | ${esc(c.missing_terms.join(', ') || 'none')} |`);
  lines.push('', '## Top Findings', '');
  for (const f of data.findings.slice(0, 80)) lines.push(`- **${f.priority} / ${f.module_name} / ${f.code}:** ${f.message}`);
  lines.push('', '## Required Repair Order', '');
  for (const item of data.next_repair_sequence) lines.push(`1. ${item}`);
  lines.push('', '## Safety Notes', '', '- This verifier is read-only and does not connect to or mutate production Supabase.', '- Keep PR #20, PR #21, final-clean, rebased, probe, and marker branches out of V28.6.', '');
  return `${lines.join('\n')}\n`;
}
fs.writeFileSync(path.join(root, jsonReportFile), `${JSON.stringify(report, null, 2)}\n`);
fs.writeFileSync(path.join(root, mdReportFile), md(report));
console.log(JSON.stringify({ ok: report.ok, verifier: report.verifier, json_report: jsonReportFile, md_report: mdReportFile, scanned_files_count: report.scanned_files_count, overall_score: report.overall_score, counts_by_priority: report.counts_by_priority, blocking_findings_count: report.blocking_findings_count }, null, 2));
if (!report.ok) process.exit(1);
