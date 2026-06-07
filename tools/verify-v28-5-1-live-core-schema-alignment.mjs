import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const routePath = 'app/api/admin/service-operations/route.ts';
const route = fs.readFileSync(path.join(root, routePath), 'utf8');
const failures = [];

const assert = (condition, message) => {
  if (!condition) failures.push(message);
};

const requiredMarkers = [
  "quotation_id,service_request_id,customer_id,version,total_amount,currency,status",
  "invoice_id,invoice_no,customer_id,job_id,quotation_id,total_amount,currency,status",
  "payment_id,invoice_id,customer_id,amount,currency,status,reconciled_at",
  "warranty_id,job_id,customer_id,invoice_id,quotation_id,status,coverage,starts_on,ends_on",
  "quotation: ['service_request_id', 'customer_id', 'version', 'total_amount', 'currency', 'status']",
  "invoice: ['invoice_no', 'customer_id', 'job_id', 'quotation_id', 'total_amount', 'currency', 'status', 'void_reason']",
  "payment: ['invoice_id', 'customer_id', 'amount', 'currency', 'status', 'reconciled_at']",
  "warranty: ['job_id', 'customer_id', 'invoice_id', 'quotation_id', 'status', 'coverage', 'starts_on', 'ends_on', 'public_ref']",
  "if (machine === 'quotation') return { version: 1, total_amount: amount, currency, status: 'draft'",
  "if (machine === 'invoice') return { invoice_no: cleanText(body.invoice_no, 120) ?? `NF-DRAFT-${Date.now()}`, total_amount: amount, currency, status: 'draft'",
  "if (machine === 'payment') return { amount, currency, status: 'processing'",
  "transition_status_tx"
];

for (const marker of requiredMarkers) {
  assert(route.includes(marker), `${routePath} missing production schema marker: ${marker}`);
}

const forbiddenMarkers = [
  "statusColumn: 'approval_status'",
  "quotation_id,job_id,current_version,total,approval_status",
  "quotation: ['job_id', 'current_version', 'total', 'approval_status']",
  "current_version: 1",
  "approval_status: 'draft'",
  "invoice_id,invoice_no,job_id,total,status",
  "invoice: ['invoice_no', 'job_id', 'total'",
  "payment_id,invoice_id,amount,status,fee",
  "payment: ['invoice_id', 'amount', 'status', 'fee'",
  "fee: cleanNumber",
  "starts_at",
  "ends_at",
  "writeStatusTransitionLog"
];

for (const marker of forbiddenMarkers) {
  assert(!route.includes(marker), `${routePath} must not contain legacy/high-risk marker: ${marker}`);
}

assert(!/select\(['"]\*['"]\)/.test(route), `${routePath} must not use select("*").`);
assert(!/localStorage|sessionStorage/.test(route), `${routePath} must not use browser storage.`);

const report = {
  ok: failures.length === 0,
  verifier: 'verify-v28-5-1-live-core-schema-alignment',
  route: routePath,
  generated_at: new Date().toISOString(),
  failures
};

console.log(JSON.stringify(report, null, 2));
if (failures.length) process.exit(1);
