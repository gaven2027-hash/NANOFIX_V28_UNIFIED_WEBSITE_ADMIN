import fs from 'node:fs';

const findings = [];
const read = (file) => fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';

const routePath = 'app/api/public-repair-request/route.ts';
const handlerPath = 'lib/public-repair-request.ts';
const securityPath = 'lib/nanofix/security.ts';
const healthPath = 'lib/nanofix/health.ts';
const jsonReportPath = 'V28_6_9_5_TURNSTILE_PUBLIC_FORM_HARDENING_REPORT.json';
const markdownReportPath = 'V28_6_9_5_TURNSTILE_PUBLIC_FORM_HARDENING_REPORT.md';

const route = read(routePath);
const handler = read(handlerPath);
const security = read(securityPath);
const health = read(healthPath);

function add(severity, area, file, message, recommendation) {
  findings.push({ severity, area, file, message, recommendation });
}

function has(text, marker) {
  return text.includes(marker);
}

function hasAny(text, markers) {
  return markers.some((marker) => has(text, marker));
}

function count(severity) {
  return findings.filter((finding) => finding.severity === severity).length;
}

function existingGeneratedAt() {
  try {
    const parsed = JSON.parse(read(jsonReportPath));
    return typeof parsed.generated_at === 'string' && parsed.generated_at ? parsed.generated_at : null;
  } catch {
    return null;
  }
}

function stableGeneratedAt() {
  return process.env.NANOFIX_REPORT_GENERATED_AT || existingGeneratedAt() || '2026-06-11T02:10:00.000Z';
}

if (!route) add('P0', 'public-route', routePath, 'Public repair request route is missing.', 'Restore the public API route before deploy.');
if (!handler) add('P0', 'public-handler', handlerPath, 'Public repair request handler is missing.', 'Keep all public form validation in a server-only handler.');
if (!security) add('P1', 'security-helpers', securityPath, 'Shared security helper file is missing.', 'Keep IP normalization, rate limit and webhook signature helpers available.');
if (!health) add('P1', 'health', healthPath, 'Health file is missing.', 'Keep Turnstile readiness represented in system health.');

if (route && !has(route, 'handlePublicRepairRequest(request)')) {
  add('P0', 'public-route', routePath, 'Route does not delegate to the hardened public form handler.', 'Route should stay thin and call handlePublicRepairRequest(request).');
}

const requiredHandlerMarkers = [
  ['schema', 'PublicRepairRequestSchema'],
  ['schema', 'z.string().trim().min(6).max(40)'],
  ['schema', 'pdpa_consent'],
  ['anti-spam', 'isLikelyBot'],
  ['anti-spam', 'website_honeypot'],
  ['anti-spam', 'company_website'],
  ['anti-spam', 'form_started_at'],
  ['turnstile', 'verifyTurnstile'],
  ['turnstile', 'CLOUDFLARE_TURNSTILE_SECRET_KEY'],
  ['turnstile', 'challenges.cloudflare.com/turnstile/v0/siteverify'],
  ['turnstile', 'remoteip'],
  ['rate-limit', 'checkRateLimit(request'],
  ['rate-limit', 'form_rate_limits'],
  ['rate-limit', 'fingerprint_hash'],
  ['rate-limit', 'blocked_until'],
  ['storage', 'createSupabaseAdminClient()'],
  ['storage', 'unified_intake'],
  ['storage', 'leads'],
  ['storage', 'service_requests'],
  ['audit', 'audit_logs'],
  ['audit', 'sanitizeForAudit'],
  ['uploads', 'detectMime'],
  ['uploads', 'lead-attachments'],
  ['uploads', 'lead_attachments'],
  ['outbox', 'integration_outbox'],
  ['outbox', 'ADMIN_REPAIR_REQUEST_WEBHOOK_SECRET']
];

for (const [area, marker] of requiredHandlerMarkers) {
  if (!has(handler, marker)) {
    add('P0', area, handlerPath, `Missing required public form hardening marker: ${marker}`, 'Keep public submissions protected by validation, anti-spam checks, Turnstile, rate limit, storage and audit evidence.');
  }
}

if (!hasAny(handler, ['cf_turnstile_response', 'cf-turnstile-response', 'turnstileToken'])) {
  add('P0', 'turnstile', handlerPath, 'No Turnstile response token field is accepted by the public form schema.', 'Accept a bounded Turnstile token field and verify it server-side before storage.');
}

if (has(handler, 'return ok({') && !has(handler, 'service_request_id')) {
  add('P0', 'storage', handlerPath, 'Successful public response does not expose the created service_request_id.', 'Return intake_id, lead_id and service_request_id for traceability.');
}

if (has(handler, 'select("*")') || has(handler, "select('*')")) {
  add('P0', 'field-whitelist', handlerPath, 'Public form handler uses wildcard select.', 'Use explicit select fields only for public submission storage return values.');
}

if (has(handler, 'SUPABASE_SERVICE_ROLE_KEY') || has(route, 'SUPABASE_SERVICE_ROLE_KEY')) {
  add('P0', 'secret-boundary', handlerPath, 'Public form code references the service-role env key directly.', 'Use server-only Supabase client factory and never expose or stringify service-role secrets.');
}

if (has(handler, 'x-admin-role') || has(handler, 'x-nanofix-role') || has(handler, 'x-customer-id')) {
  add('P0', 'forgeable-headers', handlerPath, 'Public form handler contains forgeable role/customer header markers.', 'Public submission routes must not trust caller-supplied actor headers.');
}

if (security) {
  for (const marker of ['clientIpFromRequest', 'cf-connecting-ip', 'x-forwarded-for', 'checkRateLimit', 'memoryBuckets', 'verifyWebhookSignature', 'timingSafeEqual']) {
    if (!has(security, marker)) {
      add('P1', 'security-helpers', securityPath, `Missing security helper marker: ${marker}`, 'Keep shared security primitives intact.');
    }
  }
}

if (health) {
  for (const marker of ['turnstileSecret', 'turnstileSiteKey', 'turnstilePairConfigured', 'hardeningBonus', 'CLOUDFLARE', 'NEXT_PUBLIC']) {
    if (!has(health, marker)) {
      add('P1', 'health', healthPath, `Missing Turnstile readiness marker: ${marker}`, 'Health should keep optional Turnstile readiness visible and scored.');
    }
  }
}

const report = {
  ok: count('P0') === 0,
  verifier: 'verify-v28-6-9-5-turnstile-public-form-hardening',
  generated_at: stableGeneratedAt(),
  branch: 'v28-6-9-5-turnstile-public-form-hardening',
  baseline: 'main@11a5399',
  scope: 'Public repair request anti-spam, Turnstile, rate-limit, upload validation, Supabase storage, audit and outbox verification.',
  summary: {
    findings_total: findings.length,
    p0: count('P0'),
    p1: count('P1'),
    p2: count('P2'),
    files_checked: [routePath, handlerPath, securityPath, healthPath].length,
    handler_markers_checked: requiredHandlerMarkers.length
  },
  evidence: {
    route: routePath,
    handler: handlerPath,
    shared_security: securityPath,
    health: healthPath,
    turnstile_server_verify: has(handler, 'challenges.cloudflare.com/turnstile/v0/siteverify'),
    turnstile_optional_until_env_configured: has(handler, 'if (!secret) return true'),
    public_form_rate_limit: has(handler, 'checkRateLimit(request') && has(handler, 'form_rate_limits'),
    honeypot_and_speed_trap: has(handler, 'website_honeypot') && has(handler, 'form_started_at'),
    storage_chain: ['unified_intake', 'leads', 'service_requests'].every((marker) => has(handler, marker)),
    audit_log: has(handler, 'audit_logs'),
    integration_outbox: has(handler, 'integration_outbox'),
    upload_magic_byte_validation: has(handler, 'detectMime') && has(handler, 'isJpeg') && has(handler, 'isPng') && has(handler, 'isPdf')
  },
  findings
};

fs.writeFileSync(jsonReportPath, JSON.stringify(report, null, 2));
fs.writeFileSync(markdownReportPath, [
  '# V28.6.9.5 Turnstile + Public Form Anti-Spam Hardening Report',
  '',
  `Generated: ${report.generated_at}`,
  '',
  `OK: ${report.ok}`,
  '',
  '## Summary',
  '',
  `- P0: ${report.summary.p0}`,
  `- P1: ${report.summary.p1}`,
  `- P2: ${report.summary.p2}`,
  `- Files checked: ${report.summary.files_checked}`,
  `- Handler markers checked: ${report.summary.handler_markers_checked}`,
  '',
  '## Evidence',
  '',
  `- Turnstile server verification: ${report.evidence.turnstile_server_verify}`,
  `- Turnstile optional until env configured: ${report.evidence.turnstile_optional_until_env_configured}`,
  `- Public form rate limit: ${report.evidence.public_form_rate_limit}`,
  `- Honeypot and speed trap: ${report.evidence.honeypot_and_speed_trap}`,
  `- Storage chain unified_intake → leads → service_requests: ${report.evidence.storage_chain}`,
  `- Audit log: ${report.evidence.audit_log}`,
  `- Integration outbox: ${report.evidence.integration_outbox}`,
  `- Upload magic-byte validation: ${report.evidence.upload_magic_byte_validation}`,
  '',
  '## Findings',
  '',
  ...(findings.length ? findings.map((finding) => `- **${finding.severity} / ${finding.area}** ${finding.file}: ${finding.message} Recommendation: ${finding.recommendation}`) : ['- No findings.']),
  ''
].join('\n'));

console.log(JSON.stringify(report, null, 2));
if (!report.ok) process.exitCode = 1;
