import fs from 'node:fs';

const files = {
  middleware: 'middleware.ts',
  auth: 'lib/nanofix/auth.ts',
  apiSecurity: 'lib/apiSecurity.ts',
  globalSearch: 'app/api/global-search/route.ts',
  publicRepairApi: 'app/api/public-repair-request/route.ts',
  publicRepairLib: 'lib/public-repair-request.ts',
  readyRoute: 'app/api/ready/route.ts',
  healthRoute: 'app/api/system/health/route.ts',
  supabaseAudit: 'tools/verify-supabase-production-audit.mjs'
};

const findings = [];

function read(path) {
  return fs.existsSync(path) ? fs.readFileSync(path, 'utf8') : '';
}

function add(severity, area, file, message, recommendation) {
  findings.push({ severity, area, file, message, recommendation });
}

function hasAll(source, markers) {
  return markers.every((marker) => source.includes(marker));
}

function countSeverity(severity) {
  return findings.filter((finding) => finding.severity === severity).length;
}

for (const [key, path] of Object.entries(files)) {
  if (!fs.existsSync(path)) add('P0', 'file', path, `Required ${key} file is missing.`, 'Restore the required file before V28.6.9 can continue.');
}

const middleware = read(files.middleware);
const auth = read(files.auth);
const apiSecurity = read(files.apiSecurity);
const globalSearch = read(files.globalSearch);
const publicRepairApi = read(files.publicRepairApi);
const publicRepairLib = read(files.publicRepairLib);
const supabaseAudit = read(files.supabaseAudit);

if (!hasAll(middleware, ['/api/global-search', 'cleanIncomingAuthSpoofHeaders', 'x-nanofix-auth-verified', 'x-admin-role'])) {
  add('P0', 'middleware', files.middleware, 'Middleware must protect global search and strip spoofed admin headers.', 'Keep /api/global-search in protected API routes and delete incoming spoof headers before attaching verified actor headers.');
}
if (!hasAll(auth, ['x-nanofix-auth-verified', 'Frontend-provided x-admin-role', 'requireAdmin', 'permissionAllowed'])) {
  add('P0', 'rbac', files.auth, 'Admin auth helper must ignore frontend role headers unless middleware verified.', 'Continue using requireAdmin/getAdminContext with x-nanofix-auth-verified as the only trusted header gate.');
}
if (!hasAll(apiSecurity, ['requireAdminApi', 'actorFromBearerToken', 'actorFromSessionCookies', 'actorFromExplicitInternalSecret'])) {
  add('P0', 'rbac', files.apiSecurity, 'Legacy API security helper must require Supabase actor/session or explicitly disabled emergency secret fallback.', 'Keep fallback disabled by default and avoid trusting client role headers.');
}
if (!hasAll(globalSearch, ['requireAdminApi', 'writeAuditLog', 'canSearchSensitiveBusiness', 'canSearchContentOps'])) {
  add('P0', 'global_search', files.globalSearch, 'Global search must be admin-authenticated, role-gated and audited.', 'Require admin auth, constrain sensitive searches by role, and write audit logs for every search.');
}
if (globalSearch.includes("supabase.rpc('search_all_records'")) {
  add('P1', 'global_search_rpc', files.globalSearch, 'Global search still calls search_all_records RPC when the role is allowed.', 'V28.6.9.1 should verify production EXECUTE grants for search_all_records or retire the RPC in favour of explicit allowlisted fallback queries only.');
}
if (!hasAll(publicRepairApi, ['handlePublicRepairRequest'])) {
  add('P0', 'public_repair', files.publicRepairApi, 'Public repair API must route through the hardened repair handler.', 'Keep public POST delegated to handlePublicRepairRequest.');
}
if (!hasAll(publicRepairLib, ['checkRateLimit', 'checkSupabaseRateLimit', 'verifyTurnstile', 'detectMime', 'audit_logs', 'unified_intake', 'leads', 'service_requests'])) {
  add('P0', 'public_repair', files.publicRepairLib, 'Public repair request flow must include rate limiting, bot/upload validation, audit, and real Supabase writes.', 'Do not reintroduce mock success, localStorage state or unaudited public writes.');
}
if (publicRepairLib.includes('if (!secret) return true;')) {
  add('P1', 'public_turnstile', files.publicRepairLib, 'Turnstile is optional and currently bypasses when CLOUDFLARE_TURNSTILE_SECRET_KEY is not configured.', 'Keep this as non-blocking only until Vercel env variables are configured; target readiness score 94-96 requires Turnstile envs.');
}
if (publicRepairLib.includes('memory_fallback')) {
  add('P2', 'public_rate_limit', files.publicRepairLib, 'Rate limit may temporarily fall back to memory if Supabase rate-limit storage cannot be read.', 'Confirm form_rate_limits table exists and is included in readiness checks before calling the public form fully hardened.');
}
if (supabaseAudit.includes('No policy evidence found for unified_intake') || supabaseAudit.includes('No policy evidence found for leads') || supabaseAudit.includes('No RLS enablement evidence found for quotation_versions') || supabaseAudit.includes('No policy evidence found for audit_logs')) {
  add('P1', 'rls_static_evidence', files.supabaseAudit, 'Supabase production audit still reports static RLS/policy evidence gaps for unified_intake, leads, quotation_versions or audit_logs.', 'V28.6.9.1 should add explicit migration evidence and/or live policy verifier for these tables without resetting production.');
}

const report = {
  ok: countSeverity('P0') === 0,
  verifier: 'verify-v28-6-9-public-rbac-rls-global-search-audit',
  generated_at: new Date().toISOString(),
  branch: 'v28-6-9-public-rbac-rls-global-search-audit',
  baseline: 'main@a73a531',
  scope: 'V28.6.9 audit for public website intake, global search, RBAC, RLS and production readiness final security closure.',
  summary: {
    files_checked: Object.keys(files).length,
    findings_total: findings.length,
    p0: countSeverity('P0'),
    p1: countSeverity('P1'),
    p2: countSeverity('P2')
  },
  audit_result: countSeverity('P0') === 0 ? 'NO_BLOCKING_P0_FOUND_AUDIT_READY_FOR_REPAIR_BATCH' : 'BLOCKING_P0_FOUND',
  next_repair_batch: [
    'V28.6.9.1 Supabase RPC EXECUTE / SECURITY DEFINER / search_path hardening migration',
    'V28.6.9.2 RLS static evidence and live policy verifier for unified_intake, leads, quotation_versions, audit_logs',
    'V28.6.9.3 Optional env hardening: Turnstile and ADMIN_REPAIR_REQUEST_URL readiness lift',
    'V28.6.9.4 Global search RPC retirement or proof-gated allowlist mode'
  ],
  findings
};

fs.writeFileSync('V28_6_9_PUBLIC_RBAC_RLS_GLOBAL_SEARCH_AUDIT_REPORT.json', JSON.stringify(report, null, 2));

const md = [
  '# V28.6.9 Public / RBAC / RLS / Global Search Audit Report',
  '',
  `Generated: ${report.generated_at}`,
  '',
  `OK: ${report.ok}`,
  '',
  '## Summary',
  '',
  `- Files checked: ${report.summary.files_checked}`,
  `- Findings total: ${report.summary.findings_total}`,
  `- P0 findings: ${report.summary.p0}`,
  `- P1 findings: ${report.summary.p1}`,
  `- P2 findings: ${report.summary.p2}`,
  '',
  '## Next Repair Batch',
  '',
  ...report.next_repair_batch.map((item) => `- ${item}`),
  '',
  '## Findings',
  '',
  ...(findings.length ? findings.map((finding) => `- **${finding.severity} / ${finding.area}** ${finding.file}: ${finding.message} Recommendation: ${finding.recommendation}`) : ['- No findings.']),
  ''
].join('\n');

fs.writeFileSync('V28_6_9_PUBLIC_RBAC_RLS_GLOBAL_SEARCH_AUDIT_REPORT.md', md);

console.log(JSON.stringify(report, null, 2));
if (!report.ok) process.exitCode = 1;
