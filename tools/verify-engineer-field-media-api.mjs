#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs';

const file = 'app/api/engineer/field-media/route.ts';
const source = existsSync(file) ? readFileSync(file, 'utf8') : '';
const customerApiExists = existsSync('app/api/customer/field-media/route.ts');
const checks = [
  [source.includes("requireAdmin(request, 'read:operations')"), 'requires engineer/operations auth'],
  [source.includes("'engineer'") && source.includes("'operations_admin'"), 'allows engineer and operations roles only'],
  [source.includes(".eq('visibility', 'engineer_visible')"), 'filters engineer_visible only'],
  [source.includes(".eq('object_type', objectType)") && source.includes(".eq('object_id', objectId)"), 'requires object scoped query'],
  [source.includes("allowedObjectTypes = ['service_request', 'job', 'engineer_inspection', 'warranty']"), 'restricts object types'],
  [source.includes('engineerCanRead') && source.includes('assigned_engineer_actor_id'), 'checks engineer assignment metadata'],
  [source.includes('createSignedUrl') && source.includes('signed_asset_url'), 'returns signed URLs for private media'],
  [source.includes('engineer_read_field_media_links') && source.includes('auditLog'), 'writes audit log'],
  [!customerApiExists, 'customer field media API intentionally not created']
];

const failed = checks.filter(([ok]) => !ok);
for (const [ok, label] of checks) console.log(`${ok ? '✅' : '❌'} ${label}`);
if (failed.length) {
  console.error(`\nEngineer field media API validation failed: ${failed.length} check(s).`);
  process.exit(1);
}
console.log('\nEngineer field media API validation passed.');
