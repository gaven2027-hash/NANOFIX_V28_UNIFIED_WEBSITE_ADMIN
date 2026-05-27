#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs';

function read(path) { return existsSync(path) ? readFileSync(path, 'utf8') : ''; }
const checks = [];
function must(ok, label) { checks.push([Boolean(ok), label]); }

const middleware = read('middleware.ts');
const vercel = read('vercel.json');
const e2eSmoke = read('tools/e2e-smoke.mjs');
const registerForm = read('app/register/RegisterForm.tsx');
const publicRegistrationApi = read('app/api/public/registration-requests/route.ts');
const adminRegistrationApi = read('app/api/admin/registration-requests/route.ts');
const registrationReview = read('components/RegistrationReviewWorkspace.tsx');
const fieldMedia = read('components/FieldMediaCenterWorkspace.tsx');
const fieldMediaAcl = read('components/FieldMediaAccessControlPanel.tsx');
const fieldMediaApi = read('app/api/admin/field-media/route.ts');
const domains = read('lib/nanofix/domains.ts');

must(domains.includes('https://www.nanofixsg.com') && domains.includes('https://app.nanofixsg.com'), 'public/app domain constants exist');
must(middleware.includes('"/adminb"') && middleware.includes('"/customer"') && middleware.includes('"/customerlb"'), 'short login aliases exist');
must(middleware.includes('"/advertising-center"') && middleware.includes('"/advertising-center/:path*"'), 'advertising center is explicitly listed in protected admin routes');
must(!existsSync('app/register/engineer/page.tsx'), 'standalone engineer registration route is deleted');
must(registerForm.includes("type RegisterContext = 'admin' | 'customer'"), 'register form only supports admin/customer contexts');
must(registerForm.includes('inspection_repair') && registerForm.includes('total_management') && registerForm.includes('finance'), 'admin register role groups exist');
must(!registerForm.includes("'engineer'") && !registerForm.includes('Engineer Account Application'), 'register form has no standalone engineer registration copy');
must(publicRegistrationApi.includes("const allowedRequestedRoles = ['customer', 'admin']"), 'public registration API only allows customer/admin');
must(!publicRegistrationApi.includes("'engineer'") && publicRegistrationApi.includes('requested_role_group'), 'public registration API has no engineer role option and stores group');
must(adminRegistrationApi.includes('roleFromGroup') && adminRegistrationApi.includes('approved_role_group'), 'admin review API maps final role group');
must(registrationReview.includes('Final Role Group / 最终角色分组') && registrationReview.includes('Inspection & Repair / 检修'), 'registration review UI can correct role group');
must(fieldMediaAcl.includes('Allowed View People / 允许查看人员') && fieldMediaAcl.includes('Denied View People / 禁止查看人员'), 'field media person ACL panel exists');
must(fieldMediaApi.includes('canView') && fieldMediaApi.includes('allowed_view_actor_ids') && fieldMediaApi.includes('denied_view_actor_ids'), 'field media API filters by role/person ACL');
must(fieldMedia.includes('Client portals cannot read this center directly') && !fieldMedia.includes('MediaSourcePicker'), 'field media UI is backend-only and decoupled from media picker dependency');
must(!existsSync('app/api/customer/field-media/route.ts'), 'customer field media API is not exposed');
must(!existsSync('app/api/engineer/field-media/route.ts'), 'engineer field media API is not exposed');

must(vercel.includes('npm run validate:predeploy && npm run build:ci'), 'Vercel production build runs OA validation gate before build');
must(!vercel.includes('"buildCommand": "npm run build:standard"'), 'old Vercel buildCommand residue is removed');
must(vercel.includes('/api/system/module-health-worker'), 'Vercel module health cron remains configured');

for (const route of ['/admin/advertising-center', '/admin/advertising-center/import', '/admin/advertising-center/insights', '/admin/advertising-center/creatives', '/admin/advertising-center/budgets']) {
  must(e2eSmoke.includes(route), `E2E smoke protects ${route}`);
}
for (const apiRoute of ['/api/admin/advertising-center', '/api/admin/advertising-center/import', '/api/admin/advertising-center/insights', '/api/admin/advertising-center/creatives', '/api/admin/advertising-center/budgets']) {
  must(e2eSmoke.includes(apiRoute), `E2E smoke rejects spoofed unauthenticated ${apiRoute}`);
}

for (const [ok, label] of checks) console.log(`${ok ? '✅' : '❌'} ${label}`);
const failed = checks.filter(([ok]) => !ok);
if (failed.length) {
  console.error(`\nClean release no-residue verification failed: ${failed.length} check(s).`);
  process.exit(1);
}
console.log('\nClean release no-residue verification passed.');
