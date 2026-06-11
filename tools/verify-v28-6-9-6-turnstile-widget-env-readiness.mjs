import fs from 'node:fs';

const findings = [];
const read = (file) => fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';

const bridgePath = 'components/LegacyWebsitePage.tsx';
const handlerPath = 'lib/public-repair-request.ts';
const healthPath = 'lib/nanofix/health.ts';
const readyPath = 'app/api/ready/route.ts';

const bridge = read(bridgePath);
const handler = read(handlerPath);
const health = read(healthPath);
const ready = read(readyPath);

function add(severity, area, file, message, recommendation) {
  findings.push({ severity, area, file, message, recommendation });
}

function has(text, marker) {
  return text.includes(marker);
}

function count(severity) {
  return findings.filter((finding) => finding.severity === severity).length;
}

function requireMarker(text, marker, severity, area, file, recommendation) {
  if (!has(text, marker)) add(severity, area, file, `Missing marker: ${marker}`, recommendation);
}

if (!bridge) add('P0', 'frontend-bridge', bridgePath, 'LegacyWebsitePage bridge is missing.', 'Public website lead forms must retain the Turnstile/token bridge.');
if (!handler) add('P0', 'server-handler', handlerPath, 'Public repair handler is missing.', 'Server-side Turnstile verification must remain present.');
if (!health) add('P1', 'health-readiness', healthPath, 'System health file is missing.', 'Health endpoint should continue surfacing Turnstile pair readiness.');
if (!ready) add('P1', 'ready-readiness', readyPath, 'Ready endpoint file is missing.', 'Ready endpoint should continue surfacing Turnstile env readiness.');

const frontendMarkers = [
  ['NEXT_PUBLIC_TURNSTILE_SITE_KEY', 'frontend-env', 'Expose only the public Turnstile site key to the browser.'],
  ['window.nanofixTurnstileSiteKeyConfigured', 'frontend-env', 'Expose browser-side readiness evidence for diagnostics.'],
  ['cf_turnstile_response', 'token-field', 'Hidden token field must be posted to the public repair endpoint.'],
  ['data-turnstile-token-field', 'token-field', 'Token field should be discoverable in the DOM.'],
  ['data-nanofix-turnstile-container', 'widget-container', 'Widget container should be inserted into both public forms.'],
  ['https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit', 'script-load', 'Turnstile script must be loaded explicitly only when the public site key is configured.'],
  ['window.turnstile.render', 'widget-render', 'Widget must be rendered through Cloudflare Turnstile.'],
  ['callback: function(token)', 'widget-callback', 'Turnstile callback must copy token to cf_turnstile_response.'],
  ['expired-callback', 'widget-callback', 'Expired token must be cleared.'],
  ['error-callback', 'widget-callback', 'Errored token must be cleared.'],
  ['ensureTurnstileReadyForSubmit(form)', 'submit-gate', 'Submit handler must block when Turnstile is configured but no token is available.'],
  ['NANOFIX_TURNSTILE_REQUIRED', 'submit-gate', 'User-facing submission path should distinguish bot verification from generic failures.'],
  ['form#nanofix-lead-form, form#quote-page-form', 'form-scope', 'Both homepage and quote page lead forms must be covered.'],
  ["fetch('/api/public-repair-request'", 'submit-endpoint', 'Public form should continue posting to the hardened public repair endpoint.']
];

for (const [marker, area, recommendation] of frontendMarkers) {
  requireMarker(bridge, marker, 'P0', area, bridgePath, recommendation);
}

const serverMarkers = [
  ['cf_turnstile_response', 'server-token', 'Server schema must accept the token posted by the frontend.'],
  ['CLOUDFLARE_TURNSTILE_SECRET_KEY', 'server-secret', 'Server verification must use only the server-only Turnstile secret.'],
  ['challenges.cloudflare.com/turnstile/v0/siteverify', 'server-verify', 'Server must verify token through Cloudflare siteverify.'],
  ['remoteip', 'server-verify', 'Server verification should include remote IP when available.'],
  ['if (!secret) return true', 'optional-mode', 'Production must stay stable until the env pair is configured.'],
  ['Bot verification failed', 'server-fail', 'Failed Turnstile verification must block public submissions.']
];

for (const [marker, area, recommendation] of serverMarkers) {
  requireMarker(handler, marker, 'P0', area, handlerPath, recommendation);
}

const readinessMarkers = [
  ['CLOUDFLARE_TURNSTILE_SECRET_KEY', 'health-readiness', 'Health and ready endpoints should expose server secret readiness.'],
  ['NEXT_PUBLIC_TURNSTILE_SITE_KEY', 'health-readiness', 'Health and ready endpoints should expose public site key readiness.']
];

for (const [marker, area, recommendation] of readinessMarkers) {
  requireMarker(health, marker, 'P1', area, healthPath, recommendation);
  requireMarker(ready, marker, 'P1', area, readyPath, recommendation);
}

if (has(bridge, 'CLOUDFLARE_TURNSTILE_SECRET_KEY')) {
  add('P0', 'secret-boundary', bridgePath, 'Frontend bridge references the server-only Turnstile secret.', 'Never expose CLOUDFLARE_TURNSTILE_SECRET_KEY to browser code.');
}

if (has(bridge, 'SUPABASE_SERVICE_ROLE_KEY')) {
  add('P0', 'secret-boundary', bridgePath, 'Frontend bridge references Supabase service role key.', 'Keep service-role usage server-only.');
}

if (has(bridge, 'x-admin-role') || has(bridge, 'x-nanofix-role') || has(bridge, 'x-customer-id')) {
  add('P0', 'forgeable-headers', bridgePath, 'Frontend bridge contains forgeable role/customer header markers.', 'Public forms must not send role/customer impersonation headers.');
}

const report = {
  ok: count('P0') === 0,
  verifier: 'verify-v28-6-9-6-turnstile-widget-env-readiness',
  generated_at: '2026-06-11T03:15:00.000Z',
  branch: 'v28-6-9-6-turnstile-widget-env-readiness',
  baseline: 'main@7b899ab',
  scope: 'Frontend Turnstile widget bridge, token submission, server verification and readiness evidence.',
  summary: {
    findings_total: findings.length,
    p0: count('P0'),
    p1: count('P1'),
    p2: count('P2'),
    frontend_markers_checked: frontendMarkers.length,
    server_markers_checked: serverMarkers.length,
    readiness_markers_checked: readinessMarkers.length * 2
  },
  evidence: {
    frontend_bridge: bridgePath,
    server_handler: handlerPath,
    health_endpoint_source: healthPath,
    ready_endpoint_source: readyPath,
    browser_site_key_only: has(bridge, 'NEXT_PUBLIC_TURNSTILE_SITE_KEY') && !has(bridge, 'CLOUDFLARE_TURNSTILE_SECRET_KEY'),
    hidden_token_field: has(bridge, 'cf_turnstile_response'),
    widget_script_explicit_render: has(bridge, 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'),
    submit_gate: has(bridge, 'ensureTurnstileReadyForSubmit(form)') && has(bridge, 'NANOFIX_TURNSTILE_REQUIRED'),
    server_siteverify: has(handler, 'challenges.cloudflare.com/turnstile/v0/siteverify'),
    optional_until_env_pair_configured: has(handler, 'if (!secret) return true'),
    readiness_visible: has(health, 'CLOUDFLARE_TURNSTILE_SECRET_KEY') && has(health, 'NEXT_PUBLIC_TURNSTILE_SITE_KEY') && has(ready, 'CLOUDFLARE_TURNSTILE_SECRET_KEY') && has(ready, 'NEXT_PUBLIC_TURNSTILE_SITE_KEY')
  },
  findings
};

fs.writeFileSync('V28_6_9_6_TURNSTILE_WIDGET_ENV_READINESS_REPORT.json', `${JSON.stringify(report, null, 2)}\n`);
fs.writeFileSync('V28_6_9_6_TURNSTILE_WIDGET_ENV_READINESS_REPORT.md', [
  '# V28.6.9.6 Turnstile Widget + Env Pair Readiness Report',
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
  `- Frontend markers checked: ${report.summary.frontend_markers_checked}`,
  `- Server markers checked: ${report.summary.server_markers_checked}`,
  `- Readiness markers checked: ${report.summary.readiness_markers_checked}`,
  '',
  '## Evidence',
  '',
  `- Browser site key only: ${report.evidence.browser_site_key_only}`,
  `- Hidden token field: ${report.evidence.hidden_token_field}`,
  `- Widget explicit render: ${report.evidence.widget_script_explicit_render}`,
  `- Submit gate: ${report.evidence.submit_gate}`,
  `- Server siteverify: ${report.evidence.server_siteverify}`,
  `- Optional until env pair configured: ${report.evidence.optional_until_env_pair_configured}`,
  `- Readiness visible: ${report.evidence.readiness_visible}`,
  '',
  '## Findings',
  '',
  ...(findings.length ? findings.map((finding) => `- **${finding.severity} / ${finding.area}** ${finding.file}: ${finding.message} Recommendation: ${finding.recommendation}`) : ['- No findings.']),
  ''
].join('\n'));

console.log(JSON.stringify(report, null, 2));
if (!report.ok) process.exitCode = 1;
