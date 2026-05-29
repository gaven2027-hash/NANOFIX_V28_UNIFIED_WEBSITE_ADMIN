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
  'components/ServiceOperationsLiveCore.tsx',
  'components/ServiceOperationsDedicatedForms.tsx',
  'components/ServiceOperationsFinancialEditors.tsx',
  'data/adminModuleReality.ts',
  'supabase/migrations/20260523_0000_unified_website_admin_schema_bridge.sql'
];

for (const file of requiredFiles) assert(exists(file), `Missing Service Operations live core file: ${file}`);

if (requiredFiles.every(exists)) {
  const page = read('app/service-operations/page.tsx');
  const api = read('app/api/admin/service-operations/route.ts');
  const financialApi = read('app/api/admin/service-operations/financial-documents/route.ts');
  const component = read('components/ServiceOperationsLiveCore.tsx');
  const forms = read('components/ServiceOperationsDedicatedForms.tsx');
  const financialEditors = read('components/ServiceOperationsFinancialEditors.tsx');
  const registry = read('data/adminModuleReality.ts');
  const bridge = read('supabase/migrations/20260523_0000_unified_website_admin_schema_bridge.sql');

  assert(page.includes('ServiceOperationsLiveCore'), 'Service Operations page must render ServiceOperationsLiveCore above contract panels.');
  assert(page.includes('ServiceOperationsDedicatedForms'), 'Service Operations page must render ServiceOperationsDedicatedForms.');
  assert(page.includes('ServiceOperationsFinancialEditors'), 'Service Operations page must render ServiceOperationsFinancialEditors.');
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
