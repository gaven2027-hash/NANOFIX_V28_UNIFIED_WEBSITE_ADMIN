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

const report = read('docs/v28.8/production-health-report.md');
const releaseNote = read('docs/v28.8/final-release-note.md');
const readinessReport = read('docs/v28.8/final-release-readiness-report.md');
const readyEndpoint = read('app/api/ready/route.ts');
const packageJson = read('package.json');

console.log('\nV28.8 Production Health Report verification');
console.log('--------------------------------------------');

must(Boolean(report), 'Production Health Report document exists');
must(report.includes('Production Health Report'), 'Report title exists');
must(report.includes('生产健康报告'), 'Report has Chinese title');
must(releaseNote.includes('Final Release Note'), 'Final Release Note exists before health report');
must(readinessReport.includes('Final Release Readiness Report'), 'Final Release Readiness Report exists before health report');

for (const section of [
  'Summary',
  'Evidence',
  'Health result',
  'Required table result',
  'Optional table result',
  'Documents included in final set',
  'Verification command',
  'Completion criteria',
  'Closeout conclusion'
]) {
  must(report.includes(section), `Report includes section: ${section}`);
}

for (const evidence of [
  '#52',
  '#53',
  '8ebac0628f350b324ec47f4b912408f59d6a3bb1',
  '38184c821bc423448e6702caa7c7429df76417d6',
  'Local main after Final Release Note merge: synced to `origin/main`',
  'Local working tree after Final Release Note merge: clean'
]) {
  must(report.includes(evidence), `Report includes evidence: ${evidence}`);
}

for (const marker of [
  'ok: true',
  'environment: production',
  'env_ready: true',
  'database_ready: true',
  'optional_database_ready: true',
  'failed_core_tables: []',
  'failed_optional_tables: []',
  '2026-06-12T10:43:17.398Z'
]) {
  must(report.includes(marker), `Report includes health marker: ${marker}`);
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

for (const docPath of [
  'docs/v28.8/final-release-readiness-report.md',
  'docs/v28.8/final-release-note.md',
  'docs/v28.8/production-health-report.md'
]) {
  must(report.includes(docPath), `Report includes document path ${docPath}`);
}

must(report.includes('node tools/verify-v28-8-production-health-report.mjs'), 'Report exposes direct verifier command');
must(report.includes('V28.8 final documentation set is complete'), 'Report includes final documentation closeout');
must(readyEndpoint.includes('required_tables') && readyEndpoint.includes('optional_tables'), '/api/ready exposes table health fields');
must(packageJson.includes('"quality:gate"') && packageJson.includes('"validate:predeploy"'), 'package.json exposes release validation commands');

warn(packageJson.includes('"verify:v28-8-production-health-report"'), 'package.json exposes production health report npm alias');

if (failures.length) {
  console.error(`\nV28.8 Production Health Report verification failed: ${failures.length} issue(s).`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(JSON.stringify({
  ok: true,
  verifier: 'verify-v28-8-production-health-report',
  failures,
  warnings,
  checked: {
    reportDocument: true,
    evidence: true,
    healthSummary: true,
    requiredTables: true,
    optionalTables: true,
    finalDocumentSet: true
  }
}, null, 2));
