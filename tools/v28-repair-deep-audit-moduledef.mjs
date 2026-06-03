#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const target = path.join(root, 'tools', 'v28-admin-0-8-reality-deep-audit.mjs');

if (!fs.existsSync(target)) {
  console.error('Missing tools/v28-admin-0-8-reality-deep-audit.mjs');
  process.exit(1);
}

let text = fs.readFileSync(target, 'utf8');
const before = text;

// Batch 1 renamed the loop variable from `module` to `moduleDef` to satisfy lint,
// but one inner reference remained as `module`, which crashes under ESM.
text = text.replaceAll('relatedApiRoutes(module,', 'relatedApiRoutes(moduleDef,');
text = text.replaceAll('moduleIssues(module,', 'moduleIssues(moduleDef,');
text = text.replaceAll('pageAndComponentFiles(module)', 'pageAndComponentFiles(moduleDef)');
text = text.replaceAll('pageExists(module)', 'pageExists(moduleDef)');

if (text !== before) {
  fs.writeFileSync(target, text);
  console.log('PATCH tools/v28-admin-0-8-reality-deep-audit.mjs');
} else {
  console.log('SKIP no change tools/v28-admin-0-8-reality-deep-audit.mjs');
}

console.log('Deep audit moduleDef repair completed.');
