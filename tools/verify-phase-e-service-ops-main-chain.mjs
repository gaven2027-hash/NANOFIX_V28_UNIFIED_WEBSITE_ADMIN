import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const failures = [];
const exists = (file) => fs.existsSync(path.join(root, file));
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const assert = (ok, msg) => { if (!ok) failures.push(msg); };
const must = (content, marker, label) => assert(content.includes(marker), `${label} missing ${marker}`);

const workspaceFiles = [
  'components/ServiceOperationsServiceRequestsWorkspace.tsx',
  'components/ServiceOperationsServiceRequestDetailWorkspace.tsx',
  'components/ServiceOperationsCreateJobWorkspace.tsx',
  'components/ServiceOperationsAssignEngineerWorkspace.tsx',
  'components/ServiceOperationsInspectionResultWorkspace.tsx',
  'components/ServiceOperationsQuotationLiveWorkspace.tsx',
  'components/ServiceOperationsQuotationAcceptanceBridge.tsx',
  'components/ServiceOperationsInvoiceLiveWorkspace.tsx',
  'components/ServiceOperationsPaymentLiveWorkspace.tsx',
  'components/ServiceOperationsWarrantyPdfPanel.tsx',
  'components/ServiceOperationsInvoicePdfPanel.tsx',
  'components/ServiceOperationsQuotationPdfPanel.tsx'
];

const requiredFiles = [
  ...workspaceFiles,
  'app/service-operations/page.tsx',
  'components/ServiceOperationsLiveCore.tsx',
  'tools/verify-warranty-auto-generation-admin-documents.mjs',
  'tools/verify-warranty-claim-workflow.mjs',
  'tools/verify-phase-e-core-business-oa.mjs',
  'package.json'
];

for (const file of requiredFiles) assert(exists(file), `Missing file: ${file}`);

if (!failures.length) {
  const page = read('app/service-operations/page.tsx');
  const pkg = read('package.json');

  for (const file of workspaceFiles) {
    const content = read(file);
    const componentName = path.basename(file, '.tsx');
    must(page, componentName, 'Service Operations page mounting');
    assert(content.includes('/api/admin/service-operations') || content.includes('fetch('), `${componentName} must call a guarded service-operations API or explicit live fetch.`);
    assert(content.includes('blocked or not connected') || content.includes('response.ok') || content.includes('throw new Error'), `${componentName} must fail closed when the live API is unavailable.`);
    must(content, 'bg-activeBlue', `${componentName} blue admin style`);
    assert(!content.includes('fake success'), `${componentName} must not show fake success.`);
  }

  const orderedMarkers = [
    'ServiceOperationsServiceRequestsWorkspace',
    'ServiceOperationsServiceRequestDetailWorkspace',
    'ServiceOperationsCreateJobWorkspace',
    'ServiceOperationsAssignEngineerWorkspace',
    'ServiceOperationsInspectionResultWorkspace',
    'ServiceOperationsQuotationLiveWorkspace',
    'ServiceOperationsQuotationAcceptanceBridge',
    'ServiceOperationsInvoiceLiveWorkspace',
    'ServiceOperationsPaymentLiveWorkspace'
  ];
  let lastIndex = -1;
  for (const marker of orderedMarkers) {
    const index = page.indexOf(`<${marker} />`);
    assert(index > lastIndex, `Main chain order invalid or missing: ${marker}`);
    lastIndex = index;
  }

  const chainRules = [
    ['components/ServiceOperationsQuotationAcceptanceBridge.tsx', 'accepted_warranty_years'],
    ['components/ServiceOperationsQuotationAcceptanceBridge.tsx', 'Invoice preparation starts'],
    ['components/ServiceOperationsInvoiceLiveWorkspace.tsx', '/api/admin/service-operations/invoice-live'],
    ['components/ServiceOperationsPaymentLiveWorkspace.tsx', '/api/admin/service-operations/payment-live'],
    ['components/ServiceOperationsWarrantyPdfPanel.tsx', 'warranty'],
    ['tools/verify-warranty-auto-generation-admin-documents.mjs', 'accepted_warranty_years'],
    ['components/CustomerPortalWarrantyDownloads.tsx', 'CustomerPortalWarrantyDownloads']
  ];
  for (const [file, marker] of chainRules) must(read(file), marker, `${file} warranty/payment chain rule`);

  must(pkg, 'verify:phase-e-service-ops-main-chain', 'package scripts');
  must(pkg, 'verify-phase-e-service-ops-main-chain.mjs', 'package scripts');
  must(pkg, 'validate:predeploy', 'package scripts');
}

console.log(JSON.stringify({ ok: failures.length === 0, verifier: 'verify-phase-e-service-ops-main-chain', failures }, null, 2));
if (failures.length) process.exit(1);
