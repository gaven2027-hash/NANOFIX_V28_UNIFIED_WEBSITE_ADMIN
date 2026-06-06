import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const failures = [];
const exists = (file) => fs.existsSync(path.join(root, file));
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const assert = (ok, msg) => { if (!ok) failures.push(msg); };
const must = (content, marker, label) => assert(content.includes(marker), `${label} missing ${marker}`);

const adminApiFile = 'app/api/admin/customer-service-linkage/route.ts';
const customerRecordsApiFile = 'app/api/customer-portal/records/route.ts';
const customerRecordsUiFile = 'components/CustomerPortalRecordsOverview.tsx';
const linkageComponentFile = 'components/CustomerServiceLinkageWorkspace.tsx';
const customerCenterPageFile = 'app/customer-center/page.tsx';
const packageFile = 'package.json';

for (const file of [adminApiFile, customerRecordsApiFile, customerRecordsUiFile, linkageComponentFile, customerCenterPageFile, packageFile]) {
  assert(exists(file), `Missing file: ${file}`);
}

if (!failures.length) {
  const adminApi = read(adminApiFile);
  const customerRecordsApi = read(customerRecordsApiFile);
  const customerRecordsUi = read(customerRecordsUiFile);
  const linkageComponent = read(linkageComponentFile);
  const customerCenterPage = read(customerCenterPageFile);
  const pkg = read(packageFile);

  must(adminApi, "requireActorApi", "Admin linkage API auth guard");
  must(adminApi, "READ_ROLES", "Admin linkage API role guard");
  must(adminApi, "customers", "Admin linkage customer source");
  must(adminApi, "service_requests", "Admin linkage service request source");
  must(adminApi, "jobs", "Admin linkage jobs source");
  must(adminApi, "quotations", "Admin linkage quotations source");
  must(adminApi, "invoices", "Admin linkage invoices source");
  must(adminApi, "payments", "Admin linkage payments source");
  must(adminApi, "warranties", "Admin linkage warranties source");
  must(adminApi, "status_transition_logs", "Admin linkage status logs source");
  must(adminApi, "customer_service_linkage_read", "Admin linkage audit action");
  must(adminApi, "buildCustomerChains", "Admin linkage chain builder");
  assert(!/\.insert\s*\(|\.update\s*\(|\.upsert\s*\(|\.delete\s*\(|\.rpc\s*\(/.test(adminApi), "Admin customer-service linkage API must remain read-only for business records.");

  must(customerRecordsApi, "quotations", "Customer records API returns quotations");
  must(customerRecordsApi, "service_request_id,current_version,total", "Customer records API selects request-linked quotations");
  must(customerRecordsApi, "records.quotations.length", "Customer records API audits quotation count");

  must(customerRecordsUi, "key: 'quotations'", "Customer portal UI quotations section");
  must(customerRecordsUi, "Quotations", "Customer portal UI quotation title");
  must(customerRecordsUi, "approval_status", "Customer portal UI quotation approval status");

  must(linkageComponent, "/api/admin/customer-service-linkage", "Admin linkage workspace API call");
  must(linkageComponent, "Customer Portal ↔ Service Operations", "Admin linkage workspace title");
  must(linkageComponent, "V28.4.6 Customer", "Admin linkage workspace V28.4.6 marker");

  must(customerCenterPage, "CustomerServiceLinkageWorkspace", "Customer Center mounts linkage workspace");

  must(pkg, "verify:v28-4-6-customer-service-linkage", "package V28.4.6 script");
  must(pkg, "verify-v28-4-6-customer-service-linkage.mjs", "package V28.4.6 verifier file");
  must(pkg, "npm run verify:v28-4-6-customer-service-linkage", "validate predeploy includes V28.4.6 gate");
}

console.log(JSON.stringify({ ok: failures.length === 0, verifier: 'verify-v28-4-6-customer-service-linkage', failures }, null, 2));
if (failures.length) process.exit(1);