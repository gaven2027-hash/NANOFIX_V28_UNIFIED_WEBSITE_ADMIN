import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const exists = (file) => fs.existsSync(path.join(root, file));
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const failures = [];

const requiredFiles = [
  'app/page.tsx',
  'app/login/LoginShell.tsx',
  'app/register/RegisterShell.tsx',
  'app/api/health/route.ts',
  'app/api/ready/route.ts',
  'app/api/admin/service-operations/route.ts',
  'app/api/admin/registration-requests/route.ts',
  'app/api/admin/social-accounts/route.ts',
  'app/api/admin/website-social-links/route.ts',
  'app/api/public/registration-requests/route.ts',
  'app/api/public/website-social-links/route.ts',
  'app/api/system/module-health-worker/route.ts',
  'components/RegistrationReviewWorkspace.tsx',
  'components/ServiceOperationsWorkspace.tsx',
  'components/SocialAccountsBindingWorkspace.tsx',
  'components/WebsiteSocialLinksWorkspace.tsx',
  'middleware.ts',
  'docs/V28_1_2_SECURITY_HARDENING_SUMMARY.md',
  'supabase/migrations/20260523_0000_unified_website_admin_schema_bridge.sql',
  'supabase/migrations/20260526001000_v28_1_2_social_accounts_binding.sql',
  'supabase/migrations/20260526002000_v28_1_2_website_social_links.sql',
  'supabase/migrations/20260526003000_v28_1_2_portal_registration_requests.sql',
  'supabase/migrations/20260526004000_v28_1_2_field_work_rls_policies.sql',
  'supabase/migrations/20260526005000_v28_1_2_security_definer_access_hardening.sql',
  'supabase/migrations/20260526006000_v28_1_2_core_business_rls_policies.sql',
  'supabase/migrations/20260526007000_v28_1_2_module_rls_policies.sql',
  'supabase/migrations/20260526008000_v28_1_2_oa_fk_performance_indexes.sql',
  'supabase/migrations/20260526008100_v28_1_2_oa_fk_performance_indexes_b.sql',
  'tools/verify-oa-production-readiness.mjs'
];

for (const file of requiredFiles) {
  if (!exists(file)) failures.push(`Missing required file: ${file}`);
}

if (!failures.length) {
  const pkg = JSON.parse(read('package.json'));
  const middleware = read('middleware.ts');
  const loginShell = read('app/login/LoginShell.tsx');
  const registerShell = read('app/register/RegisterShell.tsx');
  const schema = read('supabase/migrations/20260523_0000_unified_website_admin_schema_bridge.sql');
  const fieldRls = read('supabase/migrations/20260526004000_v28_1_2_field_work_rls_policies.sql');
  const hardening = read('supabase/migrations/20260526005000_v28_1_2_security_definer_access_hardening.sql');
  const coreRls = read('supabase/migrations/20260526006000_v28_1_2_core_business_rls_policies.sql');
  const moduleRls = read('supabase/migrations/20260526007000_v28_1_2_module_rls_policies.sql');
  const fk = read('supabase/migrations/20260526008000_v28_1_2_oa_fk_performance_indexes.sql');
  const fkB = read('supabase/migrations/20260526008100_v28_1_2_oa_fk_performance_indexes_b.sql');

  const scripts = [
    'verify:service-flow',
    'verify:social-accounts',
    'verify:website-social-links',
    'verify:auth-welcome',
    'verify:registration-review',
    'verify:field-rls',
    'verify:security-definer',
    'verify:core-rls',
    'verify:module-rls',
    'verify:oa-readiness'
  ];

  for (const script of scripts) {
    if (!pkg.scripts?.[script]) failures.push(`Missing npm script: ${script}`);
    if (!pkg.scripts?.['validate:predeploy']?.includes(`npm run ${script}`)) {
      failures.push(`validate:predeploy must include ${script}`);
    }
  }

  const checks = [
    [middleware.includes('loginAliases') && middleware.includes('registerAliases'), 'Middleware must keep role login/register aliases.'],
    [middleware.includes('headers.delete(key)') && middleware.includes('x-admin-role'), 'Middleware must strip spoofed role headers.'],
    [loginShell.includes('team_on_site_premium.webp') && registerShell.includes('team_on_site_premium.webp'), 'Login/register must use homepage hero background.'],
    [schema.includes('transition_status_tx') && schema.includes('status_transition_logs'), 'OA status transaction and logs are required.'],
    [fieldRls.includes('job_assignments_engineer_own') && fieldRls.includes('customer_signatures_engineer_assigned'), 'Field work RLS policies are required.'],
    [hardening.includes('revoke execute on function public.handle_new_auth_user()') && hardening.includes('security_invoker'), 'Security definer hardening is required.'],
    [coreRls.includes('audit_logs_admin_select') && coreRls.includes('payments_admin_all'), 'Core business RLS policies are required.'],
    [moduleRls.includes('webhook_events_admin_select') && moduleRls.includes('otp_verifications_admin_select'), 'Module RLS policies are required.'],
    [fk.includes('job_assignments_job_id_idx') && fk.includes('service_requests_intake_id_idx') && fk.includes('warranties_job_id_idx'), 'OA foreign key index batch A is required.'],
    [fkB.includes('bookings_service_request_id_fk_idx') && fkB.includes('service_requests_customer_id_fk_idx') && fkB.includes('warranties_customer_id_fk_idx'), 'OA foreign key index batch B is required.']
  ];

  for (const [ok, message] of checks) {
    if (!ok) failures.push(message);
  }
}

const report = {
  ok: failures.length === 0,
  generated_at: new Date().toISOString(),
  package: 'NANOFIX V28.1.2 OA Production Readiness',
  failures
};

fs.writeFileSync(path.join(root, 'VALIDATION_REPORT_V28.json'), JSON.stringify(report, null, 2), 'utf8');
console.log(JSON.stringify(report, null, 2));
if (!report.ok) process.exitCode = 1;
