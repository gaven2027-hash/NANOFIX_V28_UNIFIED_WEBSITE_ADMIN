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

console.log('\nV28.9 Auto Global Repair verifier');
console.log('----------------------------------');

must(Boolean(runner), 'Auto global repair runner exists');
must(Boolean(scope), 'Auto global repair scope document exists');
must(scope.includes('v28-9-auto-global-repair'), 'Scope document references branch');
must(scope.includes('node tools/v28-9-auto-global-repair.mjs'), 'Scope document exposes direct runner command');
must(scope.includes('node tools/verify-v28-9-auto-global-repair.mjs'), 'Scope document exposes direct verifier command');
must(runner.includes('V28.9 Auto Global Repair / Scan'), 'Runner title exists');
must(runner.includes('x-nanofix-role') && runner.includes('x-admin-role'), 'Runner scans role header markers');
must(runner.includes('select\\s*') || runner.includes('select\\s*\\('), 'Runner scans broad select marker');
must(runner.includes('SUPABASE_SERVICE_ROLE_KEY'), 'Runner scans server-only Supabase key marker');
must(runner.includes('required table'), 'Runner checks required tables');
must(runner.includes('optional table'), 'Runner checks optional tables');
must(runner.includes('docs/v28.8/final-release-readiness-report.md'), 'Runner checks readiness report document');
must(runner.includes('docs/v28.8/final-release-note.md'), 'Runner checks release note document');
must(runner.includes('docs/v28.8/production-health-report.md'), 'Runner checks health report document');

must(scope.includes('AI Intelligence Center') || scope.includes('AI / Social / Advertising'), 'Scope document covers AI Intelligence Center');
must(scope.includes('Social Media Management') || scope.includes('AI / Social / Advertising'), 'Scope document covers Social Media Management');
must(scope.includes('Advertising Center') || scope.includes('campaign'), 'Scope document covers Advertising Center');
must(runner.includes('AI / Social / Advertising coverage'), 'Runner includes AI/Social/Advertising coverage section');
must(runner.includes('aiSurfaceFiles'), 'Runner checks AI surface files');
must(runner.includes('socialSurfaceFiles'), 'Runner checks social surface files');
must(runner.includes('advertisingSurfaceFiles'), 'Runner checks advertising surface files');
must(runner.includes('websiteCmsFiles'), 'Runner checks Website Management / CMS surface files');
must(runner.includes('serviceOperationsFiles'), 'Runner checks Service Operations surface files');
must(runner.includes('customerPortalFiles'), 'Runner checks Customer Portal surface files');
must(runner.includes('unsafePublishPatterns'), 'Runner scans direct publish / paid activation bypass patterns');
must(runner.includes('content_drafts') && runner.includes('ai_logs'), 'Runner checks AI/content support tables');
must(runner.includes('notification_outbox') && runner.includes('internal_inbox_messages'), 'Runner checks social/ad notification support tables');
must(runner.includes('automation_rules') && runner.includes('audit_logs'), 'Runner checks automation and audit support');
must(runner.includes('No AI/Social/Ads direct publish bypass patterns in runtime source corpus'), 'Runner blocks AI/Social/Ads direct publish bypass in runtime source');
must(runner.includes('Website publishing stays approval-gated'), 'Runner checks website publish approval gate');
must(runner.includes('Advertising activation remains approval-gated or non-direct'), 'Runner checks advertising activation gate');
must(runner.includes('runtimeSourceFiles'), 'Runner avoids self-flagging docs/tools while scanning runtime source risk');

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
    directCommands: true,
    aiSocialAdsCoverage: true,
    publishApprovalSafety: true,
    runtimeRiskScan: true
  }
}, null, 2));
