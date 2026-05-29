import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const failures = [];
const warnings = [];
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const exists = (file) => fs.existsSync(path.join(root, file));
const assert = (condition, message) => { if (!condition) failures.push(message); };
const warn = (condition, message) => { if (!condition) warnings.push(message); };

const requiredFiles = [
  'app/service-operations/page.tsx',
  'app/api/admin/service-operations/route.ts',
  'app/api/admin/service-operations/financial-documents/route.ts',
  'app/api/admin/service-operations/inspections/route.ts',
  'app/api/admin/service-operations/storage-upload-url/route.ts',
  'app/api/customer-portal/uploads/route.ts',
  'app/api/customer-portal/records/route.ts',
  'app/customer-portal/uploads/page.tsx',
  'app/customer-portal/records/page.tsx',
  'components/ServiceOperationsLiveCore.tsx',
  'components/ServiceOperationsDedicatedForms.tsx',
  'components/ServiceOperationsFinancialEditors.tsx',
  'components/ServiceOperationsInspectionWorkspace.tsx',
  'components/ServiceOperationsStorageUploader.tsx',
  'components/ServiceOperationsCustomerVisibility.tsx',
  'components/CustomerPortalApprovedUploads.tsx',
  'components/CustomerPortalRecordsOverview.tsx',
  'data/adminModuleReality.ts',
  'app/api/ready/route.ts',
  'supabase/migrations/20260523_0000_unified_website_admin_schema_bridge.sql',
  'supabase/migrations/202605290003_service_operations_inspection_uploads.sql',
  'supabase/migrations/202605290004_service_operations_upload_notification_hooks.sql',
  'supabase/migrations/202605290005_service_uploads_storage_bucket.sql',
  'supabase/migrations/202605290006_customer_visible_uploads.sql',
  'supabase/migrations/202605290007_customer_portal_records_visibility_bridge.sql'
];

for (const file of requiredFiles) assert(exists(file), `Missing Service Operations file: ${file}`);

function assertMarkers(content, markers, label) {
  for (const marker of markers) assert(content.includes(marker), `${label} missing marker: ${marker}`);
}

function assertNoBrowserStorage(content, label) {
  assert(!/localStorage|sessionStorage/.test(content), `${label} must not use browser storage.`);
}

function assertNoSelectStar(content, label) {
  assert(!/select\(['"]\*['"]\)/.test(content), `${label} must not use select("*").`);
}

if (requiredFiles.every(exists)) {
  const page = read('app/service-operations/page.tsx');
  const coreApi = read('app/api/admin/service-operations/route.ts');
  const financialApi = read('app/api/admin/service-operations/financial-documents/route.ts');
  const inspectionApi = read('app/api/admin/service-operations/inspections/route.ts');
  const storageApi = read('app/api/admin/service-operations/storage-upload-url/route.ts');
  const customerUploadsApi = read('app/api/customer-portal/uploads/route.ts');
  const customerRecordsApi = read('app/api/customer-portal/records/route.ts');
  const customerUploadsPage = read('app/customer-portal/uploads/page.tsx');
  const customerRecordsPage = read('app/customer-portal/records/page.tsx');
  const liveCore = read('components/ServiceOperationsLiveCore.tsx');
  const forms = read('components/ServiceOperationsDedicatedForms.tsx');
  const financialEditors = read('components/ServiceOperationsFinancialEditors.tsx');
  const inspectionWorkspace = read('components/ServiceOperationsInspectionWorkspace.tsx');
  const uploader = read('components/ServiceOperationsStorageUploader.tsx');
  const visibility = read('components/ServiceOperationsCustomerVisibility.tsx');
  const customerUploads = read('components/CustomerPortalApprovedUploads.tsx');
  const customerRecords = read('components/CustomerPortalRecordsOverview.tsx');
  const registry = read('data/adminModuleReality.ts');
  const bridge = read('supabase/migrations/20260523_0000_unified_website_admin_schema_bridge.sql');
  const inspectionSql = read('supabase/migrations/202605290003_service_operations_inspection_uploads.sql');
  const hookSql = read('supabase/migrations/202605290004_service_operations_upload_notification_hooks.sql');
  const storageSql = read('supabase/migrations/202605290005_service_uploads_storage_bucket.sql');
  const customerVisibleSql = read('supabase/migrations/202605290006_customer_visible_uploads.sql');
  const customerRecordsSql = read('supabase/migrations/202605290007_customer_portal_records_visibility_bridge.sql');
  const ready = read('app/api/ready/route.ts');

  assertMarkers(page, [
    'ServiceOperationsLiveCore',
    'ServiceOperationsDedicatedForms',
    'ServiceOperationsFinancialEditors',
    'ServiceOperationsInspectionWorkspace',
    'ServiceOperationsStorageUploader',
    'ServiceOperationsCustomerVisibility',
    'MenuAnchorSections route="/service-operations"'
  ], 'Service Operations page');

  assertMarkers(coreApi, [
    'requireActorApi',
    'service_operations_live_core_read',
    'service_operations_live_core_detail_read',
    'service_operations_live_core_record_create',
    'service_operations_live_core_record_update',
    'service_operations_live_core_status_patch',
    'transition_status_tx',
    'writeAuditLog',
    'select(spec.select)',
    "action === 'update'",
    'leads',
    'service_requests',
    'jobs',
    'quotations',
    'invoices',
    'payments',
    'warranties'
  ], 'Service Operations core API');
  assertMarkers(coreApi, ['export async function GET', 'export async function POST', 'export async function PATCH'], 'Service Operations core API handlers');
  assertNoSelectStar(coreApi, 'Service Operations core API');

  assertMarkers(financialApi, [
    'service_operations_financial_document_read',
    'service_operations_quotation_version_save',
    'service_operations_invoice_items_save',
    'service_operations_payment_reconcile',
    'service_operations_warranty_issue',
    'quotation_versions',
    'invoice_items',
    'payment_transactions',
    'save_quotation_version',
    'save_invoice_items',
    'reconcile_payment',
    'issue_warranty',
    'parseLineItems',
    'writeAuditLog',
    'requireActorApi'
  ], 'Financial document API');
  assertMarkers(financialApi, ['export async function GET', 'export async function POST'], 'Financial document API handlers');
  assertNoSelectStar(financialApi, 'Financial document API');

  assertMarkers(inspectionApi, [
    'service_operations_inspection_upload_read',
    'service_operations_inspection_schedule',
    'service_operations_inspection_form_submit',
    'service_operations_engineer_assign',
    'service_operations_upload_review_create',
    'service_operations_upload_review_update',
    'service_operations_upload_path_prepare',
    'service_operations_customer_notification_queue',
    'service_operations_upload_customer_visibility_set',
    'set_upload_customer_visibility',
    'visible_to_customer',
    'customer_visible_at',
    'customer_visible_by',
    'customer_visibility_notes',
    'Only approved uploads can be visible to customer',
    'service_inspections',
    'service_upload_reviews',
    'notification_outbox',
    'unified_tasks',
    'task_events',
    'queueCustomerNotification',
    'createFollowUpTask',
    'uploadReviewSelect',
    'writeAuditLog',
    'requireActorApi'
  ], 'Inspection/upload API');
  assertMarkers(inspectionApi, ['export async function GET', 'export async function POST'], 'Inspection/upload API handlers');
  assertNoSelectStar(inspectionApi, 'Inspection/upload API');

  assertMarkers(storageApi, [
    'service_operations_signed_upload_url_create',
    'service_operations_completed_upload_register',
    'createSignedUploadUrl',
    'register_completed_upload',
    'create_signed_upload_url',
    'service-uploads',
    'MAX_SIZE_BYTES',
    'MIME_TO_TYPE',
    'service_upload_reviews',
    'compression_status',
    'checksum_sha256',
    'storage_path',
    'writeAuditLog'
  ], 'Storage upload URL API');
  assertMarkers(storageApi, ['export async function POST'], 'Storage upload URL API handlers');
  assertNoSelectStar(storageApi, 'Storage upload URL API');

  assertMarkers(customerUploadsApi, [
    'CUSTOMER_AND_INTERNAL_ROLES',
    "'customer'",
    'customerIdsForProfile',
    'allowedRelatedIdsForCustomers',
    'belongsToAllowed',
    'review_status',
    'approved',
    'visible_to_customer',
    'createSignedUrl',
    'customer_portal_uploads_signed_download_read',
    'service-uploads',
    'requireActorApi',
    'writeAuditLog'
  ], 'Customer Portal uploads API');
  assertMarkers(customerUploadsApi, ['export async function GET'], 'Customer Portal uploads API handlers');
  assertNoSelectStar(customerUploadsApi, 'Customer Portal uploads API');

  assertMarkers(customerRecordsApi, [
    'ALLOWED_ROLES',
    "'customer'",
    'customerIdsForProfile',
    'loadCustomerRecords',
    'customers',
    'service_requests',
    'jobs',
    'invoices',
    'payments',
    'warranties',
    'customer_id',
    'profile_id',
    'customer_portal_records_read',
    'requireActorApi',
    'writeAuditLog'
  ], 'Customer Portal records API');
  assertMarkers(customerRecordsApi, ['export async function GET'], 'Customer Portal records API handlers');
  assertNoSelectStar(customerRecordsApi, 'Customer Portal records API');

  assertMarkers(customerUploadsPage, ['CustomerPortalApprovedUploads', 'min-h-screen bg-slate-50'], 'Customer uploads page');
  assertMarkers(customerRecordsPage, ['CustomerPortalRecordsOverview'], 'Customer records page');

  assertMarkers(liveCore, [
    '/api/admin/service-operations?limit=12',
    "fetch('/api/admin/service-operations'",
    "method: 'POST'",
    "method: 'PATCH'",
    "action: 'update'",
    'Service Operations Live Core',
    'Live actions / 真实操作',
    'Live Detail / 真实详情',
    'Status Flow & Logs'
  ], 'ServiceOperationsLiveCore');
  assertNoBrowserStorage(liveCore, 'ServiceOperationsLiveCore');

  assertMarkers(forms, [
    "type FormKind = 'lead' | 'service_request' | 'job'",
    'ServiceOperationsDedicatedForms',
    'Lead Form',
    'Service Request Form',
    'Job Form',
    'validate(kind',
    'emailPattern',
    'uuidPattern',
    'Create via live API',
    'Update via live API'
  ], 'ServiceOperationsDedicatedForms');
  assertNoBrowserStorage(forms, 'ServiceOperationsDedicatedForms');

  assertMarkers(financialEditors, [
    "type EditorKind = 'quotation' | 'invoice' | 'payment' | 'warranty'",
    'ServiceOperationsFinancialEditors',
    'Quotation Line Items',
    'Invoice Items',
    'Payment Reconciliation',
    'Warranty Issue',
    '/api/admin/service-operations/financial-documents',
    'save_quotation_version',
    'save_invoice_items',
    'reconcile_payment',
    'issue_warranty',
    'Save via live API'
  ], 'ServiceOperationsFinancialEditors');
  assertNoBrowserStorage(financialEditors, 'ServiceOperationsFinancialEditors');

  assertMarkers(inspectionWorkspace, [
    "type ActionKind = 'prepare_upload_path' | 'schedule_inspection' | 'submit_inspection_form' | 'assign_engineer' | 'create_upload_review' | 'review_upload' | 'queue_customer_notification'",
    'ServiceOperationsInspectionWorkspace',
    '/api/admin/service-operations/inspections',
    'Prepare Upload Path',
    'Schedule Inspection',
    'Inspection Form',
    'Engineer Assignment',
    'Create Upload Review',
    'Review Upload',
    'Queue Notification',
    'compression_status',
    'attached_to_record',
    'notification_id',
    'Submit via live API'
  ], 'ServiceOperationsInspectionWorkspace');
  assertNoBrowserStorage(inspectionWorkspace, 'ServiceOperationsInspectionWorkspace');

  assertMarkers(uploader, [
    'ServiceOperationsStorageUploader',
    '@supabase/supabase-js',
    'createBrowserStorageClient',
    'uploadToSignedUrl',
    '/api/admin/service-operations/storage-upload-url',
    'create_signed_upload_url',
    'register_completed_upload',
    'service-uploads',
    'Signed Storage Upload',
    'Upload via signed URL',
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'checksum_sha256',
    'compression_status'
  ], 'ServiceOperationsStorageUploader');
  assertNoBrowserStorage(uploader, 'ServiceOperationsStorageUploader');

  assertMarkers(visibility, [
    'ServiceOperationsCustomerVisibility',
    'set_upload_customer_visibility',
    'visible_to_customer',
    'customer_visibility_notes',
    'Approved upload does not automatically mean customer-visible',
    'Set customer visibility',
    '/api/admin/service-operations/inspections',
    "credentials: 'same-origin'",
    "cache: 'no-store'"
  ], 'ServiceOperationsCustomerVisibility');
  assertNoBrowserStorage(visibility, 'ServiceOperationsCustomerVisibility');

  assertMarkers(customerUploads, [
    'CustomerPortalApprovedUploads',
    '/api/customer-portal/uploads?limit=20',
    'Approved Service Uploads',
    'Only uploads approved by NANOFIX and marked visible to customer',
    'download_url',
    'Open file / 打开文件',
    "credentials: 'same-origin'",
    "cache: 'no-store'"
  ], 'CustomerPortalApprovedUploads');
  assertNoBrowserStorage(customerUploads, 'CustomerPortalApprovedUploads');

  assertMarkers(customerRecords, [
    'CustomerPortalRecordsOverview',
    '/api/customer-portal/records?limit=20',
    'My NANOFIX Records',
    'Repair Requests',
    'Jobs & Site Works',
    'Invoices',
    'Payments',
    'Warranties',
    'filtered by your linked customer profile',
    "credentials: 'same-origin'",
    "cache: 'no-store'"
  ], 'CustomerPortalRecordsOverview');
  assertNoBrowserStorage(customerRecords, 'CustomerPortalRecordsOverview');

  for (const anchor of ['/service-operations#leads', '/service-operations#service-requests', '/service-operations#jobs', '/service-operations#quotations', '/service-operations#invoices', '/service-operations#payments', '/service-operations#warranty-records', '/service-operations#status-flow-logs']) {
    assert(registry.includes(`href: \`${anchor}\``) || registry.includes(`href: '${anchor}'`), `adminModuleReality missing Service Operations anchor: ${anchor}`);
  }

  assertMarkers(bridge, [
    'create or replace function public.transition_status_tx',
    'insert into public.status_transition_logs',
    "'status.transition'",
    'grant execute on function public.transition_status_tx',
    'public.quotation_versions',
    'public.invoice_items',
    'public.payment_transactions',
    'public.owns_customer'
  ], 'Schema bridge migration');

  assertMarkers(inspectionSql, [
    'public.service_inspections',
    'public.service_upload_reviews',
    'enable row level security',
    'service_inspections_touch_updated_at',
    'service_upload_reviews_touch_updated_at',
    'operations roles can write service inspections',
    'operations roles can write upload reviews'
  ], 'Inspection/upload migration');

  assertMarkers(hookSql, [
    'compression_status',
    'original_size_bytes',
    'compressed_size_bytes',
    'checksum_sha256',
    'notification_id',
    'attached_to_record',
    'service_upload_reviews_compression_status_check',
    'service_upload_reviews_notification_idx',
    'service_upload_reviews_attachment_idx'
  ], 'Upload notification hook migration');

  assertMarkers(storageSql, [
    'storage.buckets',
    "'service-uploads'",
    'public = excluded.public',
    'file_size_limit',
    'allowed_mime_types',
    'internal roles can read service uploads',
    'internal roles can upload service files',
    'internal roles can update service upload metadata',
    'storage.objects'
  ], 'Service upload storage migration');

  assertMarkers(customerVisibleSql, [
    'visible_to_customer',
    'customer_visible_at',
    'customer_visible_by',
    'customer_visibility_notes',
    'service_upload_reviews_customer_visible_idx'
  ], 'Customer visible uploads migration');

  assertMarkers(customerRecordsSql, [
    'public.service_requests',
    'customer_id',
    'public.jobs',
    'service_requests_customer_idx',
    'jobs_customer_idx',
    'jobs_service_request_idx',
    'invoices_job_idx',
    'warranties_job_idx'
  ], 'Customer portal records visibility bridge');

  assert(ready.includes('service_inspections'), '/api/ready must include service_inspections table check.');
  assert(ready.includes('service_upload_reviews'), '/api/ready must include service_upload_reviews table check.');

  warn(liveCore.includes('Set approved') && liveCore.includes('Set reconciled'), 'Quotation/payment next-status labels are present; verify these transitions are allowed in staging before production use.');
}

const report = {
  ok: failures.length === 0,
  generated_at: new Date().toISOString(),
  verifier: 'verify-service-operations-live-core',
  failures,
  warnings
};

console.log(JSON.stringify(report, null, 2));
if (failures.length) process.exit(1);
