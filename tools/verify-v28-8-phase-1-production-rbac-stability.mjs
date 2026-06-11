#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs';

const failures = [];
const warnings = [];

function read(path) {
  return existsSync(path) ? readFileSync(path, 'utf8') : '';
}

function must(ok, label) {
  console.log(`${ok ? '✅' : '❌'} ${label}`);
  if (!ok) failures.push(label);
}

function warn(ok, label) {
  console.log(`${ok ? '✅' : '⚠️'} ${label}`);
  if (!ok) warnings.push(label);
}

const auth = read('lib/nanofix/auth.ts');
const ready = read('app/api/ready/route.ts');
const registerForm = read('app/register/RegisterForm.tsx');
const publicRegistrationApi = read('app/api/public/registration-requests/route.ts');
const adminRegistrationApi = read('app/api/admin/registration-requests/route.ts');
const registrationReview = read('components/RegistrationReviewWorkspace.tsx');
const portalBoundaryVerifier = read('tools/verify-v28-1-6-portal-boundaries.mjs');
const baselineDoc = read('docs/v28.8/phase-1-production-rbac-stability-baseline.md');
const packageJson = read('package.json');

const requiredTables = [
  'profiles',
  'customers',
  'unified_intake',
  'leads',
  'service_requests',
  'jobs',
  'quotations',
  'invoices',
  'payments',
  'warranties',
  'warranty_claims',
  'unified_tasks',
  'workflow_settings',
  'status_transition_logs',
  'audit_logs',
  'document_company_settings'
];

const optionalTables = [
  'automation_rules',
  'notification_outbox',
  'internal_inbox_messages',
  'content_drafts',
  'ai_logs',
  'backup_jobs',
  'app_modules',
  'customer_account_claims',
  'customer_record_links'
];

const roleGroups = ['super_admin', 'admin', 'inspection_repair', 'operations', 'finance'];

console.log('\nV28.8 Phase 1 production RBAC stability verification');
console.log('---------------------------------------------------');

must(Boolean(baselineDoc), 'V28.8 Phase 1 baseline document exists');
must(baselineDoc.includes('Production health baseline confirmed') && baselineDoc.includes('Locked role model'), 'Baseline document records production health and locked role model');
must(baselineDoc.includes('inspection_repair') && baselineDoc.includes('Internal Admin App only'), 'Baseline document locks engineer/inspection/repair as internal backend role group');

must(auth.includes('x-nanofix-auth-verified'), 'Admin auth accepts only middleware-verified server context');
must(auth.includes('Frontend-provided x-admin-role / x-nanofix-role') && auth.includes('intentionally ignored'), 'Auth module documents frontend role-header spoofing rejection');
must(auth.includes('super_admin: ["*"]'), 'Super Admin keeps wildcard permission');
must(auth.includes('engineer: ["read:operations", "write:operations", "job.assigned.read", "job.assigned.update"'), 'Engineer runtime role is scoped to operations and assigned jobs');
must(auth.includes('customer: ["customer.portal.read", "customer.portal.write"]'), 'Customer runtime role is scoped to customer portal permissions');

for (const group of roleGroups) {
  must(registerForm.includes(group), `Internal registration form includes ${group} role group`);
}
must(registerForm.includes("type RegisterContext = 'admin' | 'customer'"), 'Register form only exposes admin/customer contexts');
must(!registerForm.includes("type RegisterContext = 'admin' | 'customer' | 'engineer'"), 'Standalone engineer register context remains absent');
must(registerForm.includes('No separate Engineer Portal/Register/Login'), 'Register copy explains no separate engineer portal/register/login');

must(publicRegistrationApi.includes("const allowedRequestedRoles = ['customer', 'admin']"), 'Public registration API only allows customer/admin request types');
must(publicRegistrationApi.includes('requested_role_group'), 'Public registration API stores requested role group');
must(!publicRegistrationApi.includes("'engineer'"), 'Public registration API does not accept standalone engineer role type');

must(adminRegistrationApi.includes("if (raw === 'total_management') return 'super_admin'"), 'Admin review supports total_management -> super_admin compatibility alias');
must(adminRegistrationApi.includes("if (raw === 'management') return 'admin'"), 'Admin review supports management -> admin compatibility alias');
must(adminRegistrationApi.includes("if (group === 'inspection_repair') return 'engineer'"), 'Admin review maps inspection_repair to runtime engineer');
must(adminRegistrationApi.includes("if (group === 'operations') return 'operations_admin'"), 'Admin review maps operations to runtime operations_admin');
must(adminRegistrationApi.includes("if (group === 'finance') return 'finance'"), 'Admin review maps finance to runtime finance');
must(adminRegistrationApi.includes("group === 'super_admin'") && adminRegistrationApi.includes("actorRole === 'super_admin' ? 'super_admin' : 'content_admin'"), 'Admin review prevents non-super-admin from silently granting super_admin runtime role');
must(adminRegistrationApi.includes('approve_portal_registration_request'), 'Admin review writes approval audit action');

must(registrationReview.includes('Final Role Group / 最终角色分组'), 'Registration review UI exposes final role group correction');
must(registrationReview.includes('Inspection & Repair / 检修'), 'Registration review UI includes Inspection & Repair group');
must(registrationReview.includes('Operations / 运营') && registrationReview.includes('Finance / 财务'), 'Registration review UI includes Operations and Finance groups');

must(portalBoundaryVerifier.includes('Engineer/Inspection exists only as internal role group'), 'Existing portal boundary verifier protects engineer as internal role group');
must(portalBoundaryVerifier.includes('No standalone engineer register page exists'), 'Existing verifier rejects standalone engineer register page');
must(portalBoundaryVerifier.includes('No standalone engineer login page exists'), 'Existing verifier rejects standalone engineer login page');
must(portalBoundaryVerifier.includes('Legacy engineer portal is compatibility redirect only'), 'Existing verifier keeps legacy engineer portal as compatibility only');

for (const table of requiredTables) {
  must(ready.includes(`"${table}"`), `/api/ready checks required table ${table}`);
}
for (const table of optionalTables) {
  must(ready.includes(`"${table}"`), `/api/ready checks optional table ${table}`);
}
must(ready.includes('const ok = envReady && databaseReady'), '/api/ready blocks production readiness on env + core database health');
must(ready.includes('optional_database_ready') && ready.includes('failed_optional_tables'), '/api/ready exposes optional database health separately');
must(ready.includes('status: ok ? 200 : 503'), '/api/ready returns 503 when core readiness fails');

must(packageJson.includes('"verify:v28-8-phase-1"'), 'package.json exposes V28.8 Phase 1 verifier script');
warn(packageJson.includes('validate:predeploy'), 'Predeploy validation remains present for full release checks');

if (failures.length) {
  console.error(`\nV28.8 Phase 1 production RBAC stability verification failed: ${failures.length} issue(s).`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(JSON.stringify({
  ok: true,
  verifier: 'verify-v28-8-phase-1-production-rbac-stability',
  failures,
  warnings,
  checked: {
    productionReadyEndpoint: true,
    rbacRuntimeRoles: true,
    registrationRoleGroups: true,
    portalBoundaries: true,
    baselineDocument: true
  }
}, null, 2));
