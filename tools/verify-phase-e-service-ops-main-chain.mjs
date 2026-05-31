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
    must(content, 'blocked or not connected', `${componentName} blocked-state guard`);
    must(content, 'Production rule', `${componentName} production rule`);
    must(content, 'bg-activeBlue', `${componentName} blue admin style`);
    assert(!content.includes('fake success') || content.includes('must not') || content.includes('not show fake'), `${componentName} must explicitly avoid fake success.`);
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
    ['components/ServiceOperationsInvoiceLiveWorkspace.tsx', 'payment_intent_readiness'],
    ['components/ServiceOperationsPaymentLiveWorkspace.tsx', 'invoice status update'],
    ['components/ServiceOperationsWarrantyPdfPanel.tsx', 'warranty'],
    ['tools/verify-warranty-auto-generation-admin-documents.mjs', 'accepted_warranty_years'],
    ['tools/verify-warranty-auto-generation-admin-documents.mjs', 'CustomerPortalWarrantyDownloads']
  ];
  for (const [file, marker] of chainRules) must(read(file), marker, `${file} warranty/payment chain rule`);

  must(pkg, 'verify:phase-e-service-ops-main-chain', 'package scripts');
  must(pkg, 'verify-phase-e-service-ops-main-chain.mjs', 'package scripts');
  must(pkg, 'validate:predeploy', 'package scripts');
}

console.log(JSON.stringify({ ok: failures.length === 0, verifier: 'verify-phase-e-service-ops-main-chain', failures }, null, 2));
if (failures.length) process.exit(1);
