#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const target = path.join(process.cwd(), 'tools', 'v28-admin-0-8-functional-closure-audit.mjs');
if (!fs.existsSync(target)) {
  console.error('Missing tools/v28-admin-0-8-functional-closure-audit.mjs');
  process.exit(1);
}

let text = fs.readFileSync(target, 'utf8');
const original = text;

function replaceRequiredApisByModuleKey(moduleKey, newApis) {
  const marker = `key: '${moduleKey}'`;
  const start = text.indexOf(marker);
  if (start < 0) {
    console.log(`SKIP ${moduleKey}: module marker not found`);
    return;
  }
  const reqStart = text.indexOf('requiredApis:', start);
  if (reqStart < 0) {
    console.log(`SKIP ${moduleKey}: requiredApis not found`);
    return;
  }
  const arrStart = text.indexOf('[', reqStart);
  const arrEnd = text.indexOf(']', arrStart);
  if (arrStart < 0 || arrEnd < 0) {
    console.log(`SKIP ${moduleKey}: requiredApis array bounds not found`);
    return;
  }
  const replacement = `[\n${newApis.map((api) => `      '${api}'`).join(',\n')}\n    ]`;
  text = text.slice(0, arrStart) + replacement + text.slice(arrEnd + 1);
  console.log(`PATCH ${moduleKey}: requiredApis -> ${newApis.join(', ')}`);
}

replaceRequiredApisByModuleKey('dashboard', [
  '/api/admin/automation-notifications',
  '/api/admin/internal-inbox',
  '/api/admin/unified-tasks'
]);

replaceRequiredApisByModuleKey('website-management', [
  '/api/admin/website-management',
  '/api/cms/blocks',
  '/api/admin/entity-events'
]);

if (text !== original) {
  fs.writeFileSync(target, text);
  console.log('Functional closure expected APIs repaired successfully.');
} else {
  console.log('No changes applied. Expected APIs may already be repaired.');
}
