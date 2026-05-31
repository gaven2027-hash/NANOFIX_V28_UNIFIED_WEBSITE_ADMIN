import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const failures = [];
const exists = (file) => fs.existsSync(path.join(root, file));
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const assert = (ok, message) => { if (!ok) failures.push(message); };
const must = (content, marker, label) => assert(content.includes(marker), `${label} missing marker: ${marker}`);
const no = (content, pattern, label) => assert(!pattern.test(content), `${label} contains prohibited pattern: ${pattern}`);

const files = [
  'app/api/customer-portal/financial/route.ts',
  'app/api/customer-portal/quote-acceptance/route.ts',
  'components/CustomerPortalFinancialOverview.tsx',
  'package.json'
];
for (const file of files) assert(exists(file), `Missing file: ${file}`);

if (!failures.length) {
  const financialApi = read('app/api/customer-portal/financial/route.ts');
  const quoteApi = read('app/api/customer-portal/quote-acceptance/route.ts');
  const financialUi = read('components/CustomerPortalFinancialOverview.tsx');
  const pkg = read('package.json');

  for (const marker of [
    "const ALLOWED_ROLES = ['customer'",
    'requireActorApi',
    'customerIdsForProfile',
    '.eq(\'profile_id\', profileId)',
    '.eq(\'account_status\', \'active\')',
    'jobIdsForCustomers',
    '.in(\'customer_id\', customerIds)',
    '.in(\'job_id\', jobIds)',
    '.eq(\'visible_to_customer\', true)',
    'quotations',
    'invoices',
    'payments',
    'warranties',
    'warranty_pdf_documents',
    'createSignedUrl',
    'customer_portal_financial_read',
    'writeAuditLog',
    'export async function GET'
  ]) must(financialApi, marker, 'Customer portal financial API');

  for (const prohibited of [
    /select\(['"]\*['"]\)/,
    /export\s+async\s+function\s+(POST|PATCH|PUT|DELETE)/,
    /localStorage|sessionStorage/,
    /x-customer-id|x-profile-id|x-nanofix-customer/i
  ]) no(financialApi, prohibited, 'Customer portal financial API');

  for (const marker of [
    'loadVisibleOwnedQuotation',
    'customerIdsForProfile',
    'jobIdsForCustomers',
    'visible_to_customer',
    'quotation_acceptances',
    'payment_intents',
    'customer_portal_quote_acceptance_submit',
    'writeAuditLog',
    'export async function POST'
  ]) must(quoteApi, marker, 'Customer quote acceptance API');

  for (const prohibited of [
    /select\(['"]\*['"]\)/,
    /localStorage|sessionStorage/,
    /x-customer-id|x-profile-id|x-nanofix-customer/i
  ]) no(quoteApi, prohibited, 'Customer quote acceptance API');

  for (const marker of [
    '/api/customer-portal/financial?limit=20',
    '/api/customer-portal/quote-acceptance',
    'Accept Quote / 同意报价',
    'Request Revision / 要求修改',
    'Decline / 不同意',
    'cannot edit quotation, invoice, warranty or payment content',
    'Only customer-visible quotations, invoices, warranties and payments linked to your own NANOFIX records are shown',
    'PDF',
    'Pay Now / 立即付款',
    "credentials: 'same-origin'",
    "cache: 'no-store'"
  ]) must(financialUi, marker, 'Customer portal financial UI');

  for (const prohibited of [
    /fetch\(['"]\/api\/admin\//,
    /method:\s*['"](PATCH|PUT|DELETE)['"]/,
    /localStorage|sessionStorage/,
    /Edit\s+(Quotation|Invoice|Warranty|Payment)|修改(报价|发票|保修|付款)/i
  ]) no(financialUi, prohibited, 'Customer portal financial UI');

  must(pkg, 'verify:customer-portal-financial-security', 'package.json');
  must(pkg, 'verify-customer-portal-financial-security.mjs', 'package.json');
  must(pkg, 'npm run verify:customer-portal-financial-security', 'validate:predeploy');
}

console.log(JSON.stringify({ ok: failures.length === 0, verifier: 'verify-customer-portal-financial-security', failures }, null, 2));
if (failures.length) process.exit(1);
