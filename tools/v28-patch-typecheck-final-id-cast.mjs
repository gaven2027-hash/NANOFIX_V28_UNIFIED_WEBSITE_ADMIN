#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const target = path.join(root, 'app', 'api', 'admin', 'customer-center', 'documents', 'route.ts');

if (!fs.existsSync(target)) {
  console.error('Missing app/api/admin/customer-center/documents/route.ts');
  process.exit(1);
}

let text = fs.readFileSync(target, 'utf8');
const before = text;

text = text.replaceAll('.eq(idColumn, id)', '.eq(idColumn, id as string)');

if (text !== before) {
  fs.writeFileSync(target, text);
  console.log('PATCH app/api/admin/customer-center/documents/route.ts');
} else {
  console.log('SKIP no change app/api/admin/customer-center/documents/route.ts');
}

console.log('Final id cast typecheck patch completed.');
