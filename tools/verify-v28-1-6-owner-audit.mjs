#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs';

const failures = [];
function read(path) { return existsSync(path) ? readFileSync(path, 'utf8') : ''; }
function must(ok, label) { console.log(`${ok ? '✅' : '❌'} ${label}`); if (!ok) failures.push(label); }

const auth = read('lib/nanofix/auth.ts');
const auditServer = read('lib/supabase-server.ts');
const policy = read('docs/NANOFIX_V28_1_6_SUPER_ADMIN_AUDIT_POLICY.md');
const registrationApi = read('app/api/admin/registration-requests/route.ts');
const registrationReview = read('components/RegistrationReviewWorkspace.tsx');
const packageJson = read('package.json');

must(auth.includes('super_admin: ["*"]'), 'Super Admin owner role remains explicit');
must(auth.includes('isSuperAdmin'), 'Super Admin helper exists');
must(auth.includes('requireSuperAdminTakeover'), 'Super Admin controlled action helper exists');
must(auditServer.includes('export async function auditLog'), 'Central Audit Logs writer exists');
must(policy.includes('Super Admin has full-system owner authority'), 'V28.1.6 owner audit policy exists');
must(policy.includes('every sensitive owner-level action must be recorded'), 'Policy requires Audit Logs for sensitive owner-level action');
must(registrationApi.includes('auditLog'), 'Registration approval flow writes Audit Logs');
must(registrationApi.includes('approve_portal_registration_request'), 'Approval audit action is named');
must(registrationApi.includes('reject_portal_registration_request'), 'Rejection audit action is named');
must(registrationReview.includes('Super Admin can correct'), 'Review UI states Super Admin correction authority');
must(packageJson.includes('verify:v28-1-6-owner-audit'), 'package.json exposes owner audit verification script');

if (failures.length) {
  console.error(`\nV28.1.6 owner audit verification failed: ${failures.length} issue(s).`);
  process.exit(1);
}
console.log('\nV28.1.6 owner audit verification passed.');
