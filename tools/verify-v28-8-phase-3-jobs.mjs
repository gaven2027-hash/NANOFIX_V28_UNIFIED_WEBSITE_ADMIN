#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs';

const failures = [];
const warnings = [];

function read(path) {
  return existsSync(path) ? readFileSync(path, 'utf8') : '';
}

function must(ok, label) {
  console.log(`${ok ? '✅' : '❌'} ${label}`);
  if (!ok) failures.push(label);
}

function warn(ok, label) {
  console.log(`${ok ? '✅' : '⚠️'} ${label}`);
  if (!ok) warnings.push(label);
}

const auth = read('lib/nanofix/auth.ts');
const adminServiceOperationsApi = read('app/api/admin/service-operations/route.ts');
const fullChainApi = read('app/api/admin/service-operations/full-chain/route.ts');
const serviceOperationsLiveCore = read('components/ServiceOperationsLiveCore.tsx');
const readyEndpoint = read('app/api/ready/route.ts');
const baselineDoc = read('docs/v28.8/phase-3-jobs-real-module-baseline.md');
const packageJson = read('package.json');

console.log('\nV28.8 Phase 3 Jobs real module verification');
console.log('---------------------------------------------');

must(Boolean(baselineDoc), 'Phase 3 Jobs baseline document exists');
must(baselineDoc.includes('Jobs Real Module Baseline') && baselineDoc.includes('Engineer boundary baseline'), 'Baseline document covers Jobs and engineer boundary');
must(baselineDoc.includes('Service Request / 报修单') && baselineDoc.includes('Job / 工单'), 'Baseline document locks Service Request -> Job chain');

// RBAC engineer boundary.
must(auth.includes('engineer: ["read:operations", "write:operations", "job.assigned.read", "job.assigned.update"'), 'RBAC map keeps engineer assigned-job permissions');
must(auth.includes('job.assigned.read') && auth.includes('job.assigned.update'), 'Engineer assigned-job read/update permissions remain present');
must(auth.includes('customer: ["customer.portal.read", "customer.portal.write"]'), 'Customer remains restricted to customer portal permissions');

// Admin Service Operations Jobs chain.
must(adminServiceOperationsApi.includes("'job'") && adminServiceOperationsApi.includes("const MACHINES = ['lead', 'service_request', 'inspection', 'quotation', 'job'"), 'Admin Service Operations supports job machine');
must(adminServiceOperationsApi.includes("key: 'jobs'") && adminServiceOperationsApi.includes("machine: 'job'") && adminServiceOperationsApi.includes("table: 'jobs'"), 'Admin Service Operations reads jobs table');
must(adminServiceOperationsApi.includes('job_id,service_request_id,quotation_id,customer_id,engineer_id,status,scheduled_at,notes,created_at,updated_at'), 'Admin Service Operations selects required job fields');
must(adminServiceOperationsApi.includes("job: ['service_request_id', 'quotation_id', 'customer_id', 'engineer_id', 'status', 'scheduled_at', 'notes']"), 'Admin Service Operations has job write whitelist');
must(adminServiceOperationsApi.includes("const READ_ROLES = ['super_admin', 'operations_admin', 'finance', 'support', 'engineer']"), 'Admin Service Operations read roles include engineer');
must(adminServiceOperationsApi.includes("const WRITE_ROLES = ['super_admin', 'operations_admin', 'finance', 'support']"), 'Admin Service Operations general write roles exclude engineer and customer');
must(adminServiceOperationsApi.includes("if (machine === 'job') return { status: 'assigned', notes, ...base }"), 'Admin Service Operations can create guarded admin job records');
must(adminServiceOperationsApi.includes('Valid object_id UUID is required'), 'Admin Service Operations requires valid UUID for update/status operations');
must(adminServiceOperationsApi.includes('service_operations_live_core_detail_read'), 'Admin Service Operations audits job detail reads through shared detail flow');
must(adminServiceOperationsApi.includes('service_operations_live_core_record_create'), 'Admin Service Operations audits job creates through shared create flow');
must(adminServiceOperationsApi.includes('service_operations_live_core_record_update'), 'Admin Service Operations audits job updates through shared update flow');
must(adminServiceOperationsApi.includes("rpc('transition_status_tx'") && adminServiceOperationsApi.includes('service_operations_live_core_status_patch'), 'Admin Service Operations uses transaction RPC for job status transitions');
must(adminServiceOperationsApi.includes('writeStatusTransitionLog'), 'Admin Service Operations writes status transition logs for create/update flows');

// Service Operations UI Jobs chain.
must(serviceOperationsLiveCore.includes("key: 'jobs'") && serviceOperationsLiveCore.includes('Jobs') && serviceOperationsLiveCore.includes('工单'), 'Service Operations UI exposes Jobs group');
must(serviceOperationsLiveCore.includes("machine: 'job'") && serviceOperationsLiveCore.includes("idField: 'job_id'") && serviceOperationsLiveCore.includes("nextStatus: 'en_route'"), 'Service Operations UI locks job machine, id and next status');
must(serviceOperationsLiveCore.includes('postCreate(active.machine)') && serviceOperationsLiveCore.includes('patchStatus(active.machine') && serviceOperationsLiveCore.includes('patchUpdate(active, row)'), 'Service Operations UI supports job create/status/update through shared flows');
must(serviceOperationsLiveCore.includes("fetch('/api/admin/service-operations?limit=12'") && serviceOperationsLiveCore.includes('fetchDetail'), 'Service Operations UI reads list and detail through guarded admin API');
must(serviceOperationsLiveCore.includes('degraded') && serviceOperationsLiveCore.includes('errors'), 'Service Operations UI keeps degraded/error handling');

// Full-chain Jobs baseline.
must(fullChainApi.includes("'jobs', 'jobs'") && fullChainApi.includes('job_id,service_request_id,quotation_id,customer_id,engineer_id,status,scheduled_at,notes,created_at,updated_at'), 'Full-chain API reads jobs with required fields');
must(fullChainApi.includes('const linkedJobs = jobs.filter((job) => equalsId(job.service_request_id, serviceRequestId))'), 'Full-chain API links jobs to service requests by service_request_id');
must(fullChainApi.includes('linkedJobIds.has(String(invoice.job_id') && fullChainApi.includes('linkedJobIds.has(String(warranty.job_id'), 'Full-chain API links invoice/warranty through job_id');
must(fullChainApi.includes('orphan_jobs') && fullChainApi.includes('fetchKnownServiceRequestIds'), 'Full-chain API reports orphan jobs and validates service request references');
must(fullChainApi.includes(".in('service_request_id', missingIds)"), 'Full-chain API validates out-of-window service request references');
must(fullChainApi.includes('service_operations_full_chain_read') && fullChainApi.includes('writeAuditLog'), 'Full-chain API writes read audit log');
must(!/\.insert\s*\(|\.update\s*\(|\.upsert\s*\(|\.delete\s*\(|\.rpc\s*\(/.test(fullChainApi), 'Full-chain API remains read-only for business records');

// Production readiness chain.
for (const table of ['service_requests','jobs','service_inspections','service_upload_reviews','quotations','invoices','payments','warranties','status_transition_logs','audit_logs']) {
  must(readyEndpoint.includes(`"${table}"`), `/api/ready checks Jobs chain table ${table}`);
}
for (const table of ['internal_inbox_messages','notification_outbox']) {
  must(readyEndpoint.includes(`"${table}"`), `/api/ready checks optional Jobs support table ${table}`);
}
must(readyEndpoint.includes('failed_core_tables') && readyEndpoint.includes('failed_optional_tables'), '/api/ready exposes failed core and optional tables');

must(packageJson.includes('"verify:v28-8-phase-3-jobs"'), 'package.json exposes V28.8 Phase 3 Jobs verifier');
warn(packageJson.includes('"verify:v28-8-phase-2-service-requests"'), 'V28.8 Phase 2 Service Requests verifier remains available');

if (failures.length) {
  console.error(`\nV28.8 Phase 3 Jobs verification failed: ${failures.length} issue(s).`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(JSON.stringify({
  ok: true,
  verifier: 'verify-v28-8-phase-3-jobs',
  failures,
  warnings,
  checked: {
    rbacEngineerBoundary: true,
    adminServiceOperationsJobsChain: true,
    serviceOperationsUiJobsChain: true,
    fullChainJobsLinkage: true,
    productionReadyEndpointTables: true
  }
}, null, 2));
