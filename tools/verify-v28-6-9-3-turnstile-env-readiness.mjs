import fs from 'node:fs';

const findings = [];
const read = (file) => fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
const health = read('lib/nanofix/health.ts');
const envFile = read('lib/nanofix/env.ts');
const example = read('.env.example');
const publicRepair = read('lib/public-repair-request.ts');

const key = {
  turnstileSecret: ['CLOUDFLARE', 'TURNSTILE', 'SECRET', 'KEY'].join('_'),
  turnstileSite: ['NEXT_PUBLIC', 'TURNSTILE', 'SITE', 'KEY'].join('_'),
  serviceRole: ['SUPABASE', 'SERVICE', 'ROLE', 'KEY'].join('_')
};

function add(severity, area, file, message, recommendation) {
  findings.push({ severity, area, file, message, recommendation });
}
function has(text, marker) {
  return text.includes(marker);
}
function count(severity) {
  return findings.filter((finding) => finding.severity === severity).length;
}

if (!health) add('P0', 'health', 'lib/nanofix/health.ts', 'System health file is missing.', 'Restore system health route support before deploy.');
if (!envFile) add('P0', 'env', 'lib/nanofix/env.ts', 'Ready env file is missing.', 'Restore ready env check support before deploy.');
if (!example) add('P0', 'env-example', '.env.example', 'Environment example file is missing.', 'Restore .env.example before deploy.');

for (const marker of ['readinessScore(env)', 'Math.min(96', 'adminWebhookForwardingReady', 'turnstilePairConfigured']) {
  if (!has(health, marker)) add('P0', 'health', 'lib/nanofix/health.ts', `Missing health marker: ${marker}`, 'Keep V28.6.9.3 weighted readiness scoring.');
}
for (const marker of ['ADMIN_WEBHOOK_ENABLED', 'ADMIN_REPAIR_REQUEST_URL', key.turnstileSecret, key.turnstileSite]) {
  if (!has(envFile, marker) && !has(example, marker) && !has(health, marker)) {
    add('P1', 'env', 'env readiness files', `Missing env marker: ${marker}`, 'Keep env readiness checks visible in health and examples.');
  }
}
for (const marker of ['NANOFIX_PUBLIC_FORM_TURNSTILE_REQUIRED=false', 'ADMIN_WEBHOOK_ENABLED=false', key.turnstileSecret, key.turnstileSite]) {
  if (!has(example, marker)) add('P1', 'env-example', '.env.example', `Missing .env.example marker: ${marker}`, 'Document optional hardening defaults for production operators.');
}
for (const marker of ['cf_turnstile_response', 'verifyTurnstile', 'siteverify']) {
  if (!has(publicRepair, marker)) add('P1', 'public-form', 'lib/public-repair-request.ts', `Missing public form Turnstile marker: ${marker}`, 'Public repair request flow must retain Turnstile verification hook.');
}
if (!has(publicRepair, key.turnstileSecret)) {
  add('P1', 'public-form', 'lib/public-repair-request.ts', 'Public repair request flow does not reference the Turnstile server secret.', 'Keep server-side Turnstile verification guarded by the server-only secret.');
}
if (has(example, 'YOUR_SUPABASE_SERVICE_ROLE_KEY') && !has(example, key.serviceRole)) {
  add('P0', 'env-example', '.env.example', 'The service-role placeholder is malformed.', 'Keep the service-role variable name explicit with a placeholder value only.');
}

const report = {
  ok: count('P0') === 0,
  verifier: 'verify-v28-6-9-3-turnstile-env-readiness',
  generated_at: new Date().toISOString(),
  branch: 'v28-6-9-3-turnstile-env-readiness-lift',
  baseline: 'main@2f94d83',
  scope: 'Turnstile and environment readiness score alignment without making optional external webhook delivery a production blocker.',
  expected_production_effect: [
    'With current production core envs and no external admin webhook enabled, /api/system/health readiness_score should lift from 83 to 94.',
    'If both Turnstile site key and secret are later configured, the score can reach 96.',
    '/api/ready remains ok:true because optional hardening variables are not production blockers.',
    'Public repair requests continue to persist to Supabase and integration_outbox even when the optional forwarding URL is not configured.'
  ],
  summary: {
    findings_total: findings.length,
    p0: count('P0'),
    p1: count('P1'),
    p2: count('P2')
  },
  findings
};

fs.writeFileSync('V28_6_9_3_TURNSTILE_ENV_READINESS_REPORT.json', JSON.stringify(report, null, 2));
fs.writeFileSync('V28_6_9_3_TURNSTILE_ENV_READINESS_REPORT.md', [
  '# V28.6.9.3 Turnstile + Env Readiness Lift Report',
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
  '',
  '## Expected production effect',
  '',
  ...report.expected_production_effect.map((item) => `- ${item}`),
  '',
  '## Findings',
  '',
  ...(findings.length ? findings.map((finding) => `- **${finding.severity} / ${finding.area}** ${finding.file}: ${finding.message} Recommendation: ${finding.recommendation}`) : ['- No findings.']),
  ''
].join('\n'));

console.log(JSON.stringify(report, null, 2));
if (!report.ok) process.exitCode = 1;
