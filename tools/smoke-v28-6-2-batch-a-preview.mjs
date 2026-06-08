import fs from 'node:fs';
import path from 'node:path';

const baseUrlRaw = process.env.V28_6_SMOKE_BASE_URL || process.env.PREVIEW_BASE_URL || '';
const allowInvalidPost = process.env.V28_6_SMOKE_ALLOW_INVALID_POST === '1';
const root = process.cwd();
const jsonReport = 'V28_6_2_BATCH_A_PREVIEW_SMOKE_REPORT.json';
const mdReport = 'V28_6_2_BATCH_A_PREVIEW_SMOKE_REPORT.md';

function normalizeBaseUrl(value) {
  const trimmed = String(value || '').trim();
  if (!trimmed) return '';
  return trimmed.replace(/\/+$/, '');
}

const baseUrl = normalizeBaseUrl(baseUrlRaw);

function nowIso() {
  return new Date().toISOString();
}

function url(pathname) {
  return `${baseUrl}${pathname.startsWith('/') ? pathname : `/${pathname}`}`;
}

async function request(pathname, init = {}) {
  const started = Date.now();
  try {
    const response = await fetch(url(pathname), {
      redirect: 'manual',
      ...init,
      headers: {
        accept: 'application/json,text/plain,*/*',
        ...(init.headers || {})
      }
    });
    const text = await response.text().catch(() => '');
    let json = null;
    try { json = text ? JSON.parse(text) : null; } catch { json = null; }
    return {
      ok: response.ok,
      status: response.status,
      redirected: response.status >= 300 && response.status < 400,
      content_type: response.headers.get('content-type') || '',
      duration_ms: Date.now() - started,
      body_preview: text.slice(0, 240),
      json
    };
  } catch (error) {
    return {
      ok: false,
      status: 0,
      redirected: false,
      content_type: '',
      duration_ms: Date.now() - started,
      body_preview: '',
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

function pass(name, response, expectation, extra = {}) {
  return { name, pass: true, expectation, response, ...extra };
}

function fail(name, response, expectation, extra = {}) {
  return { name, pass: false, expectation, response, ...extra };
}

function isBlockedStatus(status) {
  return [401, 403, 405, 307, 308].includes(status);
}

async function checkReady() {
  const response = await request('/api/ready');
  const ok = response.status === 200 && response.json && response.json.ok === true;
  return ok
    ? pass('api_ready', response, '/api/ready returns 200 and ok:true')
    : fail('api_ready', response, '/api/ready must return 200 and ok:true');
}

async function checkHealth() {
  const response = await request('/api/system/health');
  const ok = response.status === 200 && response.json && response.json.ok === true;
  return ok
    ? pass('system_health', response, '/api/system/health returns 200 and ok:true')
    : fail('system_health', response, '/api/system/health must return 200 and ok:true');
}

async function checkBlockedGet(name, pathname) {
  const response = await request(pathname);
  const ok = isBlockedStatus(response.status) || !response.ok;
  return ok
    ? pass(name, response, `${pathname} must not return unauthenticated 200 success`)
    : fail(name, response, `${pathname} returned unauthenticated 200 success`);
}

async function checkInvalidPublicSubmit() {
  if (!allowInvalidPost) {
    return pass(
      'invalid_public_submit_rejected_optional',
      { skipped: true, reason: 'Set V28_6_SMOKE_ALLOW_INVALID_POST=1 to enable invalid POST rejection check.' },
      'Public submit invalid-payload check is optional and disabled by default to avoid accidental data mutation.'
    );
  }

  const response = await request('/api/service-requests', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({})
  });
  const ok = response.status >= 400 && response.status < 500;
  return ok
    ? pass('invalid_public_submit_rejected', response, 'Invalid public submit payload must be rejected with 4xx and not create records.')
    : fail('invalid_public_submit_rejected', response, 'Invalid public submit payload unexpectedly did not reject with 4xx.');
}

function md(data) {
  const lines = [
    '# NANOFIX V28.6.2 Batch A Preview Smoke Report',
    '',
    `- Generated at: ${data.generated_at}`,
    `- Base URL: ${data.base_url || '(missing)'}`,
    `- Overall: ${data.ok ? 'PASS' : 'FAIL'}`,
    `- Passed: ${data.passed}/${data.total}`,
    `- Mutating invalid POST check enabled: ${data.allow_invalid_post ? 'yes' : 'no'}`,
    '',
    '## Checks',
    '',
    '| Check | Result | Status | Expectation |',
    '|---|---|---:|---|'
  ];
  for (const check of data.checks) {
    lines.push(`| ${check.name} | ${check.pass ? 'PASS' : 'FAIL'} | ${check.response?.status ?? 'n/a'} | ${String(check.expectation).replace(/\|/g, '\\|')} |`);
  }
  lines.push('', '## Notes', '', '- This smoke runner does not use production Supabase credentials and does not mutate data by default.', '- It is intended for Vercel Preview URL validation after validate:predeploy and build:ci pass.', '- Run with `V28_6_SMOKE_BASE_URL=https://<preview-host> node tools/smoke-v28-6-2-batch-a-preview.mjs`.', '- To also verify invalid public submit rejection, add `V28_6_SMOKE_ALLOW_INVALID_POST=1`.', '');
  return `${lines.join('\n')}\n`;
}

async function main() {
  if (!baseUrl) {
    const report = {
      ok: false,
      generated_at: nowIso(),
      base_url: '',
      allow_invalid_post: allowInvalidPost,
      total: 0,
      passed: 0,
      checks: [],
      error: 'Missing V28_6_SMOKE_BASE_URL or PREVIEW_BASE_URL.'
    };
    fs.writeFileSync(path.join(root, jsonReport), `${JSON.stringify(report, null, 2)}\n`);
    fs.writeFileSync(path.join(root, mdReport), md(report));
    console.error(JSON.stringify(report, null, 2));
    process.exit(2);
  }

  const checks = [];
  checks.push(await checkReady());
  checks.push(await checkHealth());
  checks.push(await checkBlockedGet('customer_portal_timeline_requires_auth', '/api/customer-portal/activity-timeline'));
  checks.push(await checkBlockedGet('admin_service_operations_requires_auth', '/api/admin/service-operations'));
  checks.push(await checkBlockedGet('global_search_requires_authorized_actor', '/api/global-search?q=leak'));
  checks.push(await checkInvalidPublicSubmit());

  const passed = checks.filter((check) => check.pass).length;
  const report = {
    ok: passed === checks.length,
    generated_at: nowIso(),
    base_url: baseUrl,
    allow_invalid_post: allowInvalidPost,
    total: checks.length,
    passed,
    checks
  };
  fs.writeFileSync(path.join(root, jsonReport), `${JSON.stringify(report, null, 2)}\n`);
  fs.writeFileSync(path.join(root, mdReport), md(report));
  console.log(JSON.stringify({ ok: report.ok, total: report.total, passed: report.passed, json_report: jsonReport, md_report: mdReport }, null, 2));
  if (!report.ok) process.exit(1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
