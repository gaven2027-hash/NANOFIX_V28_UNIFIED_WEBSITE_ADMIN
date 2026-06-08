import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const failures = [];
const exists = (file) => fs.existsSync(path.join(root, file));
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const assert = (ok, msg) => { if (!ok) failures.push(msg); };
const must = (content, marker, label) => assert(content.includes(marker), `${label} missing ${marker}`);

const routeFile = 'app/api/admin/service-operations/full-chain/route.ts';
const componentFile = 'components/ServiceOperationsFullChainWorkspace.tsx';
const pageFile = 'app/service-operations/page.tsx';
const packageFile = 'package.json';

for (const file of [routeFile, componentFile, pageFile, packageFile]) {
  assert(exists(file), `Missing file: ${file}`);
}

if (!failures.length) {
  const route = read(routeFile);
  const component = read(componentFile);
  const page = read(pageFile);
  const pkg = read(packageFile);

  must(route, 'requireActorApi', 'Full-chain API auth guard');
  must(route, 'READ_ROLES', 'Full-chain API role guard');
  must(route, 'service_requests', 'Full-chain API service request source');
  must(route, 'jobs', 'Full-chain API job source');
  must(route, 'quotations', 'Full-chain API quotation source');
  must(route, 'quotation_id,service_request_id,customer_id,version,total_amount,currency,status', 'Full-chain API production quotation select');
  must(route, "equalsId(quotation.service_request_id, serviceRequestId)", 'Full-chain API direct service-request quotation linkage');
  must(route, 'invoices', 'Full-chain API invoice source');
  must(route, 'invoice_id,invoice_no,customer_id,job_id,quotation_id,total_amount,currency,status', 'Full-chain API production invoice select');
  must(route, 'payments', 'Full-chain API payment source');
  must(route, 'payment_id,invoice_id,customer_id,amount,currency,status,reconciled_at,created_at', 'Full-chain API production payment select');
  must(route, 'warranties', 'Full-chain API warranty source');
  must(route, 'warranty_id,job_id,customer_id,invoice_id,quotation_id,status,coverage,starts_on,ends_on', 'Full-chain API production warranty select');
  must(route, 'status_transition_logs', 'Full-chain API status log source');
  must(route, 'service_operations_full_chain_read', 'Full-chain API audit action');
  must(route, 'writeAuditLog', 'Full-chain API audit write');
  must(route, 'buildChains', 'Full-chain API chain builder');
  must(route, 'orphan_jobs', 'Full-chain API orphan job reporting');
  must(route, 'fetchKnownServiceRequestIds', 'Full-chain API database-backed service request reference check');
  must(route, ".in('service_request_id', missingIds)", 'Full-chain API validates out-of-window service request references before orphan reporting');
  assert(!route.includes('quotation_id,job_id,service_request_id,current_version,total,approval_status'), 'Full-chain API must not select deprecated quotation columns.');
  assert(!route.includes('invoice_id,invoice_no,job_id,total,status'), 'Full-chain API must not select deprecated invoice total column.');
  assert(!route.includes('payment_id,invoice_id,amount,status,fee'), 'Full-chain API must not select deprecated payment fee column.');
  assert(!route.includes('starts_at,ends_at'), 'Full-chain API must use starts_on/ends_on warranty columns.');
  assert(!/\.insert\s*\(|\.update\s*\(|\.upsert\s*\(|\.delete\s*\(|\.rpc\s*\(/.test(route), 'Full-chain API must remain read-only for business records.');

  must(component, '/api/admin/service-operations/full-chain', 'Full-chain workspace guarded API call');
  must(component, 'Service Request', 'Full-chain workspace service request marker');
  must(component, 'Job', 'Full-chain workspace job marker');
  must(component, 'Quotation', 'Full-chain workspace quotation marker');
  must(component, 'Invoice', 'Full-chain workspace invoice marker');
  must(component, 'Payment', 'Full-chain workspace payment marker');
  must(component, 'Warranty', 'Full-chain workspace warranty marker');
  must(component, 'bg-activeBlue', 'Full-chain workspace admin blue style');
  must(component, 'blocked or not connected', 'Full-chain workspace fail-closed message');
  assert(!component.includes('fake success'), 'Full-chain workspace must not show fake success.');

  must(page, 'ServiceOperationsFullChainWorkspace', 'Service Operations page import/mount');
  assert(page.indexOf('<ServiceOperationsLiveCore />') < page.indexOf('<ServiceOperationsFullChainWorkspace />'), 'Full-chain workspace should mount after live core.');

  must(pkg, 'verify:v28-4-5-service-ops-full-chain', 'package script');
  must(pkg, 'verify-v28-4-5-service-ops-full-chain.mjs', 'package script target');
  must(pkg, 'npm run verify:v28-4-5-service-ops-full-chain', 'validate predeploy gate');
}

console.log(JSON.stringify({ ok: failures.length === 0, verifier: 'verify-v28-4-5-service-ops-full-chain', failures }, null, 2));
if (failures.length) process.exit(1);
