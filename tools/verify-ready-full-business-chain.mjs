import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const failures = [];
const exists = (file) => fs.existsSync(path.join(root, file));
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const assert = (ok, message) => { if (!ok) failures.push(message); };

const file = 'app/api/ready/route.ts';
assert(exists(file), 'Missing app/api/ready/route.ts');

if (!failures.length) {
  const ready = read(file);

  const requiredProbeTables = [
    'profiles',
    'customers',
    'unified_intake',
    'leads',
    'service_requests',
    'audit_logs'
  ];
  const optionalProbeTables = [
    'content_drafts',
    'ai_logs',
    'notification_outbox',
    'internal_inbox_messages'
  ];

  for (const table of [...requiredProbeTables, ...optionalProbeTables]) {
    assert(ready.includes(`"${table}"`), `/api/ready probe tables missing ${table}`);
  }

  const order = ['profiles', 'customers', 'unified_intake', 'leads', 'service_requests', 'audit_logs'];
  let last = -1;
  for (const table of order) {
    const index = ready.indexOf(`"${table}"`);
    assert(index > last, `/api/ready probe order is invalid around ${table}`);
    last = index;
  }

  for (const marker of [
    'export const runtime = "edge"',
    'requiredEnv',
    'getSupabaseConfig',
    'boundedFetch',
    'AbortController',
    'timeoutMs = 2500',
    'checkTable',
    'limit=0',
    'database_ready',
    'optional_database_ready',
    'failed_core_tables',
    'failed_optional_tables',
    'required_tables',
    'optional_tables',
    'duration_ms',
    'Cache-Control',
    'no-store, max-age=0',
    'status: ok ? 200 : 503'
  ]) assert(ready.includes(marker), `/api/ready missing fast readiness marker: ${marker}`);

  assert(!ready.includes('productionEnvIsReady'), '/api/ready should not import heavy env helper in fast edge probe');
  assert(!ready.includes('jobs"') || ready.indexOf('jobs"') === -1, '/api/ready fast probe should not restore full heavy table chain');
}

console.log(JSON.stringify({ ok: failures.length === 0, verifier: 'verify-ready-full-business-chain', mode: 'fast-edge-readiness-probe', failures }, null, 2));
if (failures.length) process.exit(1);
