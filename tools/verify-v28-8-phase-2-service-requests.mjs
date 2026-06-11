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

const publicServiceRequestApi = read('app/api/public/service-requests/route.ts');
const customerPortalServiceRequestApi = read('app/api/customer-portal/service-requests/route.ts');
const adminServiceOperationsApi = read('app/api/admin/service-operations/route.ts');
const serviceOperationsLiveCore = read('components/ServiceOperationsLiveCore.tsx');
const readyEndpoint = read('app/api/ready/route.ts');
const baselineDoc = read('docs/v28.8/phase-2-service-requests-real-module-baseline.md');
const packageJson = read('package.json');

console.log('\nV28.8 Phase 2 Service Requests real module verification');
console.log('-------------------------------------------------------');

must(Boolean(baselineDoc), 'Phase 2 Service Requests baseline document exists');
must(baselineDoc.includes('Public website request chain') && baselineDoc.includes('Customer Portal request chain') && baselineDoc.includes('Admin Service Operations chain'), 'Baseline document covers public, customer portal and admin chains');
must(baselineDoc.includes('unified_intake') && baselineDoc.includes('leads') && baselineDoc.includes('service_requests'), 'Baseline document locks unified intake -> lead -> service request chain');

// Public website request chain.
must(publicServiceRequestApi.includes("requestType: z.enum(['new_repair', 'warranty_claim'])"), 'Public service request API accepts new_repair and warranty_claim');
must(publicServiceRequestApi.includes('name: z.string().trim().min(1)') && publicServiceRequestApi.includes('phone: z.string().trim().min(6)'), 'Public service request API requires name and phone');
must(publicServiceRequestApi.includes('estimatePriority') && publicServiceRequestApi.includes("return 'P0'") && publicServiceRequestApi.includes("return 'P1'"), 'Public service request API estimates priority');
must(publicServiceRequestApi.includes('createSupabaseAdminClient') && publicServiceRequestApi.includes('Supabase is not configured'), 'Public service request API refuses fake success when Supabase is unavailable');
must(publicServiceRequestApi.includes("from('unified_intake')") && publicServiceRequestApi.includes("from('leads')") && publicServiceRequestApi.includes("from('service_requests')"), 'Public service request API writes unified_intake, leads and service_requests');
must(publicServiceRequestApi.includes('intakeId') && publicServiceRequestApi.includes('leadId') && publicServiceRequestApi.includes('serviceRequestId'), 'Public service request API returns real intake/lead/service request identifiers');
must(publicServiceRequestApi.includes('bindingStatus') && publicServiceRequestApi.includes('priority'), 'Public service request API returns binding status and priority');
must(publicServiceRequestApi.includes('writeAuditLog') && publicServiceRequestApi.includes('public_service_request_alias_create'), 'Public service request API writes audit log');

// Customer Portal request chain.
must(customerPortalServiceRequestApi.includes("const CUSTOMER_ROLES = ['customer']"), 'Customer portal service request API is customer-role only');
must(customerPortalServiceRequestApi.includes('requireActorApi(request, [...CUSTOMER_ROLES])'), 'Customer portal service request API requires authenticated customer actor');
must(customerPortalServiceRequestApi.includes('activeCustomerForProfile') && customerPortalServiceRequestApi.includes('Active linked customer profile is required'), 'Customer portal service request API requires active linked customer profile');
must(customerPortalServiceRequestApi.includes(".eq('customer_id', customer.customer_id)") && customerPortalServiceRequestApi.includes(".eq('request_origin', 'customer_portal')"), 'Customer portal GET lists only customer-owned portal requests');
must(customerPortalServiceRequestApi.includes('warrantyBelongsToCustomer') && customerPortalServiceRequestApi.includes('Warranty not found or not linked to this customer'), 'Customer portal warranty repair validates warranty ownership');
must(customerPortalServiceRequestApi.includes('normalizeServiceAttachmentUrls') && customerPortalServiceRequestApi.includes('Only NANOFIX Supabase Storage attachment URLs are accepted'), 'Customer portal validates attachment URLs');
must(customerPortalServiceRequestApi.includes("from('unified_intake')") && customerPortalServiceRequestApi.includes("from('leads')") && customerPortalServiceRequestApi.includes("from('service_requests')"), 'Customer portal writes unified_intake, leads and service_requests');
must(customerPortalServiceRequestApi.includes('createCustomerPortalTaskAndInbox') && customerPortalServiceRequestApi.includes("from('unified_tasks')") && customerPortalServiceRequestApi.includes("from('internal_inbox_messages')"), 'Customer portal creates unified task and internal inbox entry');
must(customerPortalServiceRequestApi.includes('queueCustomerConfirmation') && customerPortalServiceRequestApi.includes("from('notification_outbox')"), 'Customer portal queues customer confirmation notification');
must(customerPortalServiceRequestApi.includes('customer_portal_service_request_submit_to_unified_queue'), 'Customer portal writes service request submission audit log');

// Admin Service Operations chain.
must(adminServiceOperationsApi.includes("const READ_ROLES = ['super_admin', 'operations_admin', 'finance', 'support', 'engineer']"), 'Admin Service Operations read roles include engineer but not customer');
must(adminServiceOperationsApi.includes("const WRITE_ROLES = ['super_admin', 'operations_admin', 'finance', 'support']"), 'Admin Service Operations write roles exclude engineer/customer for general writes');
must(adminServiceOperationsApi.includes("key: 'service_requests'") && adminServiceOperationsApi.includes("table: 'service_requests'") && adminServiceOperationsApi.includes('request_origin') && adminServiceOperationsApi.includes('portal_attachment_urls'), 'Admin Service Operations reads service request operational fields');
must(adminServiceOperationsApi.includes("service_request: ['customer_id'") && adminServiceOperationsApi.includes('admin_approval_required'), 'Admin Service Operations has service_request write whitelist');
must(adminServiceOperationsApi.includes("if (machine === 'service_request') return") && adminServiceOperationsApi.includes("request_origin: 'admin'"), 'Admin Service Operations can create admin-origin service requests');
must(adminServiceOperationsApi.includes('service_operations_live_core_detail_read'), 'Admin Service Operations supports detail read with audit');
must(adminServiceOperationsApi.includes('service_operations_live_core_record_create'), 'Admin Service Operations supports create with audit');
must(adminServiceOperationsApi.includes('service_operations_live_core_record_update'), 'Admin Service Operations supports update with audit');
must(adminServiceOperationsApi.includes("rpc('transition_status_tx'") && adminServiceOperationsApi.includes('service_operations_live_core_status_patch'), 'Admin Service Operations uses transaction RPC for status transitions and audits the action');

// Admin UI chain.
must(serviceOperationsLiveCore.includes("key: 'service_requests'") && serviceOperationsLiveCore.includes('Service Requests') && serviceOperationsLiveCore.includes('报修请求'), 'Service Operations UI exposes Service Requests group');
must(serviceOperationsLiveCore.includes("fetch('/api/admin/service-operations?limit=12'") && serviceOperationsLiveCore.includes("method: 'POST'") && serviceOperationsLiveCore.includes("method: 'PATCH'"), 'Service Operations UI reads, creates and patches through guarded admin API');
must(serviceOperationsLiveCore.includes('fetchDetail') && serviceOperationsLiveCore.includes('patchStatus') && serviceOperationsLiveCore.includes('patchUpdate'), 'Service Operations UI supports detail, status and field update flows');
must(serviceOperationsLiveCore.includes('degraded') && serviceOperationsLiveCore.includes('errors'), 'Service Operations UI has degraded/error state handling');

// Production readiness chain.
for (const table of ['unified_intake','leads','service_requests','customers','jobs','quotations','invoices','payments','warranties','warranty_claims','unified_tasks','task_events','status_transition_logs','audit_logs']) {
  must(readyEndpoint.includes(`"${table}"`), `/api/ready checks core Service Request chain table ${table}`);
}
for (const table of ['notification_outbox','internal_inbox_messages','customer_record_links']) {
  must(readyEndpoint.includes(`"${table}"`), `/api/ready checks optional Service Request support table ${table}`);
}
must(readyEndpoint.includes('failed_core_tables') && readyEndpoint.includes('failed_optional_tables'), '/api/ready exposes failed core and optional tables');

must(packageJson.includes('"verify:v28-8-phase-2-service-requests"'), 'package.json exposes V28.8 Phase 2 Service Requests verifier');
warn(packageJson.includes('"verify:v28-8-phase-1"'), 'V28.8 Phase 1 verifier remains available');

if (failures.length) {
  console.error(`\nV28.8 Phase 2 Service Requests verification failed: ${failures.length} issue(s).`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(JSON.stringify({
  ok: true,
  verifier: 'verify-v28-8-phase-2-service-requests',
  failures,
  warnings,
  checked: {
    publicWebsiteServiceRequestChain: true,
    customerPortalServiceRequestChain: true,
    adminServiceOperationsChain: true,
    serviceOperationsUiChain: true,
    productionReadyEndpointTables: true
  }
}, null, 2));
