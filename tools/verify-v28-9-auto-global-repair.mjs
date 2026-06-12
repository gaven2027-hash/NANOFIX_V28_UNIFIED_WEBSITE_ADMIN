#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs';

const failures = [];

function read(filePath) {
  return existsSync(filePath) ? readFileSync(filePath, 'utf8') : '';
}

function must(condition, label) {
  console.log(`${condition ? '✅' : '❌'} ${label}`);
  if (!condition) failures.push(label);
}

const runner = read('tools/v28-9-auto-global-repair.mjs');
const scope = read('docs/v28.9/auto-global-repair-scope.md');
const packageJson = read('package.json');

console.log('\nV28.9 Auto Global Repair verifier');
console.log('----------------------------------');

must(Boolean(runner), 'Auto global repair runner exists');
must(Boolean(scope), 'Auto global repair scope document exists');
must(scope.includes('v28-9-auto-global-repair'), 'Scope document references branch');
must(scope.includes('npm.cmd run v28-9:auto-global-repair'), 'Scope document exposes one-command local run');
must(runner.includes('V28.9 Auto Global Repair / Scan'), 'Runner title exists');
must(runner.includes('x-nanofix-role') && runner.includes('x-admin-role'), 'Runner scans role header markers');
must(runner.includes('select\\s*') || runner.includes('select\\s*\\('), 'Runner scans broad select marker');
must(runner.includes('SUPABASE_SERVICE_ROLE_KEY'), 'Runner scans server-only Supabase key marker');
must(runner.includes('required table'), 'Runner checks required tables');
must(runner.includes('optional table'), 'Runner checks optional tables');
must(runner.includes('docs/v28.8/final-release-readiness-report.md'), 'Runner checks readiness report document');
must(runner.includes('docs/v28.8/final-release-note.md'), 'Runner checks release note document');
must(runner.includes('docs/v28.8/production-health-report.md'), 'Runner checks health report document');
must(packageJson.includes('"v28-9:auto-global-repair"'), 'package.json exposes v28-9 auto global repair command');
must(packageJson.includes('"verify:v28-9-auto-global-repair"'), 'package.json exposes verifier alias');

if (failures.length) {
  console.error(`\nV28.9 Auto Global Repair verifier failed: ${failures.length} issue(s).`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(JSON.stringify({
  ok: true,
  verifier: 'verify-v28-9-auto-global-repair',
  failures: [],
  checked: {
    runner: true,
    scope: true,
    packageScripts: true
  }
}, null, 2));
