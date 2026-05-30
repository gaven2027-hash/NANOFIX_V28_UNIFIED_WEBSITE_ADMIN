import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const failures = [];
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const exists = (file) => fs.existsSync(path.join(root, file));
const assert = (condition, message) => { if (!condition) failures.push(message); };
const has = (content, markers, label) => { for (const marker of markers) assert(content.includes(marker), `${label} missing marker: ${marker}`); };
const noSelectStar = (content, label) => assert(!/select\(['"]\*['"]\)/.test(content), `${label} must not use select star.`);
const noBrowserStorage = (content, label) => assert(!/localStorage|sessionStorage/.test(content), `${label} must not use browser storage.`);

const requiredFiles = [
  'supabase/migrations/202605290017_quote_response_revision_flow.sql',
  'app/api/customer-portal/quote-acceptance/route.ts',
  'components/CustomerPortalFinancialOverview.tsx',
  'app/api/admin/service-operations/quote-responses/route.ts',
  'components/ServiceOperationsQuoteResponsePanel.tsx',
  'app/service-operations/page.tsx',
  'app/api/ready/route.ts'
];

for (const file of requiredFiles) assert(exists(file), `Missing quote response revision flow file: ${file}`);

if (requiredFiles.every(exists)) {
  const sql = read('supabase/migrations/202605290017_quote_response_revision_flow.sql');
  const customerApi = read('app/api/customer-portal/quote-acceptance/route.ts');
  const customerUi = read('components/CustomerPortalFinancialOverview.tsx');
  const adminApi = read('app/api/admin/service-operations/quote-responses/route.ts');
  const adminPanel = read('components/ServiceOperationsQuoteResponsePanel.tsx');
  const servicePage = read('app/service-operations/page.tsx');
  const ready = read('app/api/ready/route.ts');

  has(sql, [
    'public.quotation_customer_responses',
    'response_type text not null check',
    'accepted',
    'declined',
    'revision_requested',
    'quotation_pdf_id uuid references public.quotation_pdf_documents',
    'accepted_pdf_storage_path text',
    'customer_message text',
    'quoted_pdf_storage_path text',
    'internal_review_notes text',
    'quotation_customer_responses_quotation_idx',
    'quotation_customer_responses_customer_idx',
    'enable row level security',
    'internal roles can read quotation customer responses',
    'customers can read own quotation customer responses',
    'service role can write quotation customer responses'
  ], 'Quote response revision migration');

  has(customerApi, [
    'RESPONSE_TYPES',
    'accepted',
    'declined',
    'revision_requested',
    'loadVisibleOwnedQuotation',
    'latestVisibleQuotationPdf',
    'quotation_customer_responses',
    'createCustomerResponse',
    'Customer message is required when declining or requesting revision',
    'quotation_acceptances',
    'accepted_pdf_storage_path',
    'payment_intents',
    'customer_revision_requested',
    'customer_portal_quote_response_submit',
    'notification_outbox',
    'unified_tasks',
    'task_events',
    'internal_inbox_messages',
    'writeAuditLog'
  ], 'Customer quote response API');
  noSelectStar(customerApi, 'Customer quote response API');

  has(customerUi, [
    'QuoteResponseType',
    'submitQuoteResponse',
    'response_type',
    'customer_message',
    'Quote Response / 报价回复',
    'You can accept, decline, or request revision with a message',
    'cannot edit quotation or invoice content',
    'Accept Quote / 同意报价',
    'Request Revision / 要求修改',
    'Decline / 不同意',
    "credentials: 'same-origin'",
    "cache: 'no-store'"
  ], 'Customer financial quote response UI');
  noBrowserStorage(customerUi, 'Customer financial quote response UI');

  has(adminApi, [
    'quotation_customer_responses',
    'service_operations_quote_responses_read',
    'review_quote_response',
    'resolve_quote_response',
    'create_revised_quotation_version',
    'quotation_versions',
    'revised_pending_customer',
    'visible_to_customer: true',
    'Revised quotation pushed for customer confirmation',
    'unified_tasks',
    'task_events',
    'internal_inbox_messages',
    'notification_outbox',
    'service_operations_revised_quotation_version_create',
    'writeAuditLog'
  ], 'Admin quote response revision API');
  noSelectStar(adminApi, 'Admin quote response revision API');

  has(adminPanel, [
    'ServiceOperationsQuoteResponsePanel',
    '/api/admin/service-operations/quote-responses?limit=30',
    '/api/admin/service-operations/quote-responses',
    'Customer Quote Responses',
    'Review, Revise & Re-Push Quotations',
    'Customers can accept, decline or request revision with messages',
    'Only Admin/Finance can revise quotation line items',
    'Mark Reviewed / 标记已审核',
    'Create Revised Quote / 创建新版报价',
    'Resolve / 完成处理',
    "credentials: 'same-origin'",
    "cache: 'no-store'"
  ], 'ServiceOperationsQuoteResponsePanel');
  noBrowserStorage(adminPanel, 'ServiceOperationsQuoteResponsePanel');

  has(servicePage, ['ServiceOperationsQuoteResponsePanel'], 'Service Operations page');
  has(ready, ['quotation_customer_responses'], '/api/ready quotation customer responses table check');
}

const report = { ok: failures.length === 0, generated_at: new Date().toISOString(), verifier: 'verify-quote-response-revision-flow', failures };
console.log(JSON.stringify(report, null, 2));
if (failures.length) process.exit(1);
