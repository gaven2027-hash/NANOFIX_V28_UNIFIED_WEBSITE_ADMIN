import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const exists = (file) => fs.existsSync(path.join(root, file));
const failures = [];

const requiredFiles = [
  'supabase/migrations/20260526003000_v28_1_2_portal_registration_requests.sql',
  'app/api/public/registration-requests/route.ts',
  'app/api/admin/registration-requests/route.ts',
  'app/register/RegisterForm.tsx',
  'components/RegistrationReviewWorkspace.tsx',
  'app/customer-center/[section]/page.tsx',
  'lib/nanofix/customerCenterConfig.ts'
];

for (const file of requiredFiles) if (!exists(file)) failures.push(`Missing required file: ${file}`);

if (!failures.length) {
  const migration = read('supabase/migrations/20260526003000_v28_1_2_portal_registration_requests.sql');
  const publicApi = read('app/api/public/registration-requests/route.ts');
  const adminApi = read('app/api/admin/registration-requests/route.ts');
  const registerForm = read('app/register/RegisterForm.tsx');
  const workspace = read('components/RegistrationReviewWorkspace.tsx');
  const customerPage = read('app/customer-center/[section]/page.tsx');
  const config = read('lib/nanofix/customerCenterConfig.ts');

  const requiredColumns = ['registration_request_id','auth_user_id','profile_id','email','full_name','phone','requested_role','approved_role','requested_role_group','approved_role_group','source','status','reviewer_notes','metadata_json','reviewed_by','reviewed_at'];
  const requiredGroups = ['customer','total_management','management','inspection_repair','operations','finance'];

  if (!migration.includes('create table if not exists public.portal_registration_requests')) failures.push('portal_registration_requests migration table is missing.');
  if (!migration.includes('enable row level security')) failures.push('portal_registration_requests RLS is missing.');
  if (!migration.includes('portal_registration_requests_admin_all')) failures.push('portal_registration_requests admin RLS policy is missing.');

  for (const column of requiredColumns) {
    if (!migration.includes(column) || (!publicApi.includes(column) && !adminApi.includes(column))) failures.push(`Missing registration request column in migration/API: ${column}`);
  }
  for (const group of requiredGroups) {
    if (!migration.includes(group) || !publicApi.includes(group) || !adminApi.includes(group) || !workspace.includes(group)) failures.push(`Missing unified role group support: ${group}`);
  }

  if (!publicApi.includes("const allowedRequestedRoles = ['customer', 'admin']")) failures.push('Public registration API must only allow customer/admin requested roles.');
  if (publicApi.includes("'engineer'") || registerForm.includes("'engineer'") || workspace.includes("roles = ['customer', 'engineer', 'admin']")) failures.push('Engineer registration must not remain as a separate public registration role.');
  if (!registerForm.includes("type RegisterContext = 'admin' | 'customer'")) failures.push('RegisterForm must only support admin/customer context.');
  if (!registerForm.includes('Inspection & Repair / 检修') || !registerForm.includes('requested_role_group')) failures.push('RegisterForm must include internal role group selection.');
  if (!adminApi.includes('roleFromGroup') || !adminApi.includes('approved_role_group')) failures.push('Admin API must map approved role group to system role.');
  if (!workspace.includes('Final Role Group / 最终角色分组') || !workspace.includes('Super Admin can correct')) failures.push('Registration review workspace must allow correcting final role group before approval.');
  if (!publicApi.includes('export async function POST')) failures.push('Public registration request API must support POST.');
  if (!adminApi.includes('export async function GET') || !adminApi.includes('export async function PATCH')) failures.push('Admin registration request API must support GET and PATCH.');
  if (!adminApi.includes("requireAdmin(request, 'read:customers')") || !adminApi.includes("requireAdmin(request, 'write:customers')")) failures.push('Admin registration request API must use customer read/write permissions.');
  if (!adminApi.includes('approve_portal_registration_request') || !adminApi.includes('reject_portal_registration_request') || !adminApi.includes('auditLog')) failures.push('Admin registration request API must write approve/reject audit logs.');
  if (!adminApi.includes("is_active: true") || !adminApi.includes("review_status: 'approved'") || !adminApi.includes("profile_status: 'active'")) failures.push('Approval must activate profile and mark review approved.');
  if (!adminApi.includes("is_active: false") || !adminApi.includes("review_status: 'rejected'")) failures.push('Rejection must keep/deactivate profile and mark review rejected.');
  if (!registerForm.includes('/api/public/registration-requests')) failures.push('RegisterForm must submit to /api/public/registration-requests.');
  if (!workspace.includes('/api/admin/registration-requests')) failures.push('RegistrationReviewWorkspace must call /api/admin/registration-requests.');
  if (!config.includes("key: 'registration-review'")) failures.push('Customer Center config missing registration-review section.');
  if (!customerPage.includes('RegistrationReviewWorkspace') || !customerPage.includes("section.key === 'registration-review'")) failures.push('/customer-center/registration-review is not routed to RegistrationReviewWorkspace.');
}

if (failures.length) {
  console.error('NANOFIX unified registration review verification failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('NANOFIX unified registration review verification passed.');
console.log('Checked customer/admin registration only, internal role groups, approval mapping, Customer Center UI and audit logging.');
