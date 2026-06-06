import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const failures = [];
const file = (p) => path.join(root, p);
const read = (p) => fs.readFileSync(file(p), 'utf8');
const check = (ok, msg) => { if (!ok) failures.push(msg); };
const has = (body, text, msg) => check(body.includes(text), msg);

const apiFile = 'app/api/customer-portal/activity-timeline/route.ts';
const uiFile = 'components/CustomerPortalActivityTimeline.tsx';
const pageFile = 'app/customer-portal/records/page.tsx';
const pkgFile = 'package.json';

for (const p of [apiFile, uiFile, pageFile, pkgFile]) check(fs.existsSync(file(p)), `missing ${p}`);

if (!failures.length) {
  const api = read(apiFile);
  const ui = read(uiFile);
  const page = read(pageFile);
  const pkg = read(pkgFile);
  has(api, 'payment_status_summary', 'api summary missing');
  has(api, 'activity_timeline', 'api timeline missing');
  has(api, 'visible_to_customer', 'api visibility missing');
  has(api, 'buildPaymentStatusSummary', 'api payment builder missing');
  has(api, 'payableInvoices', 'api payable invoice filter missing');
  has(api, 'payablePaidAmount', 'api payable paid amount filter missing');
  has(api, 'invoiceTotal - payablePaidAmount', 'api outstanding amount must subtract payable paid amount');
  has(api, 'written_off', 'api written_off invoice exclusion missing');
  has(api, 'reversed', 'api reversed invoice exclusion missing');
  has(ui, '/api/customer-portal/activity-timeline', 'ui fetch missing');
  has(ui, 'Real Payment Status + Document Activity', 'ui heading missing');
  has(ui, 'outstanding_amount', 'ui outstanding missing');
  has(page, 'CustomerPortalActivityTimeline', 'page render missing');
  has(pkg, 'verify:v28-4-9-customer-payment-status-document-timeline', 'script missing');
}

console.log(JSON.stringify({ ok: failures.length === 0, verifier: 'verify-v28-4-9-customer-payment-status-document-timeline', failures }, null, 2));
if (failures.length) process.exit(1);
