#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs';

const failures = [];
const warnings = [];

function read(filePath) {
  return existsSync(filePath) ? readFileSync(filePath, 'utf8') : '';
}

function must(condition, label) {
  console.log(`${condition ? '✅' : '❌'} ${label}`);
  if (!condition) failures.push(label);
}

function warn(condition, label) {
  console.log(`${condition ? '✅' : '⚠️'} ${label}`);
  if (!condition) warnings.push(label);
}

const note = read('docs/v28.8/final-release-note.md');
const readinessReport = read('docs/v28.8/final-release-readiness-report.md');
const phase13 = read('docs/v28.8/phase-13-final-release-gate-checklist.md');
const readyEndpoint = read('app/api/ready/route.ts');
const packageJson = read('package.json');

console.log('\nV28.8 Final Release Note verification');
console.log('--------------------------------------');

must(Boolean(note), 'Final Release Note document exists');
must(note.includes('Final Release Note'), 'Release note title exists');
must(note.includes('最终发布说明'), 'Release note has Chinese title');
must(readinessReport.includes('Final Release Readiness Report'), 'Final Release Readiness Report exists before release note');
must(phase13.includes('Final Release Gate Checklist'), 'Phase 13 checklist exists before release note');

for (const section of [
  'Release title',
  'Summary',
  'Completed areas',
  'Phase completion summary',
  'Current health result',
  'Evidence references',
  'Readiness score',
  'Required command for this note',
  'Completion criteria',
  'Next document'
]) {
  must(note.includes(section), `Release note includes section: ${section}`);
}

for (const completedArea of [
  'Admin menu simplification',
  'Public website and Website Management',
  'Customer Portal',
  'Service Requests, Jobs and inspection',
  'Quotations and customer response',
  'Invoices and document',
  'Payments and checkout',
  'Warranties and warranty claim',
  'Customer Reviews and feedback',
  'Backup evidence',
  'AI, Social and Advertising',
  'System Health and Release Gate',
  'Final Release Gate Checklist',
  'Final Release Readiness Report'
]) {
  must(note.includes(completedArea), `Release note includes completed area: ${completedArea}`);
}

for (const phaseLabel of [
  'Phase 1: Production RBAC',
  'Phase 2: Service Requests',
  'Phase 3: Jobs',
  'Phase 4: Quotations',
  'Phase 5: Invoices',
  'Phase 6: Payments',
  'Phase 7: Warranties',
  'Phase 8: Customer Reviews',
  'Phase 9: Website Publish Approval',
  'Phase 10: Backup & Recovery',
  'Phase 11: AI / Social / Advertising',
  'Phase 12: System Health & Release Gate',
  'Phase 13: Final Release Gate Checklist'
]) {
  must(note.includes(phaseLabel), `Release note includes phase: ${phaseLabel}`);
}

for (const healthField of [
  'ok: true',
  'environment: production',
  'env_ready: true',
  'database_ready: true',
  'optional_database_ready: true',
  'supabase_configured: true',
  'failed_core_tables: []',
  'failed_optional_tables: []',
  '2026-06-12T10:23:04.309Z'
]) {
  must(note.includes(healthField), `Release note includes health field: ${healthField}`);
}

for (const evidence of [
  '#51',
  '#52',
  '6a0ec1bff7265c5067c5a83d04d308404b4e9974',
  '8ebac0628f350b324ec47f4b912408f59d6a3bb1',
  'tools/verify-v28-8-final-release-readiness-report.mjs',
  'tools/verify-v28-8-final-release-note.mjs'
]) {
  must(note.includes(evidence), `Release note includes evidence reference: ${evidence}`);
}

must(note.includes('Overall V28.8 release readiness score: `96/100`'), 'Release note includes readiness score');
must(note.includes('node tools/verify-v28-8-final-release-note.mjs'), 'Release note exposes direct verifier command');
must(note.includes('V28.8 Production Health Report'), 'Release note points to Production Health Report');
must(readyEndpoint.includes('required_tables') && readyEndpoint.includes('optional_tables'), '/api/ready still exposes table health fields');
must(packageJson.includes('"quality:gate"') && packageJson.includes('"test:e2e:smoke"'), 'package.json still exposes release validation commands');

warn(packageJson.includes('"verify:v28-8-final-release-note"'), 'package.json exposes final release note npm alias');

if (failures.length) {
  console.error(`\nV28.8 Final Release Note verification failed: ${failures.length} issue(s).`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(JSON.stringify({
  ok: true,
  verifier: 'verify-v28-8-final-release-note',
  failures,
  warnings,
  checked: {
    releaseNoteDocument: true,
    readinessReportDependency: true,
    phaseBaseline: true,
    healthSummary: true,
    evidenceReferences: true,
    nextDocument: true
  }
}, null, 2));
