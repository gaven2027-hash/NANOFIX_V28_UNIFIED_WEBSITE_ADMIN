#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs';

function read(path) { return existsSync(path) ? readFileSync(path, 'utf8') : ''; }
function must(ok, label, failures) { console.log(`${ok ? '✅' : '❌'} ${label}`); if (!ok) failures.push(label); }
function hasAny(text, values) { return values.some((value) => text.includes(value)); }

const failures = [];
const middleware = read('middleware.ts');
const domains = read('lib/nanofix/domains.ts');
const registerForm = read('app/register/RegisterForm.tsx');
const registerShell = read('app/register/RegisterShell.tsx');
const publicRegistrationApi = read('app/api/public/registration-requests/route.ts');
const adminRegistrationApi = read('app/api/admin/registration-requests/route.ts');
const fieldMediaApi = read('app/api/admin/field-media/route.ts');
const fieldMediaWorkspace = read('components/FieldMediaCenterWorkspace.tsx');
const fieldMediaPanel = read('components/FieldMediaAccessControlPanel.tsx');
const registrationWorkspace = read('components/RegistrationReviewWorkspace.tsx');
const fieldMigration = read('supabase/migrations/20260526010400_v28_1_3_field_media_acl_schema.sql');
const regMigration = read('supabase/migrations/20260526003000_v28_1_2_portal_registration_requests.sql');

must(domains.includes('https://www.nanofixsg.com') && domains.includes('https://app.nanofixsg.com'), 'public and app domains are defined', failures);
must(middleware.includes('"/adminb": "admin"') && middleware.includes('"/customer": "customer"') && middleware.includes('"/customerlb": "customer"'), 'short login aliases exist', failures);
must(middleware.includes('shouldForceAdminAppHost') && middleware.includes('isNanofixAdminAppHost'), 'admin routes are app-domain aware', failures);

must(registerForm.includes("type RegisterContext = 'admin' | 'customer'"), 'register form only supports admin/customer contexts', failures);
must(registerShell.includes("type RegisterContext = 'admin' | 'customer'"), 'register shell only supports admin/customer contexts', failures);
must(!existsSync('app/register/engineer/page.tsx'), 'old standalone engineer registration page is deleted', failures);
must(!registerForm.includes("type RegisterContext = 'admin' | 'customer' | 'engineer'") && !registerShell.includes("type RegisterContext = 'admin' | 'customer' | 'engineer'"), 'standalone engineer register type is removed', failures);
must(registerForm.includes('Engineer / Inspection') && registerForm.includes('inspection_repair'), 'Engineer / Inspection exists only as an Internal Admin role group', failures);
must(publicRegistrationApi.includes("const allowedRequestedRoles = ['customer', 'admin']"), 'public registration API allows only customer/admin', failures);

must(
  registerForm.includes('super_admin') && hasAny(publicRegistrationApi, ['super_admin','total_management']) && hasAny(adminRegistrationApi, ['super_admin','total_management']) && hasAny(registrationWorkspace, ['super_admin','total_management']),
  'role group super_admin is wired',
  failures
);
for (const group of ['admin','inspection_repair','operations','finance']) {
  must(registerForm.includes(group) && publicRegistrationApi.includes(group) && adminRegistrationApi.includes(group) && registrationWorkspace.includes(group), `role group ${group} is wired`, failures);
}
must(adminRegistrationApi.includes('roleFromGroup') && adminRegistrationApi.includes('approve_portal_registration_request'), 'admin registration review maps group and audits approval', failures);
must(regMigration.includes('requested_role_group') && regMigration.includes('approved_role_group'), 'registration migration has role group columns', failures);

must(!existsSync('app/api/engineer/field-media/route.ts'), 'engineer field media API route is not exposed', failures);
must(!existsSync('app/api/customer/field-media/route.ts'), 'customer field media API route is not exposed', failures);
must(fieldMediaPanel.includes('Access Control / 素材权限控制'), 'field media access panel exists', failures);
must(fieldMediaWorkspace.includes('FieldMediaAccessControlPanel'), 'field media workspace uses access panel', failures);
must(fieldMediaWorkspace.includes('Client portals cannot read this center directly'), 'field media workspace states backend-only boundary', failures);
must(!fieldMediaWorkspace.includes('MediaSourcePicker'), 'field media workspace does not depend on media picker upload module', failures);
must(fieldMediaApi.includes('allowed_view_actor_ids') && fieldMediaApi.includes('canView') && fieldMediaApi.includes('loadPeople'), 'field media API enforces role/person filtering', failures);
must(fieldMigration.includes('allowed_view_actor_ids') && fieldMigration.includes('allowed_use_actor_ids'), 'field media migration has person ACL fields', failures);

if (failures.length) {
  console.error(`\nClean release boundary verification failed: ${failures.length} issue(s).`);
  process.exit(1);
}
console.log('\nClean release boundary verification passed.');
