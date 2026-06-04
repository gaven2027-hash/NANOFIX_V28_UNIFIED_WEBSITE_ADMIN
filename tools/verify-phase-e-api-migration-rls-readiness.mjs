import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const failures = [];
const warnings = [];
const exists = (file) => fs.existsSync(path.join(root, file));
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const assert = (ok, msg) => { if (!ok) failures.push(msg); };
const warn = (ok, msg) => { if (!ok) warnings.push(msg); };

const requiredWorkspaceFiles = [
  'components/ServiceOperationsServiceRequestsWorkspace.tsx',
  'components/ServiceOperationsServiceRequestDetailWorkspace.tsx',
  'components/ServiceOperationsCreateJobWorkspace.tsx',
  'components/ServiceOperationsAssignEngineerWorkspace.tsx',
  'components/ServiceOperationsInspectionResultWorkspace.tsx',
  'components/ServiceOperationsQuotationLiveWorkspace.tsx',
  'components/ServiceOperationsQuotationAcceptanceBridge.tsx',
  'components/ServiceOperationsInvoiceLiveWorkspace.tsx',
  'components/ServiceOperationsPaymentLiveWorkspace.tsx'
];

const existingVerifierFiles = [
  'tools/verify-phase-e-core-business-oa.mjs',
  'tools/verify-phase-e-service-ops-main-chain.mjs',
  'tools/verify-warranty-auto-generation-admin-documents.mjs',
  'tools/verify-warranty-claim-workflow.mjs',
  'tools/verify-payment-intent-flow.mjs',
  'tools/verify-payment-webhook-flow.mjs',
  'tools/verify-payment-checkout-flow.mjs',
  'tools/verify-invoice-pdf-flow.mjs',
  'tools/verify-quotation-pdf-flow.mjs'
];

for (const file of [...requiredWorkspaceFiles, ...existingVerifierFiles, 'app/service-operations/page.tsx', 'package.json']) assert(exists(file), `Missing file: ${file}`);

const requiredApiPaths = [
  'app/api/admin/service-operations/service-request-list/route.ts',
  'app/api/admin/service-operations/service-request-detail/route.ts',
  'app/api/admin/service-operations/create-job-from-request/route.ts',
  'app/api/admin/service-operations/assign-engineer/route.ts',
  'app/api/admin/service-operations/inspection-result/route.ts',
  'app/api/admin/service-operations/quotation-live/route.ts',
  'app/api/admin/service-operations/quotation-acceptance-bridge/route.ts',
  'app/api/admin/service-operations/invoice-live/route.ts',
  'app/api/admin/service-operations/payment-live/route.ts'
];

const sharedServiceOperationsApi = exists('lib/nanofix/service-operations-live-routes.ts') ? read('lib/nanofix/service-operations-live-routes.ts') : '';
const apiFindings = requiredApiPaths.map((file) => {
  if (!exists(file)) return { file, exists: false, auth: false, audit: false, explicitSelect: false };
  const text = read(file);
  const combined = text.includes('service-operations-live-routes') ? `${text}\n${sharedServiceOperationsApi}` : text;
  return {
    file,
    exists: true,
    auth: /requireActorApi|requireAdminApi|requireRoleApi/.test(combined),
    audit: /writeAuditLog|audit_logs|audit/i.test(combined),
    explicitSelect: !/select\s*\(\s*['"]\*['"]\s*\)/.test(combined)
  };
});

const migrationCandidateDirs = ['supabase/migrations', 'migrations', 'db/migrations'];
const migrationFiles = migrationCandidateDirs.flatMap((dir) => {
  const abs = path.join(root, dir);
  if (!fs.existsSync(abs)) return [];
  return fs.readdirSync(abs).filter((name) => name.endsWith('.sql')).map((name) => `${dir}/${name}`);
});
const migrationText = migrationFiles.map((file) => read(file)).join('\n\n');

const requiredTables = ['service_requests', 'jobs', 'quotations', 'invoices', 'payments', 'warranties', 'audit_logs', 'status_transition_logs'];
const tableFindings = requiredTables.map((table) => ({
  table,
  mentioned: migrationText.includes(table),
  rls: new RegExp(`alter\\s+table[\\s\\S]{0,80}${table}[\\s\\S]{0,120}enable\\s+row\\s+level\\s+security`, 'i').test(migrationText),
  policy: new RegExp(`policy[\\s\\S]{0,160}${table}|${table}[\\s\\S]{0,160}policy`, 'i').test(migrationText)
}));

if (!failures.length) {
  const page = read('app/service-operations/page.tsx');
  const pkg = read('package.json');
  for (const file of requiredWorkspaceFiles) {
    const componentName = path.basename(file, '.tsx');
    assert(page.includes(`<${componentName} />`), `Service Operations page missing mount: ${componentName}`);
    const content = read(file);
    assert(content.includes('/api/admin/service-operations') || content.includes('fetch('), `${componentName} must call a guarded service-operations API or explicit live fetch.`);
    assert(content.includes('blocked or not connected') || content.includes('response.ok') || content.includes('throw new Error'), `${componentName} must fail closed when the live API is unavailable.`);
  }

  assert(pkg.includes('verify:phase-e-service-ops-main-chain'), 'package.json missing service ops main-chain verifier.');
  warn(pkg.includes('verify:phase-e-api-migration-rls-readiness'), 'package.json has not wired Phase E API/Migration/RLS verifier yet.');
  warn(pkg.includes('verify-phase-e-api-migration-rls-readiness.mjs'), 'validate scripts do not reference Phase E API/Migration/RLS verifier yet.');
}

for (const api of apiFindings) {
  warn(api.exists, `Missing guarded API route: ${api.file}`);
  if (api.exists) {
    warn(api.auth, `API route lacks role auth marker: ${api.file}`);
    warn(api.audit, `API route lacks audit marker: ${api.file}`);
    warn(api.explicitSelect, `API route uses select('*') or unsafe broad select: ${api.file}`);
  }
}

for (const item of tableFindings) {
  warn(item.mentioned, `Migration evidence missing table mention: ${item.table}`);
  warn(item.rls, `Migration evidence missing RLS enablement: ${item.table}`);
  warn(item.policy, `Migration evidence missing policy marker: ${item.table}`);
}

const report = {
  ok: failures.length === 0,
  verifier: 'verify-phase-e-api-migration-rls-readiness',
  blocking_failures: failures,
  readiness_warnings: warnings,
  apiFindings,
  migrationFilesChecked: migrationFiles,
  tableFindings,
  productionGateMeaning: 'Failures block structural regressions. Warnings identify API/Migration/RLS gaps that must be closed before declaring Phase E fully live.'
};

console.log(JSON.stringify(report, null, 2));
if (failures.length) process.exit(1);
