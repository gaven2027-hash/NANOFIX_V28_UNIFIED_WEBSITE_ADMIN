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

const phase12Doc = read('docs/v28.8/phase-12-system-health-release-gate-baseline.md');
const readyEndpoint = read('app/api/ready/route.ts');
const envFile = read('lib/nanofix/env.ts');
const packageJson = read('package.json');
const previousPhaseDoc = read('docs/v28.8/phase-11-ai-social-advertising-safe-content-loop-baseline.md');
const repositoryCorpus = [phase12Doc, readyEndpoint, envFile, packageJson, previousPhaseDoc].join('\n');

console.log('\nV28.8 Phase 12 System Health & Release Gate verification');
console.log('---------------------------------------------------------');

must(Boolean(phase12Doc), 'Phase 12 System Health & Release Gate baseline document exists');
must(phase12Doc.includes('System Health & Release Gate Baseline') && phase12Doc.includes('系统健康检查与发布门禁'), 'Baseline document covers system health and release gate');
must(phase12Doc.includes('node tools/verify-v28-8-phase-12-system-health-release-gate.mjs'), 'Baseline document exposes direct Phase 12 verifier command');
must(phase12Doc.includes('expected head SHA') && phase12Doc.includes('production `/api/ready` remains healthy'), 'Baseline document requires expected head SHA and production ready evidence');
must(previousPhaseDoc.includes('AI / Social / Advertising Production-Safe Content Loop Baseline'), 'Phase 11 baseline is present before Phase 12');

// Ready endpoint shape and semantics.
must(readyEndpoint.includes('export const dynamic = "force-dynamic"'), '/api/ready is force-dynamic');
must(readyEndpoint.includes('coreRequiredTables') && readyEndpoint.includes('optionalModuleTables'), '/api/ready separates core and optional tables');
must(readyEndpoint.includes('cache: "no-store"'), '/api/ready uses no-store Supabase REST checks');
must(readyEndpoint.includes('failed_core_tables') && readyEndpoint.includes('failed_optional_tables'), '/api/ready exposes failed table arrays');
must(readyEndpoint.includes('database_ready') && readyEndpoint.includes('optional_database_ready'), '/api/ready exposes core and optional database readiness');
must(readyEndpoint.includes('{ status: ok ? 200 : 503 }'), '/api/ready returns 503 when core health fails');
must(readyEndpoint.includes('supabase_configured') && readyEndpoint.includes('required_tables') && readyEndpoint.includes('optional_tables'), '/api/ready exposes Supabase configuration and table check details');
must(readyEndpoint.includes('timestamp: new Date().toISOString()'), '/api/ready exposes timestamp');

// Core tables.
for (const table of [
  'profiles','customers','unified_intake','leads','service_requests','jobs','service_inspections','service_upload_reviews',
  'quotations','quotation_versions','quotation_acceptances','quotation_customer_responses','quotation_pdf_documents',
  'invoices','invoice_pdf_documents','payments','payment_intents','payment_webhook_events','payment_checkout_sessions',
  'warranties','warranty_pdf_documents','warranty_claims','customer_portal_requests','customer_document_feedback',
  'unified_tasks','task_events','workflow_settings','status_transition_logs','audit_logs','document_company_settings'
]) {
  must(readyEndpoint.includes(`"${table}"`), `/api/ready checks core table ${table}`);
}

// Optional/module tables.
for (const table of ['automation_rules','notification_outbox','internal_inbox_messages','content_drafts','ai_logs','backup_jobs','app_modules','customer_account_claims','customer_record_links']) {
  must(readyEndpoint.includes(`"${table}"`), `/api/ready checks optional/module table ${table}`);
}

// Environment readiness.
for (const envName of ['NEXT_PUBLIC_SITE_URL','NEXT_PUBLIC_SUPABASE_URL','SUPABASE_URL','NANOFIX_WEBHOOK_SECRET','NEXT_PUBLIC_MEMBER_PORTAL_URL']) {
  must(envFile.includes(envName), `Environment gate checks ${envName}`);
}
must(envFile.includes('NEXT_PUBLIC') && envFile.includes('SUPABASE') && envFile.includes('ANON') && envFile.includes('KEY'), 'Environment gate checks NEXT_PUBLIC_SUPABASE_ANON_KEY without hardcoding the full key string');
must(envFile.includes('SUPABASE') && envFile.includes('SERVICE') && envFile.includes('ROLE') && envFile.includes('KEY'), 'Environment gate checks SUPABASE_SERVICE_ROLE_KEY without hardcoding the full key string');
must(envFile.includes('productionEnvIsReady') && envFile.includes('requiredForProduction'), 'Environment gate exposes productionEnvIsReady required-env logic');
must(envFile.includes('NANOFIX_ADMIN_TOKEN_FALLBACK_ENABLED') && envFile.includes('Secure production default is false'), 'Environment gate documents secure admin token fallback default');
must(envFile.includes('Never expose in browser code'), 'Environment gate documents server-only service role safety');

// Package release gate scripts.
for (const scriptName of ['validate:predeploy','quality:gate','validate:ci','audit:prod','typecheck','lint','build:ci','test:e2e:smoke','check:staging','validate:platform']) {
  must(packageJson.includes(`"${scriptName}"`), `package.json exposes release gate script ${scriptName}`);
}
must(packageJson.includes('npm audit --omit=dev'), 'Release gate includes production npm audit');
must(packageJson.includes('tsc --noEmit'), 'Release gate includes TypeScript no-emit check');
must(packageJson.includes('eslint .'), 'Release gate includes ESLint check');
must(packageJson.includes('next build'), 'Release gate includes Next.js build check');
must(packageJson.includes('tools/e2e-smoke.mjs'), 'Release gate includes E2E smoke test');
must(packageJson.includes('staging-supabase-check.mjs'), 'Release gate includes staging Supabase check');
must(packageJson.includes('deploy-readiness-check.mjs'), 'Release gate includes deploy readiness check');

// No destructive/bypass release patterns in release-gate files.
for (const pattern of [
  'disable row level security',
  'drop table',
  'truncate table',
  'reset production supabase',
  'bypassPublishApproval',
  'bypassSocialApproval',
  'autoActivatePaidCampaign',
  'publishWithoutApproval',
  'force merge without checks'
]) {
  must(!repositoryCorpus.includes(pattern), `No release-gate bypass/destructive pattern: ${pattern}`);
}

warn(packageJson.includes('"verify:v28-8-phase-12-system-health-release-gate"'), 'package.json exposes V28.8 Phase 12 npm alias');
warn(packageJson.includes('validate:predeploy') && packageJson.includes('validate:platform'), 'Full predeploy/platform validation scripts are present');

if (failures.length) {
  console.error(`\nV28.8 Phase 12 System Health & Release Gate verification failed: ${failures.length} issue(s).`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(JSON.stringify({
  ok: true,
  verifier: 'verify-v28-8-phase-12-system-health-release-gate',
  failures,
  warnings,
  checked: {
    phase12BaselineDocument: true,
    readyEndpointHealthShape: true,
    coreTableReadiness: true,
    optionalModuleReadiness: true,
    productionEnvReadiness: true,
    packageReleaseGates: true,
    noDestructiveOrBypassPatterns: true
  }
}, null, 2));
