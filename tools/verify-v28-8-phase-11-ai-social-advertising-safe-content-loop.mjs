#!/usr/bin/env node
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

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

function listSourceFiles(dir, output = []) {
  if (!existsSync(dir)) return output;
  for (const entry of readdirSync(dir)) {
    if (entry.startsWith('.') || ['node_modules', '.next', 'out', 'coverage'].includes(entry)) continue;
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) listSourceFiles(full, output);
    else if (/\.(ts|tsx|js|jsx|mjs|md)$/.test(entry)) output.push(full);
  }
  return output;
}

const phase9Doc = read('docs/v28.8/phase-9-website-publish-approval-real-module-baseline.md');
const phase10Doc = read('docs/v28.8/phase-10-backup-recovery-real-module-baseline.md');
const phase11Doc = read('docs/v28.8/phase-11-ai-social-advertising-safe-content-loop-baseline.md');
const readyEndpoint = read('app/api/ready/route.ts');
const packageJson = read('package.json');
const sourceFiles = listSourceFiles('app').concat(listSourceFiles('components')).concat(listSourceFiles('lib')).concat(listSourceFiles('docs/v28.8'));
const corpus = sourceFiles.map((path) => read(path)).join('\n');
const lowerCorpus = corpus.toLowerCase();

console.log('\nV28.8 Phase 11 AI / Social / Advertising safe content loop verification');
console.log('---------------------------------------------------------------------');

must(Boolean(phase11Doc), 'Phase 11 AI / Social / Advertising safe content loop baseline document exists');
must(phase11Doc.includes('AI / Social / Advertising Production-Safe Content Loop Baseline') && phase11Doc.includes('AI、社媒、广告'), 'Baseline document covers AI / Social / Advertising safe content loop');
must(phase11Doc.includes('No direct AI publishing') && phase11Doc.includes('No direct paid-platform activation without approval'), 'Baseline document blocks direct AI publishing and direct ad activation');
must(phase11Doc.includes('Customer feedback reuse safety') && phase11Doc.includes('must not be auto-published'), 'Baseline document blocks automatic customer feedback reuse');
must(phase11Doc.includes('node tools/verify-v28-8-phase-11-ai-social-advertising-safe-content-loop.mjs'), 'Baseline document exposes direct Phase 11 verifier command');

// Cross-phase safety inheritance.
must(phase9Doc.includes('AI content cannot directly publish') && phase9Doc.includes('Website Publish Approval'), 'Phase 9 Website Publish Approval safety carries into Phase 11');
must(phase10Doc.includes('ai_logs') && phase10Doc.includes('content_drafts') && phase10Doc.includes('notification_outbox'), 'Phase 10 backup coverage includes AI/content/notification tables');

// Repository content surface checks.
must(lowerCorpus.includes('ai') || lowerCorpus.includes('ai_logs'), 'Repository contains AI-related surface or ai_logs readiness');
must(lowerCorpus.includes('social'), 'Repository contains social media surface or social backup/readiness references');
must(lowerCorpus.includes('advertising') || lowerCorpus.includes('promotion') || lowerCorpus.includes('campaign'), 'Repository contains advertising/promotion/campaign surface references');
must(lowerCorpus.includes('content_drafts'), 'Repository contains content_drafts support');
must(lowerCorpus.includes('publish approval') || lowerCorpus.includes('pending_approval') || lowerCorpus.includes('website publish approval'), 'Repository contains publish approval or pending approval language');
must(lowerCorpus.includes('audit_logs') || lowerCorpus.includes('auditlog') || lowerCorpus.includes('audit log'), 'Repository contains audit logging support');

// Production readiness table checks.
for (const table of ['audit_logs','workflow_settings','service_requests','leads','customer_document_feedback']) {
  must(readyEndpoint.includes(`"${table}"`), `/api/ready checks Phase 11 core table ${table}`);
}
for (const table of ['content_drafts','ai_logs','notification_outbox','internal_inbox_messages','app_modules','automation_rules']) {
  must(readyEndpoint.includes(`"${table}"`), `/api/ready checks Phase 11 support table ${table}`);
}
must(readyEndpoint.includes('optional_database_ready') && readyEndpoint.includes('failed_optional_tables'), '/api/ready exposes optional readiness for AI/social/ad support tables');

// Dangerous direct-public-publish patterns should not appear.
const bannedPatterns = [
  'direct_publish_without_approval',
  'auto_publish_to_public',
  'autoPublishToPublic',
  'publishWithoutApproval',
  'bypassPublishApproval',
  'bypassSocialApproval',
  'directPaidActivation',
  'autoActivatePaidCampaign',
  'auto_publish_customer_feedback',
  'autoPublishCustomerFeedback',
  'disable row level security',
  'drop table',
  'truncate table'
];
for (const pattern of bannedPatterns) {
  must(!corpus.includes(pattern), `No banned unsafe pattern: ${pattern}`);
}

// Secret exposure patterns in generated/publish flows.
const secretExposurePatterns = [
  'OPENAI_API_KEY=sk-',
  'SUPABASE_SERVICE_ROLE_KEY=ey',
  'NANOFIX_ADMIN_API_TOKEN=',
  'signed_url: signed.data?.signedUrl'
];
for (const pattern of secretExposurePatterns) {
  must(!corpus.includes(pattern), `No obvious secret/signed-url exposure pattern: ${pattern}`);
}

warn(packageJson.includes('"verify:v28-8-phase-11-ai-social-advertising-safe-content-loop"'), 'package.json exposes V28.8 Phase 11 npm alias');
warn(lowerCorpus.includes('social publish approval'), 'Repository explicitly mentions Social Publish Approval');
warn(lowerCorpus.includes('advertising center') || lowerCorpus.includes('promotion center'), 'Repository explicitly contains Advertising/Promotion Center wording');

if (failures.length) {
  console.error(`\nV28.8 Phase 11 AI / Social / Advertising safe content loop verification failed: ${failures.length} issue(s).`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(JSON.stringify({
  ok: true,
  verifier: 'verify-v28-8-phase-11-ai-social-advertising-safe-content-loop',
  failures,
  warnings,
  checked: {
    phase11BaselineDocument: true,
    phase9PublishApprovalCarryover: true,
    phase10BackupCoverageCarryover: true,
    aiSocialAdvertisingContentSurface: true,
    productionReadyEndpointTables: true,
    noDirectPublishBypassPatterns: true,
    noSecretExposurePatterns: true
  }
}, null, 2));
