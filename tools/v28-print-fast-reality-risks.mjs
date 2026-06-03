#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const reportPath = path.join(process.cwd(), 'reports', 'v28-fast-reality-audit.json');

if (!fs.existsSync(reportPath)) {
  console.error('Missing reports/v28-fast-reality-audit.json. Run npm run audit:fast-reality first.');
  process.exit(1);
}

const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
const apiRisks = (report.api_coverage || []).filter((item) => Array.isArray(item.risks) && item.risks.length);
const staticP0 = (report.static_reality_findings || []).filter((item) => item.severity === 'P0');

function countByRisk(items) {
  const counts = new Map();
  for (const item of items) {
    for (const risk of item.risks || []) counts.set(risk, (counts.get(risk) || 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
}

function countByCode(items) {
  const counts = new Map();
  for (const item of items) counts.set(item.code, (counts.get(item.code) || 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
}

function printSection(title) {
  console.log('\n' + title);
  console.log('-'.repeat(title.length));
}

console.log('V28 Fast Reality Risk Detail');
console.log(`Generated: ${report.generated_at}`);
console.log(`Public read allowlisted APIs: ${report.summary?.public_read_allowlisted_api_routes ?? 0}`);
console.log(`Public write audited allowlisted APIs: ${report.summary?.public_write_audited_allowlisted_api_routes ?? 0}`);
console.log(`P0 findings: ${report.summary?.findings_by_severity?.P0 ?? 0}`);
console.log(`API routes with risks: ${report.summary?.api_routes_with_risks ?? apiRisks.length}`);

printSection('Risk Type Counts');
for (const [risk, total] of countByRisk(apiRisks)) console.log(`${String(total).padStart(3)}  ${risk}`);

printSection('P0 Static Finding Counts');
const p0Counts = countByCode(staticP0);
if (!p0Counts.length) console.log('No P0 static findings.');
for (const [code, total] of p0Counts) console.log(`${String(total).padStart(3)}  ${code}`);

printSection('API Risk Files');
for (const item of apiRisks.slice(0, 120)) console.log(`${item.file} | ${item.risks.join(', ')}`);

printSection('P0 Static Files');
if (!staticP0.length) console.log('No P0 static files.');
for (const item of staticP0.slice(0, 80)) console.log(`${item.file} | ${item.code} | ${item.hits?.map((hit) => `L${hit.line}`).join(', ') || ''}`);
