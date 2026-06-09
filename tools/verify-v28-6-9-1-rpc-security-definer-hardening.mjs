import fs from 'node:fs';

const migrationPath = 'supabase/migrations/20260609_v28_6_9_1_rpc_security_definer_hardening.sql';
const source = fs.existsSync(migrationPath) ? fs.readFileSync(migrationPath, 'utf8') : '';
const findings = [];

function add(severity, message, recommendation) {
  findings.push({ severity, message, recommendation });
}

function has(text) {
  return source.includes(text);
}

function count(severity) {
  return findings.filter((item) => item.severity === severity).length;
}

if (!source) {
  add('P0', 'V28.6.9.1 migration file is missing.', 'Restore the migration before continuing.');
}

const serverRpcs = [
  'auto_generate_warranty_after_job_completion',
  'close_warranty_claim_tx',
  'confirm_warranty_claim_satisfaction_tx',
  'create_unified_task_with_inbox',
  'review_warranty_claim_tx',
  'route_warranty_claim_tx'
];
const touchFunctions = [
  'warranty_pdf_documents_touch_updated_at',
  'nanofix_touch_updated_at',
  'payment_intents_touch_updated_at',
  'payment_checkout_sessions_touch_updated_at',
  'document_company_settings_touch_updated_at',
  'customer_portal_requests_touch_updated_at',
  'warranty_claims_touch_updated_at'
];
const policyHelpers = ['current_user_role', 'owns_customer'];

for (const fn of serverRpcs) {
  if (!has(fn)) add('P0', `Server-side RPC ${fn} is not covered.`, 'Add this function to the hardening migration.');
}
for (const fn of touchFunctions) {
  if (!has(fn)) add('P0', `Touch trigger function ${fn} is not covered.`, 'Add this function to the search_path hardening migration.');
}
for (const fn of policyHelpers) {
  if (!has(fn)) add('P1', `Policy-bound helper ${fn} is not documented in the migration.`, 'Keep authenticated policy execution intact and document any advisory exception.');
}

for (const marker of [
  'set search_path = public, pg_temp',
  'revoke execute on function %s from public',
  'revoke execute on function %s from anon',
  'revoke execute on function %s from authenticated',
  'grant execute on function %s to service_role',
  'grant execute on function %s to authenticated'
]) {
  if (!has(marker)) add('P0', `Migration missing marker: ${marker}`, 'Keep explicit revokes/grants and fixed search_path in the migration.');
}

if (has('drop function') || has('drop table') || has('truncate ') || has('delete from')) {
  add('P0', 'Migration contains destructive DDL/DML marker.', 'Do not reset production data or drop functions/tables in this hardening batch.');
}

const report = {
  ok: count('P0') === 0,
  verifier: 'verify-v28-6-9-1-rpc-security-definer-hardening',
  generated_at: new Date().toISOString(),
  branch: 'v28-6-9-1-rpc-security-definer-hardening',
  baseline: 'main@a73a531',
  scope: 'Static verification for Supabase RPC / SECURITY DEFINER / search_path hardening migration.',
  summary: {
    findings_total: findings.length,
    p0: count('P0'),
    p1: count('P1'),
    p2: count('P2'),
    server_rpcs_covered: serverRpcs.length,
    touch_functions_covered: touchFunctions.length,
    policy_helpers_documented: policyHelpers.length
  },
  production_apply_note: 'Do not apply blindly. Apply only after local review, then verify production advisors and function privileges.',
  findings
};

fs.writeFileSync('V28_6_9_1_RPC_SECURITY_DEFINER_HARDENING_REPORT.json', JSON.stringify(report, null, 2));
const md = [
  '# V28.6.9.1 RPC / SECURITY DEFINER / search_path Hardening Report',
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
  `- Server RPCs covered: ${report.summary.server_rpcs_covered}`,
  `- Touch functions covered: ${report.summary.touch_functions_covered}`,
  `- Policy helpers documented: ${report.summary.policy_helpers_documented}`,
  '',
  '## Production Apply Note',
  '',
  report.production_apply_note,
  '',
  '## Findings',
  '',
  ...(findings.length ? findings.map((finding) => `- **${finding.severity}** ${finding.message} Recommendation: ${finding.recommendation}`) : ['- No findings.']),
  ''
].join('\n');
fs.writeFileSync('V28_6_9_1_RPC_SECURITY_DEFINER_HARDENING_REPORT.md', md);

console.log(JSON.stringify(report, null, 2));
if (!report.ok) process.exitCode = 1;
