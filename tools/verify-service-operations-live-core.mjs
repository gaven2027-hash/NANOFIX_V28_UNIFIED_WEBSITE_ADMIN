import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const failures = [];
const warnings = [];
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const exists = (file) => fs.existsSync(path.join(root, file));
const assert = (condition, message) => { if (!condition) failures.push(message); };
const warn = (condition, message) => { if (!condition) warnings.push(message); };
const assertMarkers = (content, markers, label) => { for (const marker of markers) assert(content.includes(marker), `${label} missing marker: ${marker}`); };
const assertNoBrowserStorage = (content, label) => assert(!/localStorage|sessionStorage/.test(content), `${label} must not use browser storage.`);
const assertNoSelectStar = (content, label) => assert(!/select\(['"]\*['"]\)/.test(content), `${label} must not use select("*").`);

const requiredFiles = [
  'app/service-operations/page.tsx',
  'app/api/admin/service-operations/route.ts',
  'app/api/admin/service-operations/financial-documents/route.ts',
  'app/api/admin/service-operations/inspections/route.ts',
  'app/api/admin/service-operations/storage-upload-url/route.ts',
  'app/api/customer-portal/uploads/route.ts',
  'app/api/customer-portal/records/route.ts',
  'app/api/customer-portal/service-requests/route.ts',
  'app/api/customer-portal/storage-upload-url/route.ts',
  'app/api/customer-portal/financial/route.ts',
  'app/customer-portal/page.tsx',
  'app/customer-portal/uploads/page.tsx',
  'app/customer-portal/records/page.tsx',
  'app/customer-portal/financial/page.tsx',
  'components/ServiceOperationsLiveCore.tsx',
  'components/ServiceOperationsDedicatedForms.tsx',
  'components/ServiceOperationsFinancialEditors.tsx',
  'components/ServiceOperationsInspectionWorkspace.tsx',
  'components/ServiceOperationsStorageUploader.tsx',
  'components/ServiceOperationsCustomerVisibility.tsx',
  'components/CustomerPortalShell.tsx',
  'components/CustomerPortalDashboard.tsx',
  'components/CustomerPortalApprovedUploads.tsx',
  'components/CustomerPortalLinkedUploader.tsx',
  'components/CustomerPortalRecordsOverview.tsx',
  'components/CustomerPortalRequestWorkspace.tsx',
  'components/CustomerPortalFinancialOverview.tsx',
  'data/adminModuleReality.ts',
  'app/api/ready/route.ts',
  'supabase/migrations/20260523_0000_unified_website_admin_schema_bridge.sql',
  'supabase/migrations/202605290003_service_operations_inspection_uploads.sql',
  'supabase/migrations/202605290004_service_operations_upload_notification_hooks.sql',
  'supabase/migrations/202605290005_service_uploads_storage_bucket.sql',
  'supabase/migrations/202605290006_customer_visible_uploads.sql',
  'supabase/migrations/202605290007_customer_portal_records_visibility_bridge.sql',
  'supabase/migrations/202605290008_customer_portal_submit_repair_bridge.sql',
  'supabase/migrations/202605290009_customer_portal_financial_visibility.sql'
];

for (const file of requiredFiles) assert(exists(file), `Missing Service Operations / Customer Portal file: ${file}`);

if (requiredFiles.every(exists)) {
  const files = Object.fromEntries(requiredFiles.map((file) => [file, read(file)]));
  const coreApi = files['app/api/admin/service-operations/route.ts'];
  const financialApi = files['app/api/admin/service-operations/financial-documents/route.ts'];
  const inspectionApi = files['app/api/admin/service-operations/inspections/route.ts'];
  const adminStorageApi = files['app/api/admin/service-operations/storage-upload-url/route.ts'];
  const customerUploadsApi = files['app/api/customer-portal/uploads/route.ts'];
  const customerRecordsApi = files['app/api/customer-portal/records/route.ts'];
  const customerSubmitApi = files['app/api/customer-portal/service-requests/route.ts'];
  const customerStorageApi = files['app/api/customer-portal/storage-upload-url/route.ts'];
  const customerFinancialApi = files['app/api/customer-portal/financial/route.ts'];
  const shell = files['components/CustomerPortalShell.tsx'];
  const dashboard = files['components/CustomerPortalDashboard.tsx'];
  const customerRequest = files['components/CustomerPortalRequestWorkspace.tsx'];
  const customerLinkedUploader = files['components/CustomerPortalLinkedUploader.tsx'];
  const customerRecords = files['components/CustomerPortalRecordsOverview.tsx'];
  const customerUploads = files['components/CustomerPortalApprovedUploads.tsx'];
  const customerFinancial = files['components/CustomerPortalFinancialOverview.tsx'];
  const customerFinancialPage = files['app/customer-portal/financial/page.tsx'];
  const customerUploadsPage = files['app/customer-portal/uploads/page.tsx'];
  const customerRecordsPage = files['app/customer-portal/records/page.tsx'];
  const customerPortalPage = files['app/customer-portal/page.tsx'];
  const servicePage = files['app/service-operations/page.tsx'];
  const registry = files['data/adminModuleReality.ts'];
  const bridge = files['supabase/migrations/20260523_0000_unified_website_admin_schema_bridge.sql'];
  const inspectionSql = files['supabase/migrations/202605290003_service_operations_inspection_uploads.sql'];
  const hookSql = files['supabase/migrations/202605290004_service_operations_upload_notification_hooks.sql'];
  const storageSql = files['supabase/migrations/202605290005_service_uploads_storage_bucket.sql'];
  const customerVisibleSql = files['supabase/migrations/202605290006_customer_visible_uploads.sql'];
  const customerRecordsSql = files['supabase/migrations/202605290007_customer_portal_records_visibility_bridge.sql'];
  const customerSubmitSql = files['supabase/migrations/202605290008_customer_portal_submit_repair_bridge.sql'];
  const customerFinancialSql = files['supabase/migrations/202605290009_customer_portal_financial_visibility.sql'];
  const ready = files['app/api/ready/route.ts'];

  assertMarkers(servicePage, ['ServiceOperationsLiveCore','ServiceOperationsDedicatedForms','ServiceOperationsFinancialEditors','ServiceOperationsInspectionWorkspace','ServiceOperationsStorageUploader','ServiceOperationsCustomerVisibility','MenuAnchorSections route="/service-operations"'], 'Service Operations page');
  assertMarkers(coreApi, ['requireActorApi','service_operations_live_core_read','service_operations_live_core_record_create','service_operations_live_core_record_update','service_operations_live_core_status_patch','transition_status_tx','select(spec.select)','leads','service_requests','jobs','quotations','invoices','payments','warranties','export async function GET','export async function POST','export async function PATCH'], 'Service Operations core API');
  assertNoSelectStar(coreApi, 'Service Operations core API');
  assertMarkers(financialApi, ['service_operations_financial_document_read','service_operations_quotation_version_save','service_operations_invoice_items_save','service_operations_payment_reconcile','service_operations_warranty_issue','quotation_versions','invoice_items','payment_transactions','save_quotation_version','save_invoice_items','reconcile_payment','issue_warranty','export async function GET','export async function POST'], 'Financial document API');
  assertNoSelectStar(financialApi, 'Financial document API');
  assertMarkers(inspectionApi, ['service_operations_inspection_upload_read','service_operations_upload_customer_visibility_set','set_upload_customer_visibility','visible_to_customer','customer_visible_at','customer_visible_by','customer_visibility_notes','Only approved uploads can be visible to customer','service_inspections','service_upload_reviews','notification_outbox','unified_tasks','task_events','queueCustomerNotification','createFollowUpTask','uploadReviewSelect'], 'Inspection/upload API');
  assertNoSelectStar(inspectionApi, 'Inspection/upload API');
  assertMarkers(adminStorageApi, ['service_operations_signed_upload_url_create','service_operations_completed_upload_register','createSignedUploadUrl','register_completed_upload','service-uploads','service_upload_reviews','compression_status','checksum_sha256','storage_path'], 'Admin storage upload URL API');
  assertNoSelectStar(adminStorageApi, 'Admin storage upload URL API');

  assertMarkers(customerUploadsApi, ['CUSTOMER_AND_INTERNAL_ROLES','customerIdsForProfile','allowedRelatedIdsForCustomers','belongsToAllowed','review_status','approved','visible_to_customer','createSignedUrl','customer_portal_uploads_signed_download_read','service-uploads'], 'Customer Portal uploads API');
  assertNoSelectStar(customerUploadsApi, 'Customer Portal uploads API');
  assertMarkers(customerRecordsApi, ['customerIdsForProfile','loadCustomerRecords','customers','service_requests','jobs','invoices','payments','warranties','customer_id','profile_id','customer_portal_records_read'], 'Customer Portal records API');
  assertNoSelectStar(customerRecordsApi, 'Customer Portal records API');
  assertMarkers(customerSubmitApi, ['CUSTOMER_ROLES','activeCustomerForProfile','createCustomerPortalTaskAndInbox','queueCustomerConfirmation','unified_intake','leads','service_requests','unified_tasks','task_events','internal_inbox_messages','notification_outbox','customer_portal_service_request_submit','customer_portal_linked','bindingStatus','linked'], 'Customer Portal linked service request API');
  assertNoSelectStar(customerSubmitApi, 'Customer Portal linked service request API');
  assertMarkers(customerStorageApi, ['CUSTOMER_ROLES','assertCustomerOwnsServiceRequest','customer_portal_signed_upload_url_create','customer_portal_completed_upload_register','createSignedUploadUrl','register_completed_upload','service-uploads','service_request_id','service_upload_reviews','unified_tasks','task_events','internal_inbox_messages','storage_path does not match the service request scope','visible_to_customer: false'], 'Customer Portal linked storage upload API');
  assertNoSelectStar(customerStorageApi, 'Customer Portal linked storage upload API');
  assertMarkers(customerFinancialApi, ['ALLOWED_ROLES','customerIdsForProfile','jobIdsForCustomers','loadFinancialForJobs','quotations','quotation_versions','invoices','payments','visible_to_customer','createSignedUrl','pdf_download_url','payment_url','customer_portal_financial_read','service-uploads'], 'Customer Portal financial API');
  assertNoSelectStar(customerFinancialApi, 'Customer Portal financial API');

  assertMarkers(customerPortalPage, ['CustomerPortalShell','CustomerPortalDashboard','CustomerPortalRequestWorkspace','Customer360','CustomerPortalAnchors'], 'Customer Portal home page');
  assert(!customerPortalPage.includes('AdminShell'), 'Customer Portal home page must not use AdminShell.');
  assertMarkers(customerUploadsPage, ['CustomerPortalShell','CustomerPortalLinkedUploader','CustomerPortalApprovedUploads','Suspense'], 'Customer uploads page');
  assert(!customerUploadsPage.includes('AdminShell'), 'Customer uploads page must not use AdminShell.');
  assertMarkers(customerRecordsPage, ['CustomerPortalShell','CustomerPortalRecordsOverview'], 'Customer records page');
  assert(!customerRecordsPage.includes('AdminShell'), 'Customer records page must not use AdminShell.');
  assertMarkers(customerFinancialPage, ['CustomerPortalShell','CustomerPortalFinancialOverview'], 'Customer financial page');
  assert(!customerFinancialPage.includes('AdminShell'), 'Customer financial page must not use AdminShell.');

  assertMarkers(shell, ['CustomerPortalShell','/customer-portal','/customer-portal/records','/customer-portal/uploads','/customer-portal/financial','/customer-portal/records#warranties','/customer-portal/financial#invoices','Customer Portal is separated from the Internal Admin App'], 'CustomerPortalShell');
  assert(!shell.includes('AdminShell'), 'CustomerPortalShell must not use AdminShell.');
  assertMarkers(dashboard, ['CustomerPortalDashboard','/api/customer-portal/records?limit=20','My NANOFIX Service Centre','Repair Requests','Jobs','Invoices','Payments','Warranties','/customer-portal/financial','Quotations, invoice PDFs, payment links and payment status'], 'CustomerPortalDashboard');
  assertNoBrowserStorage(dashboard, 'CustomerPortalDashboard');
  assertMarkers(customerUploads, ['CustomerPortalApprovedUploads','/api/customer-portal/uploads?limit=20','Approved Service Uploads','download_url','Open file / 打开文件'], 'CustomerPortalApprovedUploads');
  assertNoBrowserStorage(customerUploads, 'CustomerPortalApprovedUploads');
  assert(!customerUploads.includes('<main'), 'CustomerPortalApprovedUploads should not render nested main.');
  assertMarkers(customerLinkedUploader, ['CustomerPortalLinkedUploader','useSearchParams','service_request_id','/api/customer-portal/storage-upload-url','create_signed_upload_url','register_completed_upload','uploadToSignedUrl','service-uploads','Upload and link to request'], 'CustomerPortalLinkedUploader');
  assertNoBrowserStorage(customerLinkedUploader, 'CustomerPortalLinkedUploader');
  assert(!customerLinkedUploader.includes('/api/admin/service-operations/storage-upload-url'), 'CustomerPortalLinkedUploader must not call admin storage upload API.');
  assertMarkers(customerRecords, ['CustomerPortalRecordsOverview','/api/customer-portal/records?limit=20','My NANOFIX Records','Repair Requests','Jobs & Site Works','Invoices','Payments','Warranties','filtered by your linked customer profile','id: \'invoices\'','id: \'warranties\''], 'CustomerPortalRecordsOverview');
  assertNoBrowserStorage(customerRecords, 'CustomerPortalRecordsOverview');
  assert(!customerRecords.includes('<main'), 'CustomerPortalRecordsOverview should not render nested main.');
  assertMarkers(customerRequest, ['CustomerPortalRequestWorkspace','/api/customer-portal/service-requests','linked to your customer account','serviceRequestId','/customer-portal/records#repair-requests','/customer-portal/uploads?service_request_id=','View in Records / 查看记录','Upload Files / 上传文件'], 'CustomerPortalRequestWorkspace');
  assertNoBrowserStorage(customerRequest, 'CustomerPortalRequestWorkspace');
  assert(!customerRequest.includes('/api/public/service-requests'), 'CustomerPortalRequestWorkspace must not submit to public service request API.');
  assertMarkers(customerFinancial, ['CustomerPortalFinancialOverview','/api/customer-portal/financial?limit=20','Quotations, Invoices & Payments','Download PDF / 下载PDF','Pay Now / 立即付款','pdf_download_url','payment_url','Quotations','Invoices','Payments'], 'CustomerPortalFinancialOverview');
  assertNoBrowserStorage(customerFinancial, 'CustomerPortalFinancialOverview');
  assert(!customerFinancial.includes('<main'), 'CustomerPortalFinancialOverview should not render nested main.');

  for (const anchor of ['/service-operations#leads','/service-operations#service-requests','/service-operations#jobs','/service-operations#quotations','/service-operations#invoices','/service-operations#payments','/service-operations#warranty-records','/service-operations#status-flow-logs']) {
    assert(registry.includes(`href: \`${anchor}\``) || registry.includes(`href: '${anchor}'`), `adminModuleReality missing Service Operations anchor: ${anchor}`);
  }
  assertMarkers(bridge, ['transition_status_tx','status_transition_logs','public.quotation_versions','public.invoice_items','public.payment_transactions','public.owns_customer'], 'Schema bridge migration');
  assertMarkers(inspectionSql, ['public.service_inspections','public.service_upload_reviews','enable row level security','operations roles can write service inspections','operations roles can write upload reviews'], 'Inspection/upload migration');
  assertMarkers(hookSql, ['compression_status','original_size_bytes','compressed_size_bytes','checksum_sha256','notification_id','attached_to_record','service_upload_reviews_compression_status_check'], 'Upload notification hook migration');
  assertMarkers(storageSql, ['storage.buckets',"'service-uploads'",'file_size_limit','allowed_mime_types','storage.objects'], 'Service upload storage migration');
  assertMarkers(customerVisibleSql, ['visible_to_customer','customer_visible_at','customer_visible_by','customer_visibility_notes','service_upload_reviews_customer_visible_idx'], 'Customer visible uploads migration');
  assertMarkers(customerRecordsSql, ['public.service_requests','customer_id','public.jobs','service_requests_customer_idx','jobs_customer_idx','jobs_service_request_idx','invoices_job_idx','warranties_job_idx'], 'Customer portal records visibility bridge');
  assertMarkers(customerSubmitSql, ['extracted_data','priority','urgency_score','unified_intake','leads','service_requests','intake_id','lead_id','customer_id','request_type','issue_type','source_platform','binding_status'], 'Customer portal submit repair bridge');
  assertMarkers(customerFinancialSql, ['public.quotations','public.invoices','public.payments','visible_to_customer','customer_visible_at','customer_visible_by','customer_visibility_notes','pdf_storage_path','payment_url','public_ref','quotations_customer_visible_idx','invoices_customer_visible_idx','payments_customer_visible_idx'], 'Customer portal financial visibility migration');
  assert(ready.includes('service_inspections'), '/api/ready must include service_inspections table check.');
  assert(ready.includes('service_upload_reviews'), '/api/ready must include service_upload_reviews table check.');

  warn(files['components/ServiceOperationsLiveCore.tsx'].includes('Set approved') && files['components/ServiceOperationsLiveCore.tsx'].includes('Set reconciled'), 'Quotation/payment next-status labels are present; verify transitions in staging before production use.');
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
