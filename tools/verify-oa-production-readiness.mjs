import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const exists = (file) => fs.existsSync(path.join(root, file));
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const failures = [];

const requiredFiles = [
  'middleware.ts',
  'app/login/LoginShell.tsx',
  'app/login/LoginForm.tsx',
  'app/register/RegisterShell.tsx',
  'app/register/RegisterForm.tsx',
  'app/api/health/route.ts',
  'app/api/ready/route.ts',
  'app/api/admin/dashboard/route.ts',
  'app/api/admin/service-operations/route.ts',
  'app/api/admin/registration-requests/route.ts',
  'app/api/admin/social-accounts/route.ts',
  'app/api/admin/website-social-links/route.ts',
  'app/api/admin/backups/jobs/route.ts',
  'app/api/system/module-health-worker/route.ts',
  'components/RegistrationReviewWorkspace.tsx',
  'components/ServiceOperationsWorkspace.tsx',
  'components/WebsiteManagementWorkspace.tsx',
  'components/SocialMediaManagementWorkspace.tsx',
  'components/SystemSettingsWorkspace.tsx',
  'docs/V28_1_2_SECURITY_HARDENING_SUMMARY.md',
  'supabase/migrations/20260526004000_v28_1_2_field_work_rls_policies.sql',
  'supabase/migrations/20260526005000_v28_1_2_security_definer_access_hardening.sql',
  'supabase/migrations/20260526006000_v28_1_2_core_business_rls_policies.sql',
  'supabase/migrations/20260526007000_v28_1_2_module_rls_policies.sql',
  'supabase/migrations/20260526008000_v28_1_2_oa_fk_performance_indexes.sql',
  'supabase/migrations/20260526008100_v28_1_2_oa_fk_performance_indexes_b.sql'
];

for (const file of requiredFiles) {
  if (!exists(file)) failures.push(`Missing OA production required file: ${file}`);
}

if (!failures.length) {
  const middleware = read('middleware.ts');
  const pkg = JSON.parse(read('package.json'));
  const schemaBridge = read('supabase/migrations/20260523_0000_unified_website_admin_schema_bridge.sql');
  const fieldRls = read('supabase/migrations/20260526004000_v28_1_2_field_work_rls_policies.sql');
  const securityDefiner = read('supabase/migrations/20260526005000_v28_1_2_security_definer_access_hardening.sql');
  const coreRls = read('supabase/migrations/20260526006000_v28_1_2_core_business_rls_policies.sql');
  const moduleRls = read('supabase/migrations/20260526007000_v28_1_2_module_rls_policies.sql');
  const fkIndexes = read('supabase/migrations/20260526008000_v28_1_2_oa_fk_performance_indexes.sql');
  const fkIndexesB = read('supabase/migrations/20260526008100_v28_1_2_oa_fk_performance_indexes_b.sql');
  const env = read('.env.example');
  const vercel = read('vercel.json');

  const mustContain = [
    [middleware, 'loginAliases', 'Middleware must support login aliases.'],
    [middleware, 'registerAliases', 'Middleware must support register aliases.'],
    [middleware, 'x-nanofix-auth-verified', 'Middleware must attach verified auth header.'],
    [middleware, 'headers.delete(key)', 'Middleware must strip spoofed role headers.'],
    [schemaBridge, 'transition_status_tx', 'Transactional status RPC is required.'],
    [schemaBridge, 'status_transition_logs', 'Status transition logs table is required.'],
    [fieldRls, 'job_assignments_engineer_own', 'Engineer assignment RLS is required.'],
    [fieldRls, 'customer_signatures_engineer_assigned', 'Customer signature field RLS is required.'],
    [securityDefiner, 'revoke execute on function public.handle_new_auth_user()', 'SECURITY DEFINER function hardening is required.'],
    [securityDefiner, 'with (security_invoker = true)', 'latest_module_health security_invoker is required.'],
    [coreRls, 'audit_logs_admin_select', 'Audit logs must be protected and readable by admins.'],
    [coreRls, 'payments_admin_all', 'Finance payment policy is required.'],
    [moduleRls, 'webhook_events_admin_select', 'Webhook event policy is required.'],
    [moduleRls, 'otp_verifications_admin_select', 'OTP log policy is required.'],
    [fkIndexes, 'job_assignments_job_id_idx', 'OA FK performance index batch A is required.'],
    [fkIndexes, 'service_requests_intake_id_idx', 'Service request FK index batch A is required.'],
    [fkIndexes, 'warranties_job_id_idx', 'Warranty FK index batch A is required.'],
    [fkIndexesB, 'bookings_service_request_id_fk_idx', 'Booking service request FK index batch B is required.'],
    [fkIndexesB, 'service_requests_customer_id_fk_idx', 'Service request customer FK index batch B is required.'],
    [fkIndexesB, 'quotations_service_request_id_fk_idx', 'Quotation service request FK index batch B is required.'],
    [fkIndexesB, 'warranties_customer_id_fk_idx', 'Warranty customer FK index batch B is required.'],
    [env, 'SUPABASE_SERVICE_ROLE_KEY', '.env.example must document service role key.'],
    [env, 'NANOFIX_BACKUP_ENCRYPTION_KEY', '.env.example must document backup encryption key.'],
    [env, 'CRON_SECRET', '.env.example must document cron secret.'],
    [vercel, '/api/system/module-health-worker', 'Vercel cron health worker is required.']
  ];

  for (const [text, needle, message] of mustContain) {
    if (!text.includes(needle)) failures.push(message);
  }

  const requiredVerifyScripts = [
    'verify:auth-welcome',
    'verify:registration-review',
    'verify:social-accounts',
    'verify:website-social-links',
    'verify:field-rls',
    'verify:security-definer',
    'verify:core-rls',
    'verify:module-rls',
    'verify:oa-readiness'
  ];
  for (const script of requiredVerifyScripts) {
    if (!pkg.scripts?.[script]) failures.push(`Missing npm script: ${script}`);
    if (!pkg.scripts?.['validate:predeploy']?.includes(`npm run ${script}`)) {
      failures.push(`validate:predeploy must include ${script}`);
    }
  }
}

if (failures.length) {
  console.error('NANOFIX OA production readiness verification failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('NANOFIX OA production readiness verification passed.');
console.log('Checked OA auth, RBAC, audit, workflow, RLS, backup, health, social, website CMS, registration review and FK performance index readiness.');
