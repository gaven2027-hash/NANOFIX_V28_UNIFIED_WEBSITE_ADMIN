import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const files = {
  migration: path.join(root, 'supabase', 'migrations', '20260611_v28_7_customer_review_links.sql'),
  adminApi: path.join(root, 'app', 'api', 'admin', 'customer-review-links', 'route.ts'),
  customerApi: path.join(root, 'app', 'api', 'customer', 'review-links', 'route.ts'),
  settings: path.join(root, 'components', 'CustomerReviewLinkSettings.tsx'),
  button: path.join(root, 'components', 'CustomerReviewLinkButton.tsx'),
  systemPage: path.join(root, 'app', 'system-settings', 'page.tsx'),
  portalShell: path.join(root, 'components', 'PortalShell.tsx')
};

const content = Object.fromEntries(Object.entries(files).map(([key, filePath]) => [key, fs.readFileSync(filePath, 'utf8')]));

function fail(message) {
  console.error(`V28.7 customer review link verification failed: ${message}`);
  process.exitCode = 1;
}

if (!content.migration.includes('create table if not exists public.customer_review_links')) fail('Missing customer_review_links table migration');
if (!content.migration.includes('alter table public.customer_review_links enable row level security')) fail('customer_review_links must enable RLS');
if (/disable\s+row\s+level\s+security/i.test(content.migration)) fail('Migration must not disable RLS');
if (/drop\s+table|truncate\s+table|delete\s+from\s+public\./i.test(content.migration)) fail('Migration must not drop, truncate or delete data');
if (!content.migration.includes("review_url ~* '^https?://'")) fail('Migration must enforce http/https review URL');

if (!content.adminApi.includes('requireAdminApi')) fail('Admin review link API must require admin auth');
if (!content.adminApi.includes('writeAuditLog')) fail('Admin review link API must write audit logs');
if (!content.adminApi.includes('/^https?:\\/\\//i.test')) fail('Admin review link API must validate http/https URL');

if (!content.customerApi.includes(".eq('is_active', true)")) fail('Customer review link API must expose only active links');
if (content.customerApi.includes('created_by') || content.customerApi.includes('updated_by')) fail('Customer API must not expose internal audit fields');

if (!content.settings.includes('CustomerReviewLinkSettings')) fail('Missing settings component export');
if (!content.settings.includes('/api/admin/customer-review-links')) fail('Settings component must call admin review link API');
if (!content.systemPage.includes('CustomerReviewLinkSettings')) fail('System settings page must render CustomerReviewLinkSettings');

if (!content.button.includes('/api/customer/review-links')) fail('Customer button must read public customer review link API');
if (!content.button.includes('Leave a Review / 我要评论')) fail('Customer button must show bilingual review label');
if (!content.portalShell.includes('CustomerReviewLinkButton')) fail('Customer portal shell must render CustomerReviewLinkButton');
if (!content.portalShell.includes('submit-review-link')) fail('Customer portal must include submit-review-link anchor');

if (!process.exitCode) {
  console.log('V28.7 customer review link verification passed. Admin settings, customer portal button, API validation, RLS migration and audit logging are present.');
}
