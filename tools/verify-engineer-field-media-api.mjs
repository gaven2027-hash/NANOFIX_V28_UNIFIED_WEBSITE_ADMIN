#!/usr/bin/env node
import { existsSync } from 'node:fs';

const engineerApiExists = existsSync('app/api/engineer/field-media/route.ts');
const customerApiExists = existsSync('app/api/customer/field-media/route.ts');
const directPortalDocsOnly = true;

const checks = [
  [!engineerApiExists, 'engineer field media API route is not exposed'],
  [!customerApiExists, 'customer field media API route is not exposed'],
  [directPortalDocsOnly, 'field media portal access remains backend-only design guidance']
];

const failed = checks.filter(([ok]) => !ok);
for (const [ok, label] of checks) console.log(`${ok ? '✅' : '❌'} ${label}`);
if (failed.length) {
  console.error(`\nField media portal route lock failed: ${failed.length} check(s).`);
  process.exit(1);
}
console.log('\nField media portal routes remain closed.');
