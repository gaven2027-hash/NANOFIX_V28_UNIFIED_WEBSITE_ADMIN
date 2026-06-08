import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const reportJson = 'V28_6_2_SERVICE_OPS_PUBLIC_RBAC_REPAIR_REPORT.json';
const reportMd = 'V28_6_2_SERVICE_OPS_PUBLIC_RBAC_REPAIR_REPORT.md';

function read(file) {
  try {
    return fs.readFileSync(path.join(root, file), 'utf8');
  } catch {
    return '';
  }
}

function has(fileText, needle) {
  return fileText.includes(needle);
}

function assertHas(findings, file, fileText, needle, code, message, priority = 'P1') {
  if (!has(fileText, needle)) findings.push({ priority, code, file, message, expected: needle });
}

function assertNotHas(findings, file, fileText, needle, code, message, priority = 'P1') {
  if (has(fileText, needle)) findings.push({ priority, code, file, message, forbidden: needle });
}

const liveCoreFile = 'app/api/admin/service-operations/route.ts';
const publicRequestFile = 'app/api/service-requests/route.ts';
const customerPortalServiceRequestFile = 'app/api/customer-portal/service-requests/route.ts';
const customerPortalActivityTimelineFile = 'app/api/customer-portal/activity-timeline/route.ts';
const globalSearchFile = 'app/api/global-search/route.ts';
const storageAttachmentFile = 'lib/storageAttachments.ts';
const apiSecurityFile = 'lib/apiSecurity.ts';
const statusTransitionFile = 'lib/statusTransition.ts';
const fullChainFile = 'app/api/admin/service-operations/full-chain/route.ts';

const liveCore = read(liveCoreFile);
const publicRequest = read(publicRequestFile);
const customerPortalServiceRequest = read(customerPortalServiceRequestFile);
const customerPortalActivityTimeline = read(customerPortalActivityTimelineFile);
const globalSearch = read(globalSearchFile);
const storageAttachment = read(storageAttachmentFile);
const apiSecurity = read(apiSecurityFile);
const statusTransition = read(statusTransitionFile);
const fullChain = read(fullChainFile);

const findings = [];

for (const file of [liveCoreFile, publicRequestFile, customerPortalServiceRequestFile, customerPortalActivityTimelineFile, globalSearchFile, storageAttachmentFile, apiSecurityFile, statusTransitionFile, fullChainFile]) {
  if (!read(file)) findings.push({ priority: 'P0', code: 'MISSING_REQUIRED_FILE', file, message: `${file} is required for V28.6 Batch A verification.` });
}

assertHas(findings, liveCoreFile, liveCore, "requireActorApi", 'LIVE_CORE_RBAC_REQUIRED', 'Service Operations Live Core must use server-side RBAC.');
assertHas(findings, liveCoreFile, liveCore, "writeAuditLog", 'LIVE_CORE_AUDIT_REQUIRED', 'Service Operations Live Core must write audit logs.');
assertHas(findings, liveCoreFile, liveCore, "writeStatusTransitionLog", 'LIVE_CORE_STATUS_LOG_HELPER_REQUIRED', 'Create/update paths must write status_transition_logs.');
assertHas(findings, liveCoreFile, liveCore, "logCreateTransition", 'LIVE_CORE_CREATE_TRANSITION_REQUIRED', 'Record creation must attempt initial lifecycle status logging.');
assertHas(findings, liveCoreFile, liveCore, "logUpdateTransition", 'LIVE_CORE_UPDATE_TRANSITION_REQUIRED', 'Record update status changes must write lifecycle status logging.');
assertHas(findings, liveCoreFile, liveCore, "statusTransitionLogged", 'LIVE_CORE_TRANSITION_RESULT_REQUIRED', 'Audit payload must record whether status transition logging actually ran.');
assertHas(findings, liveCoreFile, liveCore, "transition_status_tx", 'LIVE_CORE_RPC_TRANSITION_REQUIRED', 'Explicit status transitions must use the existing transaction RPC.');

for (const required of [
  'service_request_id,customer_id,lead_id,intake_id',
  'job_id,service_request_id,quotation_id,customer_id',
  'quotation_id,service_request_id,customer_id,version,total_amount,currency,status',
  'invoice_id,invoice_no,customer_id,job_id,quotation_id,total_amount,currency,status,visible_to_customer',
  'payment_id,invoice_id,customer_id,amount,currency,status,reconciled_at',
  'warranty_id,job_id,customer_id,invoice_id,quotation_id,status,coverage,starts_on,ends_on,visible_to_customer,public_ref',
  'transition_id,machine,object_type,object_id,from_status,to_status,reason,actor_role,created_at'
]) {
  assertHas(findings, liveCoreFile, liveCore, required, 'LIVE_CORE_PRODUCTION_SCHEMA_SELECT_REQUIRED', `Live Core must use production schema selector: ${required}`);
}

for (const forbidden of ['current_version', 'approval_status', 'starts_at', 'ends_at', "'fee'", 'total,status,created_at']) {
  assertNotHas(findings, liveCoreFile, liveCore, forbidden, 'LIVE_CORE_DEPRECATED_SCHEMA_FORBIDDEN', `Deprecated production-incompatible field must not return in Live Core: ${forbidden}`);
}

assertHas(findings, publicRequestFile, publicRequest, "unified_intake", 'PUBLIC_REQUEST_INTAKE_REQUIRED', 'Public service request must write unified_intake.');
assertHas(findings, publicRequestFile, publicRequest, "leads", 'PUBLIC_REQUEST_LEAD_REQUIRED', 'Public service request must write leads.');
assertHas(findings, publicRequestFile, publicRequest, "service_requests", 'PUBLIC_REQUEST_SERVICE_REQUEST_REQUIRED', 'Public service request must write service_requests.');
assertHas(findings, publicRequestFile, publicRequest, "writeStatusTransitionLog", 'PUBLIC_REQUEST_STATUS_LOG_REQUIRED', 'Public service request creation must log status transition.');
assertHas(findings, publicRequestFile, publicRequest, "status_transition_logged", 'PUBLIC_REQUEST_STATUS_RESULT_REQUIRED', 'Public request audit log must record actual status log result.');
assertHas(findings, publicRequestFile, publicRequest, "Supabase is not configured", 'PUBLIC_REQUEST_NO_FAKE_SUCCESS_REQUIRED', 'Public submit must fail explicitly when Supabase is not configured.');

assertHas(findings, customerPortalServiceRequestFile, customerPortalServiceRequest, "normalizeServiceAttachmentUrls", 'CUSTOMER_PORTAL_ATTACHMENT_VALIDATOR_REQUIRED', 'Customer Portal service request must validate attachment URLs.');
assertHas(findings, customerPortalServiceRequestFile, customerPortalServiceRequest, "customer_portal_service_request_attachment_rejected", 'CUSTOMER_PORTAL_ATTACHMENT_REJECTION_AUDIT_REQUIRED', 'Rejected customer attachment submissions must be audit logged.');
assertHas(findings, customerPortalServiceRequestFile, customerPortalServiceRequest, "Only NANOFIX Supabase Storage attachment URLs are accepted", 'CUSTOMER_PORTAL_ATTACHMENT_NO_FAKE_SUCCESS_REQUIRED', 'Invalid attachment URLs must fail explicitly.');
assertHas(findings, customerPortalServiceRequestFile, customerPortalServiceRequest, "starts_on,ends_on", 'CUSTOMER_PORTAL_WARRANTY_SCHEMA_REQUIRED', 'Customer Portal warranty ownership check must use production warranty date fields.');
assertNotHas(findings, customerPortalServiceRequestFile, customerPortalServiceRequest, "attachmentUrls(", 'CUSTOMER_PORTAL_RAW_ATTACHMENT_URLS_FORBIDDEN', 'Raw attachment URL passthrough must not be used.');
assertNotHas(findings, customerPortalServiceRequestFile, customerPortalServiceRequest, "starts_at,ends_at", 'CUSTOMER_PORTAL_DEPRECATED_WARRANTY_FIELDS_FORBIDDEN', 'Deprecated warranty date fields must not be used.');

assertHas(findings, customerPortalActivityTimelineFile, customerPortalActivityTimeline, "requireActorApi", 'CUSTOMER_TIMELINE_RBAC_REQUIRED', 'Customer Portal Activity Timeline must use server-side RBAC.');
assertHas(findings, customerPortalActivityTimelineFile, customerPortalActivityTimeline, "const ALLOWED_ROLES = ['customer'] as const", 'CUSTOMER_TIMELINE_CUSTOMER_ONLY_ROLE_REQUIRED', 'Customer Portal Activity Timeline must be customer-role only.');
assertHas(findings, customerPortalActivityTimelineFile, customerPortalActivityTimeline, "customerIdsForProfile", 'CUSTOMER_TIMELINE_PROFILE_TO_CUSTOMER_LOOKUP_REQUIRED', 'Timeline must resolve customer IDs from the authenticated profile.');
assertHas(findings, customerPortalActivityTimelineFile, customerPortalActivityTimeline, ".eq('profile_id', profileId)", 'CUSTOMER_TIMELINE_PROFILE_FILTER_REQUIRED', 'Timeline must filter customers by authenticated profile_id.');
assertHas(findings, customerPortalActivityTimelineFile, customerPortalActivityTimeline, "service_request_id,customer_id,status,leak_location,created_at,updated_at", 'CUSTOMER_TIMELINE_SERVICE_REQUEST_SCHEMA_REQUIRED', 'Timeline must use production service request fields.');
assertHas(findings, customerPortalActivityTimelineFile, customerPortalActivityTimeline, "job_id,service_request_id,customer_id,status,scheduled_at,created_at,updated_at", 'CUSTOMER_TIMELINE_JOB_SCHEMA_REQUIRED', 'Timeline must use production job fields.');
assertHas(findings, customerPortalActivityTimelineFile, customerPortalActivityTimeline, "quotation_id,service_request_id,customer_id,version,total_amount,currency,status,created_at,updated_at", 'CUSTOMER_TIMELINE_QUOTATION_SCHEMA_REQUIRED', 'Timeline must use production quotation fields.');
assertHas(findings, customerPortalActivityTimelineFile, customerPortalActivityTimeline, "invoice_id,invoice_no,customer_id,job_id,quotation_id,total_amount,currency,status,visible_to_customer,created_at", 'CUSTOMER_TIMELINE_INVOICE_SCHEMA_REQUIRED', 'Timeline must use production invoice fields and visible_to_customer.');
assertHas(findings, customerPortalActivityTimelineFile, customerPortalActivityTimeline, "payment_id,invoice_id,customer_id,amount,currency,status,reconciled_at,created_at", 'CUSTOMER_TIMELINE_PAYMENT_SCHEMA_REQUIRED', 'Timeline must use production payment fields.');
assertHas(findings, customerPortalActivityTimelineFile, customerPortalActivityTimeline, "warranty_id,job_id,customer_id,invoice_id,quotation_id,status,coverage,starts_on,ends_on,visible_to_customer,public_ref,created_at", 'CUSTOMER_TIMELINE_WARRANTY_SCHEMA_REQUIRED', 'Timeline must use production warranty fields.');
assertHas(findings, customerPortalActivityTimelineFile, customerPortalActivityTimeline, "customer_portal_activity_timeline_read", 'CUSTOMER_TIMELINE_AUDIT_REQUIRED', 'Timeline read must be audit logged.');
assertHas(findings, customerPortalActivityTimelineFile, customerPortalActivityTimeline, "payment_status_summary", 'CUSTOMER_TIMELINE_PAYMENT_SUMMARY_REQUIRED', 'Timeline must expose payment status summary.');
assertHas(findings, customerPortalActivityTimelineFile, customerPortalActivityTimeline, "activity_timeline", 'CUSTOMER_TIMELINE_RESPONSE_REQUIRED', 'Timeline must expose activity_timeline response.');
assertNotHas(findings, customerPortalActivityTimelineFile, customerPortalActivityTimeline, "starts_at,ends_at", 'CUSTOMER_TIMELINE_DEPRECATED_WARRANTY_FIELDS_FORBIDDEN', 'Timeline must not use deprecated warranty date fields.');
assertNotHas(findings, customerPortalActivityTimelineFile, customerPortalActivityTimeline, "invoice_id,invoice_no,total,status", 'CUSTOMER_TIMELINE_DEPRECATED_INVOICE_FIELDS_FORBIDDEN', 'Timeline must not use deprecated invoice total selector.');
assertNotHas(findings, customerPortalActivityTimelineFile, customerPortalActivityTimeline, "current_version", 'CUSTOMER_TIMELINE_DEPRECATED_QUOTATION_FIELDS_FORBIDDEN', 'Timeline must not use deprecated quotation version fields.');

assertHas(findings, storageAttachmentFile, storageAttachment, "normalizeServiceAttachmentUrls", 'STORAGE_ATTACHMENT_HELPER_REQUIRED', 'Storage attachment helper must be present.');
assertHas(findings, storageAttachmentFile, storageAttachment, "NANOFIX_ALLOWED_ATTACHMENT_BUCKETS", 'STORAGE_ATTACHMENT_BUCKET_CONFIG_REQUIRED', 'Allowed attachment buckets must be configurable.');
assertHas(findings, storageAttachmentFile, storageAttachment, "NEXT_PUBLIC_SUPABASE_URL", 'STORAGE_ATTACHMENT_SUPABASE_ORIGIN_REQUIRED', 'Storage attachment URLs must be tied to configured Supabase origins.');
assertHas(findings, storageAttachmentFile, storageAttachment, "storage/v1/object", 'STORAGE_ATTACHMENT_OBJECT_PATH_REQUIRED', 'Storage attachment helper must recognize Supabase Storage object paths.');

assertHas(findings, globalSearchFile, globalSearch, "requireAdminApi", 'GLOBAL_SEARCH_ADMIN_AUTH_REQUIRED', 'Global Search must require an internal admin actor.');
assertHas(findings, globalSearchFile, globalSearch, "SENSITIVE_BUSINESS_ROLES", 'GLOBAL_SEARCH_ROLE_SCOPE_REQUIRED', 'Global Search must define sensitive business role scope.');
assertHas(findings, globalSearchFile, globalSearch, "canSearchSensitiveBusiness", 'GLOBAL_SEARCH_SENSITIVE_GUARD_REQUIRED', 'Global Search must guard sensitive business categories.');
assertHas(findings, globalSearchFile, globalSearch, "rpcAllowed", 'GLOBAL_SEARCH_RPC_GUARD_REQUIRED', 'search_all_records RPC must be role-gated.');
assertHas(findings, globalSearchFile, globalSearch, "search_all_records", 'GLOBAL_SEARCH_RPC_REVIEW_REQUIRED', 'Global Search RPC use must remain explicit and auditable.');
assertHas(findings, globalSearchFile, globalSearch, "total_amount,currency,status", 'GLOBAL_SEARCH_INVOICE_SCHEMA_REQUIRED', 'Global Search invoices must use total_amount/currency production fields.');
assertHas(findings, globalSearchFile, globalSearch, "getClientIp", 'GLOBAL_SEARCH_IP_AUDIT_REQUIRED', 'Global Search audit log should include request IP.');
assertNotHas(findings, globalSearchFile, globalSearch, "invoice_id,invoice_no,total,status", 'GLOBAL_SEARCH_DEPRECATED_INVOICE_FIELD_FORBIDDEN', 'Global Search must not use deprecated invoice total selector.');
assertNotHas(findings, globalSearchFile, globalSearch, "completion_notes", 'GLOBAL_SEARCH_DEPRECATED_JOB_FIELD_FORBIDDEN', 'Global Search jobs must not depend on deprecated completion_notes field.');

assertHas(findings, apiSecurityFile, apiSecurity, "ALLOW_ADMIN_API_SECRET_FALLBACK", 'API_SECRET_FALLBACK_DISABLED_BY_DEFAULT_REQUIRED', 'Secret fallback must be disabled by default.');
assertHas(findings, apiSecurityFile, apiSecurity, "supabase.auth.getUser", 'API_AUTH_GET_USER_REQUIRED', 'API auth must verify Supabase token server-side.');
assertHas(findings, apiSecurityFile, apiSecurity, "profiles", 'API_PROFILE_LOOKUP_REQUIRED', 'API auth must resolve profile role from database.');
assertHas(findings, apiSecurityFile, apiSecurity, "admin_profiles", 'API_ADMIN_PROFILE_BRIDGE_REQUIRED', 'Legacy admin profile bridge must remain explicit and active-only.');

assertHas(findings, statusTransitionFile, statusTransition, "status_transition_logs", 'STATUS_TRANSITION_TABLE_REQUIRED', 'Status transition helper must write status_transition_logs.');
assertHas(findings, statusTransitionFile, statusTransition, "object_type", 'STATUS_TRANSITION_OBJECT_TYPE_REQUIRED', 'Status transition helper must use object_type.');
assertHas(findings, fullChainFile, fullChain, "quotation_id,service_request_id,customer_id,version,total_amount,currency,status", 'FULL_CHAIN_SCHEMA_ALIGNMENT_REQUIRED', 'Full-chain read API must remain production-schema aligned.');

const blocking = findings.filter((finding) => ['P0', 'P1', 'P2'].includes(finding.priority));
const ok = blocking.length === 0;

const report = {
  ok,
  verifier: 'verify-v28-6-2-service-ops-public-rbac',
  generated_at: new Date().toISOString(),
  branch: 'v28-6-2-service-ops-public-rbac-repair',
  base_memory_doc: 'docs/NANOFIX_V28_6_OA_ERP_REAL_MODULE_REPAIR_PLAN_20260608.md',
  repaired_files: [liveCoreFile, customerPortalServiceRequestFile, globalSearchFile, storageAttachmentFile],
  verified_files: [liveCoreFile, publicRequestFile, customerPortalServiceRequestFile, customerPortalActivityTimelineFile, globalSearchFile, storageAttachmentFile, apiSecurityFile, statusTransitionFile, fullChainFile],
  acceptance: {
    service_operations_live_core_schema_aligned: !findings.some((f) => f.code === 'LIVE_CORE_PRODUCTION_SCHEMA_SELECT_REQUIRED' || f.code === 'LIVE_CORE_DEPRECATED_SCHEMA_FORBIDDEN'),
    service_operations_status_logs_wired: !findings.some((f) => f.code.includes('STATUS') || f.code.includes('TRANSITION')),
    public_submit_real_chain_present: !findings.some((f) => f.code.startsWith('PUBLIC_REQUEST_')),
    customer_portal_attachment_guarded: !findings.some((f) => f.code.startsWith('CUSTOMER_PORTAL_ATTACHMENT_') || f.code.startsWith('STORAGE_ATTACHMENT_')),
    customer_portal_activity_timeline_real_chain_present: !findings.some((f) => f.code.startsWith('CUSTOMER_TIMELINE_')),
    global_search_rbac_scoped: !findings.some((f) => f.code.startsWith('GLOBAL_SEARCH_')),
    rbac_foundation_present: !findings.some((f) => f.code.startsWith('API_'))
  },
  findings
};

function md(data) {
  const lines = [
    '# NANOFIX V28.6.2 + V28.6.9 Batch A Repair Report',
    '',
    `- Verifier: \`${data.verifier}\``,
    `- Generated at: ${data.generated_at}`,
    `- Branch: \`${data.branch}\``,
    `- OK: **${data.ok}**`,
    '',
    '## Repaired Files',
    ...data.repaired_files.map((file) => `- \`${file}\``),
    '',
    '## Verified Files',
    ...data.verified_files.map((file) => `- \`${file}\``),
    '',
    '## Acceptance Snapshot',
    '',
    `- Service Operations Live Core schema aligned: ${data.acceptance.service_operations_live_core_schema_aligned}`,
    `- Service Operations status logs wired: ${data.acceptance.service_operations_status_logs_wired}`,
    `- Public submit real chain present: ${data.acceptance.public_submit_real_chain_present}`,
    `- Customer Portal attachment guarded: ${data.acceptance.customer_portal_attachment_guarded}`,
    `- Customer Portal activity timeline real chain present: ${data.acceptance.customer_portal_activity_timeline_real_chain_present}`,
    `- Global Search RBAC scoped: ${data.acceptance.global_search_rbac_scoped}`,
    `- RBAC foundation present: ${data.acceptance.rbac_foundation_present}`,
    '',
    '## Findings',
    ''
  ];

  if (!data.findings.length) lines.push('- No blocking findings detected by this static verifier.');
  for (const finding of data.findings) {
    lines.push(`- **${finding.priority} / ${finding.code} / ${finding.file}:** ${finding.message}`);
  }

  lines.push('', '## Notes', '', '- This verifier is static and does not connect to or mutate production Supabase.', '- Runtime validation still requires `npm run validate:predeploy` and `npm run build:ci` in a local/CI environment.', '');
  return lines.join('\n');
}

fs.writeFileSync(path.join(root, reportJson), `${JSON.stringify(report, null, 2)}\n`);
fs.writeFileSync(path.join(root, reportMd), `${md(report)}\n`);

console.log(JSON.stringify({ ok: report.ok, verifier: report.verifier, findings: report.findings.length, reportJson, reportMd }, null, 2));
if (!ok) process.exit(1);
