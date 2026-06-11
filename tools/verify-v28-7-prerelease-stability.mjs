import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');
const exists = (relativePath) => fs.existsSync(path.join(root, relativePath));

const files = {
  portalShell: 'components/PortalShell.tsx',
  customerPortalNav: 'data/v28.7-customer-portal-navigation.ts',
  adminNav: 'data/v28.7-admin-navigation.ts',
  adminNavShim: 'data/adminNavigation.ts',
  reviewSettings: 'components/CustomerReviewLinkSettings.tsx',
  reviewButton: 'components/CustomerReviewLinkButton.tsx',
  reviewAdminApi: 'app/api/admin/customer-review-links/route.ts',
  reviewCustomerApi: 'app/api/customer/review-links/route.ts',
  customerReviewMigration: 'supabase/migrations/20260611_v28_7_customer_review_links.sql',
  backendMigration: 'supabase/migrations/20260611_v28_7_practical_backend_foundation.sql',
  engineerPage: 'app/portal/engineer/page.tsx',
  customerPage: 'app/portal/customer/page.tsx',
  systemSettingsPage: 'app/system-settings/page.tsx'
};

function fail(message) {
  console.error(`V28.7 prerelease stability verification failed: ${message}`);
  process.exitCode = 1;
}

for (const [label, relativePath] of Object.entries(files)) {
  if (!exists(relativePath)) fail(`Missing required file: ${label} (${relativePath})`);
}

const portalShell = read(files.portalShell);
const customerPortalNav = read(files.customerPortalNav);
const adminNavShim = read(files.adminNavShim);
const reviewSettings = read(files.reviewSettings);
const reviewAdminApi = read(files.reviewAdminApi);
const reviewCustomerApi = read(files.reviewCustomerApi);
const customerReviewMigration = read(files.customerReviewMigration);
const backendMigration = read(files.backendMigration);
const engineerPage = read(files.engineerPage);
const customerPage = read(files.customerPage);
const systemSettingsPage = read(files.systemSettingsPage);

if (!adminNavShim.includes("./v28.7-admin-navigation")) {
  fail('data/adminNavigation.ts must re-export the V28.7 admin navigation shim');
}

if (!portalShell.includes("'customer' | 'engineer'")) {
  fail('PortalShell must accept both customer and engineer portal types');
}
if (!portalShell.includes('export function CustomerPortalAnchors') || !portalShell.includes('export function EngineerPortalAnchors')) {
  fail('PortalShell must export both CustomerPortalAnchors and EngineerPortalAnchors');
}
if (engineerPage.includes('EngineerPortalAnchors') && !portalShell.includes('export function EngineerPortalAnchors')) {
  fail('Engineer portal page imports EngineerPortalAnchors but PortalShell does not export it');
}
if (customerPage.includes('CustomerPortalAnchors') && !portalShell.includes('export function CustomerPortalAnchors')) {
  fail('Customer portal page imports CustomerPortalAnchors but PortalShell does not export it');
}

const customerMenuCount = (customerPortalNav.match(/href: '\/customer-portal#/g) || []).length;
if (customerMenuCount !== 5) fail(`Customer portal must have exactly five visible menus, found ${customerMenuCount}`);
if (!customerPortalNav.includes('includesReviewLink: true')) fail('Customer portal Support & Account must include the review link flag');
if (!portalShell.includes('grid grid-cols-5') || !portalShell.includes('lg:hidden')) fail('PortalShell must include mobile five-tab navigation');

if (!reviewSettings.includes('/api/admin/customer-review-links')) fail('Review settings panel must call admin review link API');
if (!reviewSettings.includes('https://')) fail('Review settings panel must guide admins to enter https URLs');
if (!systemSettingsPage.includes('CustomerReviewLinkSettings')) fail('System settings page must render CustomerReviewLinkSettings');

if (!reviewAdminApi.includes('requireAdminApi')) fail('Admin customer-review-links API must require admin auth');
if (!reviewAdminApi.includes('writeAuditLog')) fail('Admin customer-review-links API must write audit logs');
if (!reviewCustomerApi.includes(".eq('is_active', true)")) fail('Customer review-links API must expose only active links');
if (reviewCustomerApi.includes('created_by') || reviewCustomerApi.includes('updated_by')) fail('Customer review-links API must not expose internal audit fields');

for (const migration of [customerReviewMigration, backendMigration]) {
  if (/disable\s+row\s+level\s+security/i.test(migration)) fail('Migrations must not disable RLS');
  if (/drop\s+table|truncate\s+table|delete\s+from\s+public\./i.test(migration)) fail('Migrations must not drop, truncate or delete production data');
}
if (!customerReviewMigration.includes('alter table public.customer_review_links enable row level security')) {
  fail('customer_review_links migration must enable RLS');
}

const requiredVerifyScripts = [
  'tools/verify-v28-7-admin-menu.mjs',
  'tools/verify-v28-7-real-backend-foundation.mjs',
  'tools/verify-v28-7-customer-review-links.mjs',
  'tools/verify-v28-7-customer-portal-menu.mjs'
];
for (const script of requiredVerifyScripts) {
  if (!exists(script)) fail(`Missing required verification script: ${script}`);
}

if (!process.exitCode) {
  console.log('V28.7 prerelease stability verification passed. Core menu, portal, review link, API, migration and verification guardrails are present.');
}
