#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const reportPath = path.join(process.cwd(), 'reports', 'v28-admin-0-8-functional-closure-audit.json');
if (!fs.existsSync(reportPath)) {
  console.error('Missing reports/v28-admin-0-8-functional-closure-audit.json. Run node tools/v28-admin-0-8-functional-closure-audit.mjs first.');
  process.exit(1);
}

const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
const modules = report.modules || [];
const rows = modules.flatMap((module) => (module.issues || []).map((issue) => ({ module, issue })));

function section(title) {
  console.log('\n' + title);
  console.log('-'.repeat(title.length));
}

function countBy(getter) {
  const map = new Map();
  for (const row of rows) {
    const key = getter(row);
    map.set(key, (map.get(key) || 0) + 1);
  }
  return [...map.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
}

console.log('V28 Admin 0-8 Functional Closure Risk Detail');
console.log(`Generated: ${report.generated_at}`);
console.log(`Average score: ${report.summary?.average_score ?? 'n/a'}`);
console.log(`Total issues: ${report.summary?.total_issues ?? rows.length}`);
console.log(`P0 issues: ${report.summary?.issue_counts?.P0 || 0}`);
console.log(`P1 issues: ${report.summary?.issue_counts?.P1 || 0}`);
console.log(`High risk modules: ${(report.summary?.high_risk_modules || []).join(', ') || 'None'}`);

section('Module Score Table');
for (const item of modules) {
  const matched = (item.matchedApis || []).filter((row) => row.api).length;
  const total = (item.requiredApis || []).length;
  console.log(`${String(item.score).padStart(3)}  ${String(item.risk).padEnd(6)}  ${item.key.padEnd(22)}  issues:${String((item.issues || []).length).padStart(2)}  apis:${matched}/${total}`);
}

section('Issue Type Counts');
if (!rows.length) console.log('No issues.');
for (const [code, total] of countBy(({ issue }) => `${issue.severity}:${issue.code}`)) console.log(`${String(total).padStart(3)}  ${code}`);

section('P0 Issues');
const p0 = rows.filter(({ issue }) => issue.severity === 'P0');
if (!p0.length) console.log('No P0 issues.');
for (const { module, issue } of p0) console.log(`${module.key} | ${issue.code} | ${issue.detail}`);

section('P1 Issues');
const p1 = rows.filter(({ issue }) => issue.severity === 'P1');
if (!p1.length) console.log('No P1 issues.');
for (const { module, issue } of p1) console.log(`${module.key} | ${issue.code} | ${issue.detail}`);

section('Missing Expected APIs');
for (const module of modules) {
  const missing = (module.matchedApis || []).filter((row) => !row.api).map((row) => row.required);
  if (missing.length) console.log(`${module.key}: ${missing.join(', ')}`);
}
