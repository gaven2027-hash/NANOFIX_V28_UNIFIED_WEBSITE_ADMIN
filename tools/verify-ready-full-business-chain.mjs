import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const failures = [];
const exists = (file) => fs.existsSync(path.join(root, file));
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const assert = (ok, message) => { if (!ok) failures.push(message); };

const file = 'app/api/ready/route.ts';
assert(exists(file), 'Missing app/api/ready/route.ts');

if (!failures.length) {
  const ready = read(file);
  const requiredTables = [
    'profiles',
    'customers',
    'unified_intake',
    'leads',
    'service_requests',
    'jobs',
    'service_inspections',
    'service_upload_reviews',
    'quotations',
    'quotation_versions',
    'quotation_acceptances',
    'quotation_customer_responses',
    'quotation_pdf_documents',
    'invoices',
    'invoice_pdf_documents',
    'payments',
    'payment_intents',
    'payment_webhook_events',
    'payment_checkout_sessions',
    'warranties',
    'warranty_pdf_documents',
    'warranty_claims',
    'customer_portal_requests',
    'customer_document_feedback',
    'automation_rules',
    'notification_outbox',
    'internal_inbox_messages',
    'unified_tasks',
    'task_events',
    'workflow_settings',
    'status_transition_logs',
    'audit_logs',
    'content_drafts',
    'ai_logs',
    'backup_jobs',
    'app_modules',
    'document_company_settings'
  ];

  for (const table of requiredTables) assert(ready.includes(`"${table}"`), `/api/ready requiredTables missing ${table}`);

  const order = ['service_requests', 'jobs', 'quotations', 'invoices', 'payments', 'warranties', 'status_transition_logs', 'audit_logs'];
  let last = -1;
  for (const table of order) {
    const index = ready.indexOf(`"${table}"`);
    assert(index > last, `/api/ready business chain order is invalid around ${table}`);
    last = index;
  }

  for (const marker of [
    'productionEnvIsReady',
    'SUPABASE_SERVICE_ROLE_KEY',
    'checkTable',
    '?select=created_at&limit=1',
    'database_ready',
    'required_tables',
    'status: ok ? 200 : 503'
  ]) assert(ready.includes(marker), `/api/ready missing production readiness marker: ${marker}`);
}

console.log(JSON.stringify({ ok: failures.length === 0, verifier: 'verify-ready-full-business-chain', failures }, null, 2));
if (failures.length) process.exit(1);
