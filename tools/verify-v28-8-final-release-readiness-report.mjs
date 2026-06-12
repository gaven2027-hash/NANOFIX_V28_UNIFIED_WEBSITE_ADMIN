#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs';

const failures = [];
const warnings = [];

function read(filePath) {
  return existsSync(filePath) ? readFileSync(filePath, 'utf8') : '';
}

function must(condition, label) {
  console.log(`${condition ? '✅' : '❌'} ${label}`);
  if (!condition) failures.push(label);
}

function warn(condition, label) {
  console.log(`${condition ? '✅' : '⚠️'} ${label}`);
  if (!condition) warnings.push(label);
}

const report = read('docs/v28.8/final-release-readiness-report.md');
const phase13 = read('docs/v28.8/phase-13-final-release-gate-checklist.md');
const readyEndpoint = read('app/api/ready/route.ts');
const packageJson = read('package.json');
const verifyV28 = read('tools/verify-v28.mjs');
const e2eSmoke = read('tools/e2e-smoke.mjs');

console.log('\nV28.8 Final Release Readiness Report verification');
console.log('---------------------------------------------------');

must(Boolean(report), 'Final Release Readiness Report document exists');
must(report.includes('Final Release Readiness Report'), 'Report title exists');
must(report.includes('V28.8 is release-ready'), 'Report includes release-ready conclusion');
must(report.includes('V28.8 已具备发布准备条件'), 'Report includes Chinese readiness conclusion');
must(phase13.includes('Final Release Gate Checklist'), 'Phase 13 gate checklist exists before readiness report');

for (const phaseLabel of [
  'Phase 1: Production RBAC',
  'Phase 2: Service Requests',
  'Phase 3: Jobs',
  'Phase 4: Quotations',
  'Phase 5: Invoices',
  'Phase 6: Payments',
  'Phase 7: Warranties',
  'Phase 8: Customer Reviews',
  'Phase 9: Website Publish Approval',
  'Phase 10: Backup & Recovery',
  'Phase 11: AI / Social / Advertising',
  'Phase 12: System Health & Release Gate',
  'Phase 13: Final Release Gate Checklist'
]) {
  must(report.includes(phaseLabel), `Report includes completed phase baseline: ${phaseLabel}`);
}

for (const marker of [
  '#51',
  '64fca1f39a128acee1013e22a876620cf5c67d6c',
  '6a0ec1bff7265c5067c5a83d04d308404b4e9974',
  'Vercel Preview before merge: `Ready` / `success`',
  'Local main after merge: synced to `origin/main`',
  'Local working tree after merge: clean'
]) {
  must(report.includes(marker), `Report includes evidence marker: ${marker}`);
}

for (const readyField of [
  'ok: true',
  'environment: production',
  'env_ready: true',
  'database_ready: true',
  'optional_database_ready: true',
  'supabase_configured: true',
  'failed_core_tables: []',
  'failed_optional_tables: []',
  '2026-06-12T09:48:55.973Z'
]) {
  must(report.includes(readyField), `Report includes health field: ${readyField}`);
}

for (const table of [
  'profiles','customers','unified_intake','leads','service_requests','jobs','service_inspections','service_upload_reviews',
  'quotations','quotation_versions','quotation_acceptances','quotation_customer_responses','quotation_pdf_documents',
  'invoices','invoice_pdf_documents','payments','payment_intents','payment_webhook_events','payment_checkout_sessions',
  'warranties','warranty_pdf_documents','warranty_claims','customer_portal_requests','customer_document_feedback',
  'unified_tasks','task_events','workflow_settings','status_transition_logs','audit_logs','document_company_settings'
]) {
  must(report.includes(`\`${table}\``), `Report includes required table ${table}`);
  must(readyEndpoint.includes(`"${table}"`), `/api/ready checks required table ${table}`);
}

for (const table of ['automation_rules','notification_outbox','internal_inbox_messages','content_drafts','ai_logs','backup_jobs','app_modules','customer_account_claims','customer_record_links']) {
  must(report.includes(`\`${table}\``), `Report includes optional table ${table}`);
  must(readyEndpoint.includes(`"${table}"`), `/api/ready checks optional table ${table}`);
}

for (const validationMarker of [
  'node tools/verify-v28-8-phase-13-final-release-gate-checklist.mjs',
  'npm.cmd run quality:gate',
  'npm.cmd run verify',
  'npm.cmd run test:e2e:smoke',
  'auto-selected a non-conflicting port on Windows',
  'git status` was clean'
]) {
  must(report.includes(validationMarker), `Report includes local validation marker: ${validationMarker}`);
}

must(report.includes('Overall V28.8 release readiness score: `96/100`'), 'Report includes final readiness score');
must(report.includes('node tools/verify-v28-8-final-release-readiness-report.mjs'), 'Report exposes direct verifier command');
must(report.includes('V28.8 Final Release Note') && report.includes('V28.8 Production Health Report'), 'Report points to next final documents');
must(packageJson.includes('"quality:gate"') && packageJson.includes('"validate:predeploy"'), 'package.json exposes release gate commands');
must(verifyV28.includes('findAvailablePort') && verifyV28.includes('probe.listen(portNumber)'), 'verify-v28 keeps dynamic port selection');
must(e2eSmoke.includes('findAvailablePort') && e2eSmoke.includes('probe.listen(portNumber)'), 'e2e smoke keeps dynamic port selection');

warn(packageJson.includes('"verify:v28-8-final-release-readiness-report"'), 'package.json exposes final readiness report npm alias');

if (failures.length) {
  console.error(`\nV28.8 Final Release Readiness Report verification failed: ${failures.length} issue(s).`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(JSON.stringify({
  ok: true,
  verifier: 'verify-v28-8-final-release-readiness-report',
  failures,
  warnings,
  checked: {
    reportDocument: true,
    completedPhaseBaseline: true,
    mergeEvidence: true,
    productionHealthEvidence: true,
    tableEvidence: true,
    localValidationEvidence: true,
    nextDocuments: true
  }
}, null, 2));
