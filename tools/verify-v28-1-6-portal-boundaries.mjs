#!/usr/bin/env node
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
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

function walk(dir, files = []) {
  if (!existsSync(dir)) return files;
  for (const entry of readdirSync(dir)) {
    if (['.git', 'node_modules', '.next', 'out', 'dist', '.vercel'].includes(entry)) continue;
    const path = join(dir, entry);
    const stat = statSync(path);
    if (stat.isDirectory()) walk(path, files);
    else files.push(path);
  }
  return files;
}

function repoContains(pattern) {
  return walk(root).some((file) => {
    if (!/\.(tsx?|jsx?|mjs|cjs|json|md|sql|yml|yaml)$/.test(file)) return false;
    if (file.endsWith('docs/NANOFIX_V28_1_6_FINAL_CHAT_MEMORY_20260527.md')) return false;
    if (file.endsWith('tools/verify-v28-1-6-portal-boundaries.mjs')) return false;
    const text = read(file);
    return pattern.test(text);
  });
}

const middleware = read('middleware.ts');
const loginForm = read('app/login/LoginForm.tsx');
const loginShell = read('app/login/LoginShell.tsx');
const registerForm = read('app/register/RegisterForm.tsx');
const registerShell = read('app/register/RegisterShell.tsx');
const customerPortalPage = read('app/customer-portal/page.tsx');
const portalShell = read('components/PortalShell.tsx');
const publicRegistrationApi = read('app/api/public/registration-requests/route.ts');
const publicServiceRequestApi = read('app/api/public/service-requests/route.ts');
const adminRegistrationApi = read('app/api/admin/registration-requests/route.ts');
const registrationReview = read('components/RegistrationReviewWorkspace.tsx');
const adminNavigation = read('data/adminNavigation.ts');
const engineerPortalPage = read('app/engineer-portal/page.tsx');
const packageJson = read('package.json');

must(loginForm.includes("type LoginContext = 'admin' | 'customer'"), 'Login form only exposes admin/customer contexts');
must(loginForm.includes('NANOFIX Internal Admin App') && loginForm.includes('NANOFIX Customer Portal'), 'Login form copy separates Internal Admin App and Customer Portal');
must(loginForm.includes("profile.role === 'customer' ? '/customer-portal' : '/dashboard'"), 'Login redirect sends customers to customer portal and all internal staff to dashboard');
must(loginForm.includes('!requestedNext.includes(\'engineer-portal\')'), 'Login blocks stale engineer-portal next redirect');
must(loginForm.includes('Engineer / Inspection users no longer use a separate Engineer Portal'), 'Login copy documents no separate engineer portal');
must(loginShell.includes('/assets/images/team_on_site_premium.webp') && loginShell.includes('bg-slate-950/55'), 'Login shell uses homepage hero-style background with dark overlay');

must(registerForm.includes("type RegisterContext = 'admin' | 'customer'"), 'Register form only exposes admin/customer contexts');
must(registerShell.includes("type RegisterContext = 'admin' | 'customer'"), 'Register shell only exposes admin/customer contexts');
must(registerShell.includes('/assets/images/team_on_site_premium.webp') && registerShell.includes('bg-slate-950/55'), 'Register shell uses homepage hero-style background with dark overlay');
must(registerForm.includes('inspection_repair') && registerForm.includes('Engineer / Inspection'), 'Engineer/Inspection exists only as internal role group');
must(registerForm.includes('super_admin') && registerForm.includes('operations') && registerForm.includes('finance'), 'Internal role groups include Super Admin, Operations and Finance');
must(registerForm.includes('internal_admin_app_register') && registerForm.includes('customer_portal_register'), 'Registration source separates internal app and customer portal');
must(registerForm.includes('pending_super_admin_review'), 'Internal staff registration requires Super Admin review');
must(!registerForm.includes("type RegisterContext = 'admin' | 'customer' | 'engineer'"), 'Standalone engineer register context is absent');

must(middleware.includes('const legacyEngineerPortalRoutes = ["/engineer-portal"]'), 'Middleware explicitly handles legacy engineer portal route');
must(middleware.includes('"/engineer-login": "admin"'), 'Legacy engineer-login aliases to internal admin login');
must(middleware.includes('redirectLegacyEngineerPortal'), 'Legacy engineer portal redirects away from standalone portal');
must(middleware.includes('url.pathname = "/dashboard"'), 'Legacy engineer portal lands on Internal Admin dashboard');
must(middleware.includes('"/api/portal/engineer"') && middleware.includes('apiAdminRoutes'), 'Engineer portal API is protected as internal admin API');
must(!middleware.includes('type PortalContext = "admin" | "customer" | "engineer"'), 'Middleware no longer treats engineer as portal context');

must(customerPortalPage.includes('<PortalShell type="customer">') && !customerPortalPage.includes('AdminShell'), 'Customer portal remains outside Internal Admin left menu shell');
must(portalShell.includes('New Repair Request') && portalShell.includes('Warranty Claim'), 'Customer Portal includes New Repair Request and Warranty Claim');
must(portalShell.includes('Submit Review') && portalShell.includes('Review Privacy Settings'), 'Customer Portal includes reviews and privacy settings');
must(!portalShell.includes('EngineerPortalAnchors') && !portalShell.includes('const engineerLinks'), 'PortalShell no longer exposes standalone engineer portal menu');

must(publicRegistrationApi.includes("const allowedRequestedRoles = ['customer', 'admin']"), 'Public registration API allows only customer/admin request types');
must(publicRegistrationApi.includes('super_admin') && publicRegistrationApi.includes('inspection_repair') && publicRegistrationApi.includes('operations') && publicRegistrationApi.includes('finance'), 'Public registration API accepts final internal role groups');
must(!publicRegistrationApi.includes("'engineer'") && publicRegistrationApi.includes('requested_role_group'), 'Public registration API has no standalone engineer role and stores role group');
must(adminRegistrationApi.includes('roleFromGroup') && adminRegistrationApi.includes('approve_portal_registration_request'), 'Admin registration approval maps role group and writes audit log');
must(adminRegistrationApi.includes("group === 'inspection_repair'") && adminRegistrationApi.includes("group === 'super_admin'"), 'Admin registration approval maps final V28.1.6 role groups');
must(registrationReview.includes('Final Role Group / 最终角色分组') && registrationReview.includes('Inspection & Repair / 检修'), 'Registration review UI can correct Engineer/Inspection role group');

must(publicServiceRequestApi.includes("requestType: z.enum(['new_repair', 'warranty_claim'])"), 'Public service request API supports new repair and warranty claim');
must(publicServiceRequestApi.includes("unified_intake") && publicServiceRequestApi.includes("leads") && publicServiceRequestApi.includes("service_requests"), 'Public service request API writes unified_intake, leads and service_requests');
must(publicServiceRequestApi.includes('source_type') && publicServiceRequestApi.includes('utm_campaign'), 'Public service request API captures attribution fields');

must(adminNavigation.includes("Customer Review Carousel") && adminNavigation.includes("Review Deletion & Audit"), 'Admin navigation restored review/testimonial final menu items');
must(adminNavigation.includes("Internal Staff Login & Registration") && adminNavigation.includes("Customer Portal Login & Registration"), 'Admin navigation restored login/registration settings');
must(!adminNavigation.includes("Engineer Portal") && !adminNavigation.includes("Customer Portal / 客户会员中心\',"), 'Admin navigation does not include standalone portal first-level modules');

must(!existsSync('app/register/engineer/page.tsx'), 'No standalone engineer register page exists');
must(!existsSync('app/engineer-login/page.tsx'), 'No standalone engineer login page exists');
must(engineerPortalPage.includes("redirect('/login?role=admin&reason=engineer_uses_internal_admin_app')"), 'Legacy engineer portal is compatibility redirect only');

must(packageJson.includes('verify:v28-1-6-portals'), 'package.json exposes V28.1.6 portal verification script');

const prohibitedStandaloneEngineerCopy = repoContains(/Engineer\s+(Portal|Register|Registration|Login)\s*(Page|Route)?/i);
warn(!prohibitedStandaloneEngineerCopy, 'No broad standalone Engineer Portal/Register/Login copy remains outside compatibility/memory handling');

if (failures.length) {
  console.error(`\nV28.1.6 portal boundary verification failed: ${failures.length} issue(s).`);
  process.exit(1);
}

console.log(`\nV28.1.6 portal boundary verification passed.${warnings.length ? ` Warnings: ${warnings.length}.` : ''}`);
