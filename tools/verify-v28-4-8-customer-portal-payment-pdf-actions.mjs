import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const failures = [];
const exists = (file) => fs.existsSync(path.join(root, file));
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const assert = (ok, msg) => { if (!ok) failures.push(msg); };
const must = (content, marker, label) => assert(content.includes(marker), `${label} missing ${marker}`);

const downloadApiFile = 'app/api/customer-portal/documents/download/route.ts';
const paymentApiFile = 'app/api/customer-portal/payments/open-checkout/route.ts';
const recordsUiFile = 'components/CustomerPortalRecordsOverview.tsx';
const packageFile = 'package.json';

for (const file of [downloadApiFile, paymentApiFile, recordsUiFile, packageFile]) assert(exists(file), `Missing file: ${file}`);

if (!failures.length) {
  const downloadApi = read(downloadApiFile);
  const paymentApi = read(paymentApiFile);
  const recordsUi = read(recordsUiFile);
  const pkg = read(packageFile);

  must(downloadApi, "ALLOWED_ROLES = ['customer']", 'download API customer role');
  must(downloadApi, 'requireActorApi', 'download API auth');
  must(downloadApi, "eq('visible_to_customer', true)", 'download API visible filter');
  must(downloadApi, 'createSignedUrl', 'download API signed URL');
  must(downloadApi, 'customer_portal_document_download_link_create', 'download API audit');
  must(downloadApi, 'ownsDocument', 'download API ownership');

  must(paymentApi, "ALLOWED_ROLES = ['customer']", 'payment API customer role');
  must(paymentApi, 'requireActorApi', 'payment API auth');
  must(paymentApi, "eq('visible_to_customer', true)", 'payment API visible filter');
  must(paymentApi, 'safePaymentUrl', 'payment API HTTPS guard');
  must(paymentApi, 'customer_portal_payment_link_open', 'payment API audit');

  must(recordsUi, '/api/customer-portal/documents/download', 'records UI download API call');
  must(recordsUi, '/api/customer-portal/payments/open-checkout', 'records UI payment API call');
  must(recordsUi, 'Download Quotation PDF', 'records UI quotation PDF');
  must(recordsUi, 'Download Invoice PDF', 'records UI invoice PDF');
  must(recordsUi, 'Download Warranty PDF', 'records UI warranty PDF');
  must(recordsUi, 'Pay Invoice', 'records UI payment action');
  must(recordsUi, 'filtered by your linked customer profile', 'legacy marker');

  must(pkg, 'verify:v28-4-8-customer-portal-payment-pdf-actions', 'package script');
  must(pkg, 'verify-v28-4-8-customer-portal-payment-pdf-actions.mjs', 'package verifier');
}

console.log(JSON.stringify({ ok: failures.length === 0, verifier: 'verify-v28-4-8-customer-portal-payment-pdf-actions', failures }, null, 2));
if (failures.length) process.exit(1);
