#!/usr/bin/env node
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const failures = [];
const warnings = [];
const findings = [];

const skipDirs = new Set(['.git', '.next', '.vercel', 'node_modules', 'out', 'dist', 'coverage']);
const textExt = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.json', '.md']);

function walk(dir) {
  if (!existsSync(dir)) return [];
  const out = [];
  for (const entry of readdirSync(dir)) {
    if (skipDirs.has(entry)) continue;
    const full = path.join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) out.push(...walk(full));
    else if (textExt.has(path.extname(full))) out.push(full);
  }
  return out;
}

function rel(file) {
  return path.relative(root, file).replaceAll('\\', '/');
}

function read(file) {
  return existsSync(file) ? readFileSync(file, 'utf8') : '';
}

function must(condition, label) {
  console.log(`${condition ? '✅' : '❌'} ${label}`);
  if (!condition) failures.push(label);
}

function warn(condition, label) {
  console.log(`${condition ? '✅' : '⚠️'} ${label}`);
  if (!condition) warnings.push(label);
}

function addFinding(level, file, label) {
  findings.push({ level, file, label });
}

function fileMatches(file, patterns) {
  const name = rel(file);
  const body = read(file);
  return patterns.some((pattern) => pattern.test(name) || pattern.test(body));
}

const files = walk(root);
const sourceFiles = files.filter((file) => {
  const name = rel(file);
  return (
    name.startsWith('app/') ||
    name.startsWith('components/') ||
    name.startsWith('lib/') ||
    name.startsWith('tools/') ||
    name.startsWith('docs/v28.8/') ||
    name.startsWith('docs/v28.9/') ||
    name === 'package.json'
  );
});

console.log('\nV28.9 Auto Global Repair / Scan');
console.log('--------------------------------');

const packageJson = read(path.join(root, 'package.json'));
const readyEndpoint = read(path.join(root, 'app/api/ready/route.ts'));
const apiFiles = sourceFiles.filter((file) => rel(file).startsWith('app/api/') && /route\.(ts|tsx|js|jsx)$/.test(rel(file)));
const adminFiles = sourceFiles.filter((file) => rel(file).includes('/admin') || rel(file).startsWith('app/admin'));
const customerFiles = sourceFiles.filter((file) => rel(file).includes('customer') || rel(file).includes('portal'));
const aiSurfaceFiles = sourceFiles.filter((file) => fileMatches(file, [/ai[-_\/]?/i, /AI Intelligence/i, /ai_logs/i, /content_drafts/i, /content draft/i]));
const socialSurfaceFiles = sourceFiles.filter((file) => fileMatches(file, [/social/i, /Facebook|Instagram|TikTok|YouTube|Google Business Profile|Xiaohongshu/i]));
const advertisingSurfaceFiles = sourceFiles.filter((file) => fileMatches(file, [/advertising/i, /ads? center/i, /campaign/i, /paid[-_\s]?media/i, /promotion/i]));
const websiteCmsFiles = sourceFiles.filter((file) => fileMatches(file, [/website[-_\/]management/i, /CMS/i, /content_drafts/i, /publish approval/i]));
const serviceOperationsFiles = sourceFiles.filter((file) => fileMatches(file, [/service[-_\/]operations/i, /service_requests/i, /jobs/i, /quotations/i, /invoices/i, /payments/i, /warranties/i]));
const customerPortalFiles = sourceFiles.filter((file) => fileMatches(file, [/customer[-_\/]portal/i, /customer_portal/i, /customer_document_feedback/i]));

const corpus = sourceFiles.map((file) => read(file)).join('\n');
const lowerCorpus = corpus.toLowerCase();

must(sourceFiles.length > 0, 'Repository source files are visible to the scanner');
must(apiFiles.length > 0, 'API route files are visible to the scanner');
must(Boolean(packageJson), 'package.json is readable');
must(Boolean(readyEndpoint), 'app/api/ready/route.ts is readable');

const unsafePublishPatterns = [
  /direct_publish_without_approval/i,
  /auto_publish_to_public/i,
  /autoPublishToPublic/,
  /publishWithoutApproval/,
  /bypassPublishApproval/,
  /bypassSocialApproval/,
  /directPaidActivation/,
  /autoActivatePaidCampaign/,
  /auto_publish_customer_feedback/i,
  /autoPublishCustomerFeedback/,
  /activatePaidCampaignWithoutApproval/,
  /publishSocialPostWithoutReview/,
  /publishWebsiteContentWithoutApproval/,
  /customerFeedbackAutoPublish/
];

const runtimeSourceFiles = sourceFiles.filter((file) => {
  const name = rel(file);
  return !name.startsWith('docs/') && !name.startsWith('tools/');
});

for (const file of runtimeSourceFiles) {
  const name = rel(file);
  const body = read(file);
  if (!body) continue;

  if (/x-nanofix-role|x-admin-role/i.test(body)) {
    addFinding('P1', name, 'front-controllable role header reference');
  }

  if (/select\s*\(\s*['"`]\*['"`]\s*\)/.test(body)) {
    addFinding('P2', name, 'broad Supabase select star pattern');
  }

  if (name.startsWith('app/') && !name.startsWith('app/api/') && /SUPABASE_SERVICE_ROLE_KEY|service_role/i.test(body)) {
    addFinding('P0', name, 'server-only Supabase key marker outside API route');
  }

  if (name.startsWith('app/') && /localStorage\.|sessionStorage\./.test(body) && /token|role|admin/i.test(body)) {
    addFinding('P2', name, 'browser storage token or role marker');
  }

  if (unsafePublishPatterns.some((pattern) => pattern.test(body))) {
    addFinding('P1', name, 'AI/Social/Ads direct publish or paid activation bypass marker');
  }

  if (/OPENAI_API_KEY\s*=\s*['"`]?sk-|SUPABASE_SERVICE_ROLE_KEY\s*=\s*['"`]?ey|NANOFIX_ADMIN_API_TOKEN\s*=\s*['"`]?[A-Za-z0-9_-]{16,}/.test(body)) {
    addFinding('P0', name, 'obvious secret literal assignment marker');
  }
}

const p0 = findings.filter((item) => item.level === 'P0');
const p1 = findings.filter((item) => item.level === 'P1');
const p2 = findings.filter((item) => item.level === 'P2');

must(p0.length === 0, 'No P0 source findings from automatic scan');
must(p1.length === 0, 'No P1 source findings from automatic scan');
warn(p2.length === 0, 'No P2 source findings from automatic scan');

for (const scriptName of ['quality:gate', 'validate:predeploy', 'build:ci', 'test:e2e:smoke']) {
  must(packageJson.includes(`"${scriptName}"`), `package.json exposes ${scriptName}`);
}

for (const table of [
  'profiles','customers','unified_intake','leads','service_requests','jobs','service_inspections','service_upload_reviews',
  'quotations','quotation_versions','quotation_acceptances','quotation_customer_responses','quotation_pdf_documents','invoices',
  'invoice_pdf_documents','payments','payment_intents','payment_webhook_events','payment_checkout_sessions','warranties',
  'warranty_pdf_documents','warranty_claims','customer_portal_requests','customer_document_feedback','unified_tasks',
  'task_events','workflow_settings','status_transition_logs','audit_logs','document_company_settings'
]) {
  must(readyEndpoint.includes(`"${table}"`), `/api/ready checks required table ${table}`);
}

for (const table of ['automation_rules','notification_outbox','internal_inbox_messages','content_drafts','ai_logs','backup_jobs','app_modules','customer_account_claims','customer_record_links']) {
  must(readyEndpoint.includes(`"${table}"`), `/api/ready checks optional table ${table}`);
}

for (const docPath of [
  'docs/v28.8/final-release-readiness-report.md',
  'docs/v28.8/final-release-note.md',
  'docs/v28.8/production-health-report.md',
  'docs/v28.9/auto-global-repair-scope.md'
]) {
  must(existsSync(path.join(root, docPath)), `${docPath} exists`);
}

console.log('\nV28.9 AI / Social / Advertising coverage');
console.log('-----------------------------------------');

must(adminFiles.length > 0, 'Admin source surface exists');
must(customerFiles.length > 0, 'Customer or portal source surface exists');
must(aiSurfaceFiles.length > 0, 'AI Intelligence / ai_logs / content draft surface is visible to scanner');
must(socialSurfaceFiles.length > 0, 'Social Media Management surface is visible to scanner');
must(advertisingSurfaceFiles.length > 0, 'Advertising / campaign / promotion surface is visible to scanner');
must(websiteCmsFiles.length > 0, 'Website Management / CMS / publish approval surface is visible to scanner');
must(serviceOperationsFiles.length > 0, 'Service Operations surface is visible to scanner');
must(customerPortalFiles.length > 0, 'Customer Portal surface is visible to scanner');

for (const marker of [
  'content_drafts',
  'ai_logs',
  'notification_outbox',
  'internal_inbox_messages',
  'automation_rules',
  'audit_logs'
]) {
  must(lowerCorpus.includes(marker), `AI/Social/Ads support marker exists in corpus: ${marker}`);
}

for (const marker of [
  'publish approval',
  'draft',
  'review',
  'approval',
  'schedule',
  'campaign',
  'lead',
  'service_requests'
]) {
  must(lowerCorpus.includes(marker), `Operational workflow marker exists in corpus: ${marker}`);
}

const runtimeCorpus = runtimeSourceFiles.map((file) => read(file)).join('\n');
must(!unsafePublishPatterns.some((pattern) => pattern.test(runtimeCorpus)), 'No AI/Social/Ads direct publish bypass patterns in runtime source corpus');
must(lowerCorpus.includes('website publish approval') || lowerCorpus.includes('pending_approval'), 'Website publishing stays approval-gated');
must(lowerCorpus.includes('must not auto-publish') || lowerCorpus.includes('must not be auto-published') || lowerCorpus.includes('no direct ai publishing'), 'AI/customer feedback public reuse remains approval-gated');
must(lowerCorpus.includes('no direct paid-platform activation without approval') || lowerCorpus.includes('paid ad') || lowerCorpus.includes('advertising'), 'Advertising activation remains approval-gated or non-direct');

console.log('\nFinding summary');
console.log(JSON.stringify({ p0: p0.length, p1: p1.length, p2: p2.length, findings: findings.slice(0, 25) }, null, 2));

if (failures.length) {
  console.error(`\nV28.9 Auto Global Repair scan failed: ${failures.length} issue(s).`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(JSON.stringify({
  ok: true,
  verifier: 'v28-9-auto-global-repair',
  failures,
  warnings,
  checked: {
    sourceFiles: sourceFiles.length,
    apiRoutes: apiFiles.length,
    adminSurface: adminFiles.length,
    customerSurface: customerFiles.length,
    aiSurface: aiSurfaceFiles.length,
    socialSurface: socialSurfaceFiles.length,
    advertisingSurface: advertisingSurfaceFiles.length,
    websiteCmsSurface: websiteCmsFiles.length,
    serviceOperationsSurface: serviceOperationsFiles.length,
    customerPortalSurface: customerPortalFiles.length,
    p0: p0.length,
    p1: p1.length,
    p2: p2.length
  }
}, null, 2));
