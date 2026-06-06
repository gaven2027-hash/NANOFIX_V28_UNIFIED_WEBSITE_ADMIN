import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const failures = [];
const exists = (file) => fs.existsSync(path.join(root, file));
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const assert = (ok, msg) => { if (!ok) failures.push(msg); };
const must = (content, marker, label) => assert(content.includes(marker), `${label} missing ${marker}`);

const responseApiFile = 'app/api/customer-portal/quotations/respond/route.ts';
const recordsApiFile = 'app/api/customer-portal/records/route.ts';
const recordsUiFile = 'components/CustomerPortalRecordsOverview.tsx';
const packageFile = 'package.json';

for (const file of [responseApiFile, recordsApiFile, recordsUiFile, packageFile]) {
  assert(exists(file), `Missing file: ${file}`);
}

if (!failures.length) {
  const responseApi = read(responseApiFile);
  const recordsApi = read(recordsApiFile);
  const recordsUi = read(recordsUiFile);
  const pkg = read(packageFile);

  must(responseApi, "requireActorApi", "Customer quotation response API auth guard");
  must(responseApi, "ALLOWED_ROLES = ['customer']", "Customer quotation response API customer-only role");
  must(responseApi, "quotation_customer_responses", "Customer quotation response insert table");
  must(responseApi, "customer_accepted", "Customer quotation accept status");
  must(responseApi, "customer_revision_requested", "Customer quotation revision status");
  must(responseApi, "customer_declined", "Customer quotation decline status");
  must(responseApi, "status_transition_logs", "Customer quotation status transition log");
  must(responseApi, "customer_portal_quotation_response_create", "Customer quotation audit action");
  must(responseApi, "resolveQuotationOwner", "Customer quotation ownership resolver");
  must(responseApi, ".eq('visible_to_customer', true)", "Customer quotation visibility guard");

  must(recordsApi, ".eq('visible_to_customer', true)", "Customer records visible-to-customer filters");
  must(recordsApi, "customer_visible_filter: true", "Customer records audit visible filter marker");
  must(recordsApi, "approval_status,visible_to_customer", "Customer records quotation status and visibility select");

  must(recordsUi, "/api/customer-portal/quotations/respond", "Customer portal quotation response API call");
  must(recordsUi, "Accept Quote", "Customer portal accept quote action");
  must(recordsUi, "Request Revision", "Customer portal request revision action");
  must(recordsUi, "Decline", "Customer portal decline quote action");
  must(recordsUi, "QuotationActions", "Customer portal quotation actions component");

  must(pkg, "verify:v28-4-7-customer-portal-real-actions", "package V28.4.7 script");
  must(pkg, "verify-v28-4-7-customer-portal-real-actions.mjs", "package V28.4.7 verifier file");
  must(pkg, "npm run verify:v28-4-7-customer-portal-real-actions", "validate predeploy includes V28.4.7 gate");
}

console.log(JSON.stringify({ ok: failures.length === 0, verifier: 'verify-v28-4-7-customer-portal-real-actions', failures }, null, 2));
if (failures.length) process.exit(1);