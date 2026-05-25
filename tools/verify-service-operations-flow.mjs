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
  'supabase/migrations/20260525234000_v28_1_2_warranty_receipt_link.sql',
  'supabase/migrations/20260525235000_v28_1_2_service_flow_idempotency_indexes.sql'
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

const flowActions = [
  { action: 'create_service_request', api: 'app/api/admin/lead-actions/route.ts', route: '/service-operations/service-requests' },
  { action: 'create_booking', api: 'app/api/admin/request-actions/route.ts', route: '/service-operations/bookings' },
  { action: 'create_inspection', api: 'app/api/admin/request-actions/route.ts', route: '/service-operations/inspections' },
  { action: 'create_quotation', api: 'app/api/admin/inspection-actions/route.ts', route: '/service-operations/quotations' },
  { action: 'create_invoice', api: 'app/api/admin/quotation-actions/route.ts', route: '/service-operations/invoices' },
  { action: 'create_payment', api: 'app/api/admin/invoice-actions/route.ts', route: '/service-operations/payments' },
  { action: 'create_receipt', api: 'app/api/admin/payment-actions/route.ts', route: '/service-operations/receipts' },
  { action: 'create_warranty', api: 'app/api/admin/receipt-actions/route.ts', route: '/service-operations/warranties' }
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

const requiredIndexes = [
  'invoices_one_per_quotation_uidx',
  'payments_one_per_invoice_uidx',
  'receipts_one_per_payment_uidx',
  'warranties_one_per_receipt_uidx'
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
  const idempotencyMigration = read('supabase/migrations/20260525235000_v28_1_2_service_flow_idempotency_indexes.sql');

  for (const key of requiredModuleKeys) {
    if (!operationsConfig.includes(`key: '${key}'`)) failures.push(`Missing operation module key: ${key}`);
  }

  for (const route of requiredRoutes) {
    if (!operationsConfig.includes(`route: '${route}'`)) failures.push(`Missing operation route: ${route}`);
  }

  for (const item of flowActions) {
    const apiContent = read(item.api);
    if (!apiContent.includes(item.action)) failures.push(`Missing API action: ${item.action} in ${item.api}`);
    if (!workspace.includes(item.action)) failures.push(`Missing workspace action call: ${item.action}`);
    if (!workspace.includes(item.route)) failures.push(`Missing workspace route for ${item.action}: ${item.route}`);
  }

  for (const indexName of requiredIndexes) {
    if (!idempotencyMigration.includes(indexName)) failures.push(`Missing idempotency index in migration: ${indexName}`);
  }

  if (!dynamicPage.includes('generateStaticParams') || !dynamicPage.includes('operationModules.map')) {
    failures.push('Dynamic service operations page is not generated from operationModules.');
  }

  if (!adminShell.includes("module.key !== 'receipts'")) {
    failures.push('Receipts route should remain hidden from sidebar to preserve the confirmed left menu.');
  }

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
console.log('Checked idempotency indexes:', requiredIndexes.join(', '));
