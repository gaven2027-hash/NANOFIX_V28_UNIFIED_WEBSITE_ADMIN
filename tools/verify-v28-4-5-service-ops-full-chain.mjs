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

  must(route, "requireActorApi", 'Full-chain API auth guard');
  must(route, "READ_ROLES", 'Full-chain API role guard');
  must(route, "service_requests", 'Full-chain API service request source');
  must(route, "jobs", 'Full-chain API job source');
  must(route, "quotations", 'Full-chain API quotation source');
  must(route, "invoices", 'Full-chain API invoice source');
  must(route, "payments", 'Full-chain API payment source');
  must(route, "warranties", 'Full-chain API warranty source');
  must(route, "status_transition_logs", 'Full-chain API status log source');
  must(route, "service_operations_full_chain_read", 'Full-chain API audit action');
  must(route, "writeAuditLog", 'Full-chain API audit write');
  must(route, "buildChains", 'Full-chain API chain builder');
  must(route, "orphan_jobs", 'Full-chain API orphan job reporting');
  assert(!/\.insert\s*\(|\.update\s*\(|\.upsert\s*\(|\.delete\s*\(|\.rpc\s*\(/.test(route), 'Full-chain API must remain read-only for business records.');

  must(component, "/api/admin/service-operations/full-chain", 'Full-chain workspace guarded API call');
  must(component, "Service Request → Job → Quotation → Invoice → Payment → Warranty", 'Full-chain workspace chain title');
  must(component, "bg-activeBlue", 'Full-chain workspace admin blue style');
  must(component, "blocked or not connected", 'Full-chain workspace fail-closed message');
  assert(!component.includes('fake success'), 'Full-chain workspace must not show fake success.');

  must(page, "ServiceOperationsFullChainWorkspace", 'Service Operations page import/mount');
  assert(page.indexOf('<ServiceOperationsLiveCore />') < page.indexOf('<ServiceOperationsFullChainWorkspace />'), 'Full-chain workspace should mount after live core.');

  must(pkg, "verify:v28-4-5-service-ops-full-chain", 'package script');
  must(pkg, "verify-v28-4-5-service-ops-full-chain.mjs", 'package script target');
  must(pkg, "npm run verify:v28-4-5-service-ops-full-chain", 'validate predeploy gate');
}

console.log(JSON.stringify({ ok: failures.length === 0, verifier: 'verify-v28-4-5-service-ops-full-chain', failures }, null, 2));
if (failures.length) process.exit(1);