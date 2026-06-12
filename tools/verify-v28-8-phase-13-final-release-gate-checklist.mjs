#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs';

const failures = [];
const warnings = [];

function read(path) {
  return existsSync(path) ? readFileSync(path, 'utf8') : '';
}

function must(ok, label) {
  console.log(`${ok ? '✅' : '❌'} ${label}`);
  if (!ok) failures.push(label);
}

function warn(ok, label) {
  console.log(`${ok ? '✅' : '⚠️'} ${label}`);
  if (!ok) warnings.push(label);
}

const phase13Doc = read('docs/v28.8/phase-13-final-release-gate-checklist.md');
const phase12Doc = read('docs/v28.8/phase-12-system-health-release-gate-baseline.md');
const readyEndpoint = read('app/api/ready/route.ts');
const packageJson = read('package.json');
const envFile = read('lib/nanofix/env.ts');
const corpus = [phase13Doc, phase12Doc, readyEndpoint, packageJson, envFile].join('\n');

console.log('\nV28.8 Phase 13 Final Release Gate Checklist verification');
console.log('---------------------------------------------------------');

must(Boolean(phase13Doc), 'Phase 13 Final Release Gate Checklist document exists');
must(phase13Doc.includes('Final Release Gate Checklist') && phase13Doc.includes('最终 V28.8 发布门禁清单'), 'Phase 13 document covers final release gate checklist');
must(phase13Doc.includes('node tools/verify-v28-8-phase-13-final-release-gate-checklist.mjs'), 'Phase 13 document exposes direct verifier command');
must(phase12Doc.includes('System Health & Release Gate Baseline'), 'Phase 12 baseline exists before Phase 13');

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
  must(phase13Doc.includes(phaseLabel), `Phase evidence checklist includes ${phaseLabel}`);
}

for (const scriptName of ['validate:predeploy','quality:gate','validate:ci','audit:prod','typecheck','lint','build:ci','test:e2e:smoke','check:staging','validate:platform']) {
  must(phase13Doc.includes(`npm run ${scriptName}`), `Final checklist requires command npm run ${scriptName}`);
  must(packageJson.includes(`"${scriptName}"`), `package.json exposes ${scriptName}`);
}

for (const readyField of ['ok','environment','env_ready','database_ready','optional_database_ready','supabase_configured','failed_core_tables','failed_optional_tables','required_tables','optional_tables']) {
  must(phase13Doc.includes(readyField), `Final checklist requires production ready field ${readyField}`);
  must(readyEndpoint.includes(readyField), `/api/ready exposes field ${readyField}`);
}

for (const table of [
  'profiles','customers','unified_intake','leads','service_requests','jobs','service_inspections','service_upload_reviews',
  'quotations','quotation_versions','quotation_acceptances','quotation_customer_responses','quotation_pdf_documents',
  'invoices','invoice_pdf_documents','payments','payment_intents','payment_webhook_events','payment_checkout_sessions',
  'warranties','warranty_pdf_documents','warranty_claims','customer_portal_requests','customer_document_feedback',
  'unified_tasks','task_events','workflow_settings','status_transition_logs','audit_logs','document_company_settings'
]) {
  must(phase13Doc.includes(`\`${table}\``), `Final checklist includes required table ${table}`);
  must(readyEndpoint.includes(`"${table}"`), `/api/ready checks required table ${table}`);
}

for (const table of ['automation_rules','notification_outbox','internal_inbox_messages','content_drafts','ai_logs','backup_jobs','app_modules','customer_account_claims','customer_record_links']) {
  must(phase13Doc.includes(`\`${table}\``), `Final checklist includes optional table ${table}`);
  must(readyEndpoint.includes(`"${table}"`), `/api/ready checks optional table ${table}`);
}

for (const phrase of [
  'Supabase production reset remains prohibited',
  'RLS remains enabled',
  'Customer portal ownership checks must remain enforced',
  'AI, social and advertising drafts must not auto-publish',
  'Website Publish Approval must remain the public website publishing path',
  'Emergency admin token fallback remains disabled by default in production'
]) {
  must(phase13Doc.includes(phrase), `Final checklist includes safety phrase: ${phrase}`);
}

must(packageJson.includes('npm audit --omit=dev'), 'Final release package gate includes production npm audit');
must(packageJson.includes('tsc --noEmit'), 'Final release package gate includes TypeScript no-emit');
must(packageJson.includes('eslint .'), 'Final release package gate includes ESLint');
must(packageJson.includes('next build'), 'Final release package gate includes Next build');
must(packageJson.includes('tools/e2e-smoke.mjs'), 'Final release package gate includes E2E smoke test');
must(envFile.includes('productionEnvIsReady') && envFile.includes('requiredForProduction'), 'Final release env gate exposes productionEnvIsReady');
must(envFile.includes('Secure production default is false'), 'Final release env gate documents secure token fallback default');

for (const pattern of [
  'force merge without checks',
  'autoPublishToPublic',
  'publishWithoutApproval',
  'bypassPublishApproval',
  'bypassSocialApproval',
  'autoActivatePaidCampaign'
]) {
  must(!corpus.includes(pattern), `No final-release bypass pattern: ${pattern}`);
}

warn(packageJson.includes('"verify:v28-8-phase-13-final-release-gate-checklist"'), 'package.json exposes V28.8 Phase 13 npm alias');
warn(phase13Doc.includes('Production smoke-test checklist'), 'Phase 13 points to production smoke-test checklist next');

if (failures.length) {
  console.error(`\nV28.8 Phase 13 Final Release Gate Checklist verification failed: ${failures.length} issue(s).`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(JSON.stringify({
  ok: true,
  verifier: 'verify-v28-8-phase-13-final-release-gate-checklist',
  failures,
  warnings,
  checked: {
    phase13ChecklistDocument: true,
    priorPhaseEvidenceChecklist: true,
    packageReleaseCommands: true,
    productionReadyFields: true,
    requiredTableChecklist: true,
    optionalTableChecklist: true,
    finalSafetyChecklist: true,
    noFinalReleaseBypassPatterns: true
  }
}, null, 2));
