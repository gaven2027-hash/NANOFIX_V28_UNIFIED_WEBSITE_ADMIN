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
  'components/ServiceOperationsLiveCore.tsx',
  'components/ServiceOperationsDedicatedForms.tsx',
  'components/ServiceOperationsFinancialEditors.tsx',
  'components/ServiceOperationsInspectionWorkspace.tsx',
  'data/adminModuleReality.ts',
  'app/api/ready/route.ts',
  'supabase/migrations/20260523_0000_unified_website_admin_schema_bridge.sql',
  'supabase/migrations/202605290003_service_operations_inspection_uploads.sql',
  'supabase/migrations/202605290004_service_operations_upload_notification_hooks.sql'
];

for (const file of requiredFiles) assert(exists(file), `Missing Service Operations live core file: ${file}`);

if (requiredFiles.every(exists)) {
  const page = read('app/service-operations/page.tsx');
  const api = read('app/api/admin/service-operations/route.ts');
  const financialApi = read('app/api/admin/service-operations/financial-documents/route.ts');
  const inspectionApi = read('app/api/admin/service-operations/inspections/route.ts');
  const component = read('components/ServiceOperationsLiveCore.tsx');
  const forms = read('components/ServiceOperationsDedicatedForms.tsx');
  const financialEditors = read('components/ServiceOperationsFinancialEditors.tsx');
  const inspectionWorkspace = read('components/ServiceOperationsInspectionWorkspace.tsx');
  const registry = read('data/adminModuleReality.ts');
  const bridge = read('supabase/migrations/20260523_0000_unified_website_admin_schema_bridge.sql');
  const inspectionSql = read('supabase/migrations/202605290003_service_operations_inspection_uploads.sql');
  const hookSql = read('supabase/migrations/202605290004_service_operations_upload_notification_hooks.sql');
  const ready = read('app/api/ready/route.ts');

  assert(page.includes('ServiceOperationsLiveCore'), 'Service Operations page must render ServiceOperationsLiveCore above contract panels.');
  assert(page.includes('ServiceOperationsDedicatedForms'), 'Service Operations page must render ServiceOperationsDedicatedForms.');
  assert(page.includes('ServiceOperationsFinancialEditors'), 'Service Operations page must render ServiceOperationsFinancialEditors.');
  assert(page.includes('ServiceOperationsInspectionWorkspace'), 'Service Operations page must render ServiceOperationsInspectionWorkspace.');
  assert(page.includes('MenuAnchorSections route="/service-operations"'), 'Service Operations page must retain menu anchor reality panels.');

  for (const marker of [
    'requireActorApi',
    'service_operations_live_core_read',
    'service_operations_live_core_detail_read',
    'service_operations_live_core_record_create',
    'service_operations_live_core_record_update',
    'service_operations_live_core_status_patch',
    'transition_status_tx',
    'writeAuditLog',
    'status_transition_logs',
    'creationPayload',
    'sanitizePatch',
    'writableFields',
    'leads',
    'service_requests',
    'jobs',
    'quotations',
    'invoices',
    'payments',
    'warranties'
  ]) assert(api.includes(marker), `Service Operations API missing marker: ${marker}`);
  for (const exportMarker of ['export async function GET', 'export async function POST', 'export async function PATCH']) {
    assert(api.includes(exportMarker), `Service Operations API missing handler: ${exportMarker}`);
  }
  assert(api.includes("action === 'update'"), 'Service Operations PATCH must support action:update field updates separately from status transition.');
  assert(api.includes('select(spec.select)'), 'Service Operations API must use explicit per-machine select whitelists.');
  assert(!/select\(['"]\*['"]\)/.test(api), 'Service Operations API must use explicit field whitelists, not select("*").');
  assert(api.includes("['super_admin', 'operations_admin', 'finance', 'support', 'engineer']"), 'Service Operations GET roles should include engineer read access.');
  assert(api.includes("['super_admin', 'operations_admin', 'finance', 'support']"), 'Service Operations write roles should exclude engineer write access.');

  for (const marker of [
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
  ]) assert(financialApi.includes(marker), `Financial document API missing marker: ${marker}`);
  assert(financialApi.includes('export async function GET') && financialApi.includes('export async function POST'), 'Financial document API must expose GET and POST.');
  assert(!/select\(['"]\*['"]\)/.test(financialApi), 'Financial document API must use explicit field whitelists, not select("*").');

  for (const marker of [
    'service_operations_inspection_upload_read',
    'service_operations_inspection_schedule',
    'service_operations_inspection_form_submit',
    'service_operations_engineer_assign',
    'service_operations_upload_review_create',
    'service_operations_upload_review_update',
    'service_operations_upload_path_prepare',
    'service_operations_customer_notification_queue',
    'service_inspections',
    'service_upload_reviews',
    'notification_outbox',
    'unified_tasks',
    'task_events',
    'prepare_upload_path',
    'schedule_inspection',
    'submit_inspection_form',
    'assign_engineer',
    'create_upload_review',
    'review_upload',
    'queue_customer_notification',
    'queueCustomerNotification',
    'createFollowUpTask',
    'compression_status',
    'attached_to_record',
    'notification_id',
    'writeAuditLog',
    'requireActorApi'
  ]) assert(inspectionApi.includes(marker), `Inspection/upload API missing marker: ${marker}`);
  assert(inspectionApi.includes('export async function GET') && inspectionApi.includes('export async function POST'), 'Inspection/upload API must expose GET and POST.');
  assert(!/select\(['"]\*['"]\)/.test(inspectionApi), 'Inspection/upload API must use explicit field whitelists, not select("*").');

  for (const marker of [
    '/api/admin/service-operations?limit=12',
    'machine=${encodeURIComponent(machine)}&object_id=${encodeURIComponent(objectId)}',
    "fetch('/api/admin/service-operations'",
    "method: 'POST'",
    "method: 'PATCH'",
    "action: 'update'",
    "credentials: 'same-origin'",
    "cache: 'no-store'",
    "'content-type': 'application/json'",
    'Service Operations Live Core',
    'Live actions / 真实操作',
    'Live Detail / 真实详情',
    'Status Flow & Logs',
    'transition_status_tx'
  ]) assert(component.includes(marker), `ServiceOperationsLiveCore missing marker: ${marker}`);
  for (const functionMarker of ['postCreate', 'fetchDetail', 'patchUpdate', 'patchStatus', 'runWrite', 'createRecord', 'updateRecord', 'openDetail']) {
    assert(component.includes(functionMarker), `ServiceOperationsLiveCore missing function marker: ${functionMarker}`);
  }
  assert(!/localStorage|sessionStorage/.test(component), 'ServiceOperationsLiveCore must not use browser storage for production state.');

  for (const marker of [
    "type FormKind = 'lead' | 'service_request' | 'job'",
    'ServiceOperationsDedicatedForms',
    'Lead Form',
    'Service Request Form',
    'Job Form',
    'validate(kind',
    'emailPattern',
    'uuidPattern',
    'callServiceOperations',
    "method: validation.isUpdate ? 'PATCH' : 'POST'",
    "credentials: 'same-origin'",
    "cache: 'no-store'",
    "'content-type': 'application/json'",
    "action: 'update'",
    'Create via live API',
    'Update via live API',
    'Last API Record'
  ]) assert(forms.includes(marker), `ServiceOperationsDedicatedForms missing marker: ${marker}`);
  for (const field of ['name', 'phone', 'email', 'contact_name', 'whatsapp', 'issue_description', 'service_request_id', 'engineer_id', 'scheduled_at', 'notes']) {
    assert(forms.includes(field), `ServiceOperationsDedicatedForms missing field marker: ${field}`);
  }
  assert(!/localStorage|sessionStorage/.test(forms), 'ServiceOperationsDedicatedForms must not use browser storage for production state.');

  for (const marker of [
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
    'lineItems',
    'uuidPattern',
    'Save via live API',
    'Last Financial API Result',
    "credentials: 'same-origin'",
    "cache: 'no-store'",
    "'content-type': 'application/json'"
  ]) assert(financialEditors.includes(marker), `ServiceOperationsFinancialEditors missing marker: ${marker}`);
  for (const field of ['quotation_id', 'invoice_id', 'payment_id', 'warranty_id', 'job_id', 'description_1', 'qty_1', 'unit_price_1', 'amount', 'fee', 'provider', 'external_id', 'coverage', 'starts_at', 'ends_at']) {
    assert(financialEditors.includes(field), `ServiceOperationsFinancialEditors missing field marker: ${field}`);
  }
  assert(!/localStorage|sessionStorage/.test(financialEditors), 'ServiceOperationsFinancialEditors must not use browser storage for production state.');

  for (const marker of [
    "type ActionKind = 'prepare_upload_path' | 'schedule_inspection' | 'submit_inspection_form' | 'assign_engineer' | 'create_upload_review' | 'review_upload' | 'queue_customer_notification'",
    'ServiceOperationsInspectionWorkspace',
    'Inspection Scheduling & Execution Workspace',
    '/api/admin/service-operations/inspections',
    'service_inspections',
    'service_upload_reviews',
    'Prepare Upload Path',
    'Schedule Inspection',
    'Inspection Form',
    'Engineer Assignment',
    'Create Upload Review',
    'Review Upload',
    'Queue Notification',
    'compression_status',
    'original_size_bytes',
    'compressed_size_bytes',
    'checksum_sha256',
    'attached_to_record',
    'notification_id',
    'Submit via live API',
    'Recent Inspections',
    'Upload Reviews',
    "credentials: 'same-origin'",
    "cache: 'no-store'",
    "'content-type': 'application/json'"
  ]) assert(inspectionWorkspace.includes(marker), `ServiceOperationsInspectionWorkspace missing marker: ${marker}`);
  for (const field of ['inspection_id', 'service_request_id', 'job_id', 'customer_id', 'engineer_id', 'scheduled_at', 'findings', 'diagnosis', 'recommended_action', 'file_name', 'file_type', 'storage_path', 'review_status', 'review_notes', 'related_object_type', 'related_object_id', 'subject', 'body']) {
    assert(inspectionWorkspace.includes(field), `ServiceOperationsInspectionWorkspace missing field marker: ${field}`);
  }
  assert(!/localStorage|sessionStorage/.test(inspectionWorkspace), 'ServiceOperationsInspectionWorkspace must not use browser storage for production state.');

  for (const anchor of [
    '/service-operations#leads',
    '/service-operations#service-requests',
    '/service-operations#jobs',
    '/service-operations#quotations',
    '/service-operations#invoices',
    '/service-operations#payments',
    '/service-operations#warranty-records',
    '/service-operations#status-flow-logs'
  ]) assert(registry.includes(`href: \`${anchor}\``) || registry.includes(`href: '${anchor}'`), `adminModuleReality missing Service Operations anchor: ${anchor}`);
  assert(registry.includes('/api/admin/service-operations or module-specific API'), 'adminModuleReality should identify Service Operations live core/API path while full CRUD remains partial.');

  for (const marker of [
    'create or replace function public.transition_status_tx',
    'insert into public.status_transition_logs',
    "'status.transition'",
    'grant execute on function public.transition_status_tx',
    'public.quotation_versions',
    'public.invoice_items',
    'public.payment_transactions'
  ]) assert(bridge.includes(marker), `Schema bridge missing financial/status marker: ${marker}`);

  for (const marker of [
    'public.service_inspections',
    'public.service_upload_reviews',
    'enable row level security',
    'service_inspections_touch_updated_at',
    'service_upload_reviews_touch_updated_at',
    'operations roles can write service inspections',
    'operations roles can write upload reviews'
  ]) assert(inspectionSql.includes(marker), `Inspection/upload migration missing marker: ${marker}`);

  for (const marker of [
    'compression_status',
    'original_size_bytes',
    'compressed_size_bytes',
    'checksum_sha256',
    'notification_id',
    'attached_to_record',
    'service_upload_reviews_compression_status_check',
    'service_upload_reviews_notification_idx',
    'service_upload_reviews_attachment_idx'
  ]) assert(hookSql.includes(marker), `Upload notification hook migration missing marker: ${marker}`);

  assert(ready.includes('service_inspections'), '/api/ready must include service_inspections table check.');
  assert(ready.includes('service_upload_reviews'), '/api/ready must include service_upload_reviews table check.');

  warn(component.includes('Set approved') && component.includes('Set reconciled'), 'Quotation/payment next-status labels are present; verify these transitions are allowed in staging before production use.');
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
