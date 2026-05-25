import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const exists = (file) => fs.existsSync(path.join(root, file));

const requiredFiles = [
  'lib/nanofix/operationsConfig.ts',
  'components/ServiceOperationsWorkspace.tsx',
  'components/AdminShell.tsx',
  'app/service-operations/[module]/page.tsx',
  'app/api/admin/service-operations/route.ts',
  'app/api/admin/lead-actions/route.ts',
  'app/api/admin/request-actions/route.ts',
  'app/api/admin/inspection-actions/route.ts',
  'app/api/admin/quotation-actions/route.ts',
  'app/api/admin/invoice-actions/route.ts',
  'app/api/admin/payment-actions/route.ts',
  'app/api/admin/receipt-actions/route.ts',
  'supabase/migrations/20260525233000_v28_1_2_invoice_quotation_link.sql',
  'supabase/migrations/20260525234000_v28_1_2_warranty_receipt_link.sql'
];

const requiredModuleKeys = [
  'leads',
  'service-requests',
  'bookings',
  'inspections',
  'quotations',
  'jobs',
  'invoices',
  'payments',
  'receipts',
  'warranties'
];

const requiredFlowActions = [
  'create_service_request',
  'create_booking',
  'create_inspection',
  'create_quotation',
  'create_invoice',
  'create_payment',
  'create_receipt',
  'create_warranty'
];

const requiredRoutes = [
  '/service-operations/leads',
  '/service-operations/service-requests',
  '/service-operations/bookings',
  '/service-operations/inspections',
  '/service-operations/quotations',
  '/service-operations/jobs',
  '/service-operations/invoices',
  '/service-operations/payments',
  '/service-operations/receipts',
  '/service-operations/warranties'
];

const failures = [];

for (const file of requiredFiles) {
  if (!exists(file)) failures.push(`Missing required file: ${file}`);
}

if (!failures.length) {
  const operationsConfig = read('lib/nanofix/operationsConfig.ts');
  const workspace = read('components/ServiceOperationsWorkspace.tsx');
  const adminShell = read('components/AdminShell.tsx');
  const dynamicPage = read('app/service-operations/[module]/page.tsx');

  for (const key of requiredModuleKeys) {
    if (!operationsConfig.includes(`key: '${key}'`)) failures.push(`Missing operation module key: ${key}`);
  }

  for (const route of requiredRoutes) {
    if (!operationsConfig.includes(`route: '${route}'`)) failures.push(`Missing operation route: ${route}`);
  }

  for (const action of requiredFlowActions) {
    if (!workspace.includes(action) && !read(`app/api/admin/${action.replace('create_', '').replace('service_request', 'lead').replace('booking', 'request').replace('inspection', 'request').replace('quotation', 'inspection').replace('invoice', 'quotation').replace('payment', 'invoice').replace('receipt', 'payment').replace('warranty', 'receipt')}-actions/route.ts`).includes(action)) {
      failures.push(`Missing flow action reference: ${action}`);
    }
  }

  if (!dynamicPage.includes('generateStaticParams') || !dynamicPage.includes('operationModules.map')) {
    failures.push('Dynamic service operations page is not generated from operationModules.');
  }

  if (!adminShell.includes("module.key !== 'receipts'")) {
    failures.push('Receipts route should remain hidden from sidebar to preserve the confirmed left menu.');
  }

  if (!workspace.includes('/service-operations/receipts')) failures.push('Workspace does not route payments to receipts.');
  if (!workspace.includes('/service-operations/warranties')) failures.push('Workspace does not route receipts to warranties.');
  if (!operationsConfig.includes('receipt_id') || !operationsConfig.includes('payment_id') || !operationsConfig.includes('invoice_id')) {
    failures.push('Warranty source linkage fields are not exposed in operationsConfig.');
  }
}

if (failures.length) {
  console.error('NANOFIX Service Operations flow verification failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('NANOFIX Service Operations flow verification passed.');
console.log('Checked modules:', requiredModuleKeys.join(' → '));
console.log('Checked flow: Lead → Service Request → Booking/Inspection → Quotation → Invoice → Payment → Receipt → Warranty');
