import fs from 'node:fs';

const migrationPath = 'supabase/migrations/20260610_v28_6_9_2_rls_static_evidence_business_tables.sql';
const productionAuditPath = 'tools/verify-supabase-production-audit.mjs';
const migration = fs.existsSync(migrationPath) ? fs.readFileSync(migrationPath, 'utf8') : '';
const productionAudit = fs.existsSync(productionAuditPath) ? fs.readFileSync(productionAuditPath, 'utf8') : '';
const findings = [];

function add(severity, area, file, message, recommendation) {
  findings.push({ severity, area, file, message, recommendation });
}
function count(severity) {
  return findings.filter((finding) => finding.severity === severity).length;
}
function includes(text, marker) {
  return text.toLowerCase().includes(marker.toLowerCase());
}

const tables = ['unified_intake', 'leads', 'quotation_versions', 'audit_logs'];

if (!migration) {
  add('P0', 'migration', migrationPath, 'V28.6.9.2 RLS evidence migration is missing.', 'Restore the migration file before continuing.');
}

for (const table of tables) {
  if (!includes(migration, `alter table public.${table} enable row level security`)) {
    add('P0', 'rls', migrationPath, `${table} does not have explicit RLS enablement evidence.`, `Add alter table public.${table} enable row level security.`);
  }
  if (!includes(migration, `on public.${table}`)) {
    add('P0', 'policy', migrationPath, `${table} does not have explicit policy evidence.`, `Create/drop an idempotent policy on public.${table}.`);
  }
}

for (const policyName of ['unified_intake_admin_all', 'leads_admin_all', 'quotation_versions_admin_all', 'audit_logs_admin_select']) {
  if (!includes(migration, policyName)) {
    add('P0', 'policy', migrationPath, `Missing policy ${policyName}.`, 'Keep exact production-aligned policy names for live comparison.');
  }
}

for (const role of ['super_admin', 'operations_admin', 'support']) {
  if (!includes(migration, role)) add('P1', 'roles', migrationPath, `Role ${role} is not represented in RLS policy evidence.`, 'Confirm the production policy role matrix before merge.');
}
for (const role of ['content_admin', 'finance']) {
  if (!includes(migration, role)) add('P1', 'roles', migrationPath, `Role ${role} is not represented where expected.`, 'Content admin should be present for intake/leads; finance should be present for quotation_versions.');
}

if (includes(migration, 'drop table') || includes(migration, 'truncate ') || includes(migration, 'delete from')) {
  add('P0', 'destructive', migrationPath, 'Destructive SQL marker found.', 'Do not reset or delete production data in this evidence batch.');
}

if (!productionAudit || !includes(productionAudit, 'requiredBusinessTables')) {
  add('P1', 'verifier', productionAuditPath, 'Production audit verifier was not readable or missing requiredBusinessTables.', 'Review production verifier before declaring the warning closure complete.');
}

const report = {
  ok: count('P0') === 0,
  verifier: 'verify-v28-6-9-2-rls-static-evidence-live-policy-verifier',
  generated_at: new Date().toISOString(),
  branch: 'v28-6-9-2-rls-static-evidence-live-policy-verifier',
  baseline: 'main@a064418',
  scope: 'Static verification for RLS and policy evidence on unified_intake, leads, quotation_versions and audit_logs.',
  production_live_evidence_required: [
    'All four tables have relrowsecurity = true.',
    'All four policies exist with production-aligned role matrices.',
    'validate:predeploy should remove previous RLS evidence warnings for these four tables.',
    '/api/ready and /api/system/health stay ok:true after controlled migration apply.'
  ],
  summary: {
    findings_total: findings.length,
    p0: count('P0'),
    p1: count('P1'),
    p2: count('P2'),
    tables_checked: tables.length
  },
  findings
};

fs.writeFileSync('V28_6_9_2_RLS_STATIC_EVIDENCE_LIVE_POLICY_VERIFIER_REPORT.json', JSON.stringify(report, null, 2));
const md = [
  '# V28.6.9.2 RLS Static Evidence / Live Policy Verifier Report',
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
  `- Tables checked: ${report.summary.tables_checked}`,
  '',
  '## Tables',
  '',
  ...tables.map((table) => `- ${table}`),
  '',
  '## Production Live Evidence Required',
  '',
  ...report.production_live_evidence_required.map((item) => `- ${item}`),
  '',
  '## Findings',
  '',
  ...(findings.length ? findings.map((finding) => `- **${finding.severity} / ${finding.area}** ${finding.file}: ${finding.message} Recommendation: ${finding.recommendation}`) : ['- No findings.']),
  ''
].join('\n');
fs.writeFileSync('V28_6_9_2_RLS_STATIC_EVIDENCE_LIVE_POLICY_VERIFIER_REPORT.md', md);

console.log(JSON.stringify(report, null, 2));
if (!report.ok) process.exitCode = 1;
