import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const exists = (file) => fs.existsSync(path.join(root, file));

const requiredFiles = [
  'supabase/migrations/20260526003000_v28_1_2_portal_registration_requests.sql',
  'app/api/public/registration-requests/route.ts',
  'app/api/admin/registration-requests/route.ts',
  'app/register/RegisterForm.tsx',
  'components/RegistrationReviewWorkspace.tsx',
  'app/customer-center/[section]/page.tsx',
  'lib/nanofix/customerCenterConfig.ts'
];

const requiredColumns = [
  'registration_request_id',
  'auth_user_id',
  'profile_id',
  'email',
  'full_name',
  'phone',
  'requested_role',
  'approved_role',
  'source',
  'status',
  'reviewer_notes',
  'metadata_json',
  'reviewed_by',
  'reviewed_at'
];

const requiredRoles = ['customer', 'engineer', 'admin'];
const requiredApprovedRoles = ['customer', 'engineer', 'content_admin', 'operations_admin', 'support', 'finance', 'super_admin'];
const failures = [];

for (const file of requiredFiles) {
  if (!exists(file)) failures.push(`Missing required file: ${file}`);
}

if (!failures.length) {
  const migration = read('supabase/migrations/20260526003000_v28_1_2_portal_registration_requests.sql');
  const publicApi = read('app/api/public/registration-requests/route.ts');
  const adminApi = read('app/api/admin/registration-requests/route.ts');
  const registerForm = read('app/register/RegisterForm.tsx');
  const workspace = read('components/RegistrationReviewWorkspace.tsx');
  const customerPage = read('app/customer-center/[section]/page.tsx');
  const config = read('lib/nanofix/customerCenterConfig.ts');

  if (!migration.includes('create table if not exists public.portal_registration_requests')) failures.push('portal_registration_requests migration table is missing.');
  if (!migration.includes('enable row level security')) failures.push('portal_registration_requests RLS is missing.');
  if (!migration.includes('portal_registration_requests_admin_all')) failures.push('portal_registration_requests admin RLS policy is missing.');

  for (const column of requiredColumns) {
    if (!migration.includes(column) || !publicApi.includes(column) && !adminApi.includes(column)) failures.push(`Missing registration request column in migration/API: ${column}`);
  }

  for (const role of requiredRoles) {
    if (!publicApi.includes(role) || !registerForm.includes(role) || !workspace.includes(role)) failures.push(`Missing requested role support: ${role}`);
  }

  for (const role of requiredApprovedRoles) {
    if (!adminApi.includes(role) || !workspace.includes(role)) failures.push(`Missing approved role support: ${role}`);
  }

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
  console.error('NANOFIX registration review verification failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('NANOFIX registration review verification passed.');
console.log('Checked portal_registration_requests, public submit API, admin review API, Customer Center UI and audit logging.');
