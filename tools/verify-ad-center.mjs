#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs';

function read(path) { return existsSync(path) ? readFileSync(path, 'utf8') : ''; }
function ok(condition, label, failures) {
  console.log(`${condition ? '✅' : '❌'} ${label}`);
  if (!condition) failures.push(label);
}

const failures = [];
const auth = read('lib/nanofix/auth.ts');
const config = read('lib/nanofix/advertising-center.ts');
const workspace = read('components/AdvertisingCenterWorkspace.tsx');
const page = read('app/admin/advertising-center/page.tsx');
const api = read('app/api/admin/advertising-center/route.ts');
const migration = read('supabase/migrations/20260527010000_v28_1_4_advertising_center.sql');

ok(page.includes('AdvertisingCenterWorkspace'), 'ad center page exists', failures);
ok(workspace.includes('Advertising & Promotion Center'), 'ad center workspace exists', failures);
ok(api.includes('read:advertising') && api.includes('ad_campaign.draft'), 'ad center API permissions exist', failures);
ok(api.includes('isSuperAdmin'), 'ad center API checks super admin', failures);
ok(auth.includes('super_admin: ["*"]'), 'super admin wildcard permission exists', failures);
ok(auth.includes('read:advertising') && auth.includes('write:ad_creative'), 'role advertising permissions exist', failures);
ok(config.includes('superAdminAdvertisingCapabilities'), 'super admin capability config exists', failures);
ok(migration.includes('public.ad_campaigns'), 'ad campaigns schema exists', failures);
ok(migration.includes('public.ad_ai_suggestions'), 'ad AI suggestions schema exists', failures);
ok(migration.includes('public.ad_approval_requests'), 'ad approval schema exists', failures);
ok(migration.includes('enable row level security'), 'ad tables enable RLS', failures);
ok(workspace.includes('utm_campaign'), 'UTM support exists', failures);

if (failures.length) {
  console.error(`\nAd center verification failed: ${failures.length}`);
  process.exit(1);
}
console.log('\nAd center verification passed.');
