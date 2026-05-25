import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const exists = (file) => fs.existsSync(path.join(root, file));
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const failures = [];
const warnings = [];
const assert = (ok, message) => { if (!ok) failures.push(message); };
const warn = (ok, message) => { if (!ok) warnings.push(message); };

const requiredFiles = [
  'package.json',
  'package-lock.json',
  '.npmrc',
  '.nvmrc',
  '.env.example',
  'vercel.json',
  'next.config.mjs',
  'middleware.ts',
  'app/api/health/route.ts',
  'app/api/ready/route.ts',
  'app/api/admin/service-operations/route.ts',
  'app/api/admin/registration-requests/route.ts',
  'app/api/admin/social-accounts/route.ts',
  'app/api/admin/website-social-links/route.ts',
  'app/api/admin/backups/jobs/route.ts',
  'app/api/system/module-health-worker/route.ts',
  'components/RegistrationReviewWorkspace.tsx',
  'components/ServiceOperationsWorkspace.tsx',
  'components/SocialAccountsBindingWorkspace.tsx',
  'components/WebsiteSocialLinksWorkspace.tsx',
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
  'tools/verify-oa-production-readiness.mjs'
];

for (const file of requiredFiles) assert(exists(file), `Missing required deployment file: ${file}`);

if (!failures.length) {
  const pkg = JSON.parse(read('package.json'));
  const npmrc = read('.npmrc');
  const env = read('.env.example');
  const vercel = read('vercel.json');
  const middleware = read('middleware.ts');
  const nextConfig = read('next.config.mjs');
  const schema = read('supabase/migrations/20260523_0000_unified_website_admin_schema_bridge.sql');
  const fieldRls = read('supabase/migrations/20260526004000_v28_1_2_field_work_rls_policies.sql');
  const securityDefiner = read('supabase/migrations/20260526005000_v28_1_2_security_definer_access_hardening.sql');
  const coreRls = read('supabase/migrations/20260526006000_v28_1_2_core_business_rls_policies.sql');
  const moduleRls = read('supabase/migrations/20260526007000_v28_1_2_module_rls_policies.sql');
  const fk = read('supabase/migrations/20260526008000_v28_1_2_oa_fk_performance_indexes.sql');

  for (const script of ['validate:predeploy','build:ci','quality:gate','verify:oa-readiness','verify:service-flow','verify:registration-review','verify:field-rls','verify:security-definer','verify:core-rls','verify:module-rls']) {
    assert(pkg.scripts?.[script], `Missing npm script: ${script}`);
  }
  for (const script of ['verify:oa-readiness','verify:service-flow','verify:registration-review','verify:field-rls','verify:security-definer','verify:core-rls','verify:module-rls']) {
    assert(pkg.scripts?.['validate:predeploy']?.includes(`npm run ${script}`), `validate:predeploy must include ${script}`);
  }

  assert(pkg.engines?.node?.includes('>=20') && pkg.engines?.node?.includes('<23'), 'Node engine must be >=20 and <23.');
  assert(read('.nvmrc').trim() === '20', '.nvmrc must pin Node 20.');
  assert(npmrc.includes('registry=https://registry.npmjs.org/'), '.npmrc must use public npm registry.');
  assert(npmrc.includes('engine-strict=true'), '.npmrc must enforce engines.');
  assert(!/npmmirror|cnpm|taobao|verdaccio|localhost:4873/i.test(read('package-lock.json')), 'package-lock must not use internal registry.');
  assert(vercel.includes('validate:predeploy') && vercel.includes('build:ci'), 'Vercel build command must run validation and build.');
  assert(vercel.includes('/api/system/module-health-worker'), 'Vercel cron health worker is required.');
  assert(env.includes('SUPABASE_SERVICE_ROLE_KEY') && env.includes('NANOFIX_BACKUP_ENCRYPTION_KEY') && env.includes('CRON_SECRET'), 'Required secure environment variables must be documented.');
  assert(middleware.includes('headers.delete(key)') && middleware.includes('x-admin-role') && middleware.includes('x-nanofix-role'), 'Middleware must strip spoofed role headers.');
  assert(middleware.includes('loginAliases') && middleware.includes('registerAliases'), 'Middleware must keep role-based login/register aliases.');
  assert(nextConfig.includes('Content-Security-Policy') && nextConfig.includes('Strict-Transport-Security'), 'Security headers are required.');
  assert(schema.includes('transition_status_tx') && schema.includes('status_transition_logs'), 'Transactional status flow and status logs are required.');
  assert(fieldRls.includes('job_assignments_engineer_own') && fieldRls.includes('job_photos_engineer_assigned'), 'Field work engineer RLS is required.');
  assert(securityDefiner.includes('revoke execute on function public.handle_new_auth_user()') && securityDefiner.includes('security_invoker'), 'Security definer hardening is required.');
  assert(coreRls.includes('audit_logs_admin_select') && coreRls.includes('payments_admin_all'), 'Core business RLS is required.');
  assert(moduleRls.includes('webhook_events_admin_select') && moduleRls.includes('otp_verifications_admin_select'), 'Module RLS is required.');
  assert(fk.includes('job_assignments_job_id_idx') && fk.includes('service_requests_intake_id_idx') && fk.includes('warranties_job_id_idx'), 'OA FK indexes are required.');
  warn(!nextConfig.includes("'unsafe-inline'"), "CSP still allows unsafe-inline for legacy visual lock; acceptable short-term, remove after component rewrite.");
}

if (failures.length) {
  console.error('NANOFIX OA deployment readiness check failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(JSON.stringify({ ok: true, checks: 'nanofix_v28_1_2_oa_deployment_ready', warnings }, null, 2));
