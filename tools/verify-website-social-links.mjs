import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const exists = (file) => fs.existsSync(path.join(root, file));

const requiredFiles = [
  'supabase/migrations/20260526002000_v28_1_2_website_social_links.sql',
  'app/api/admin/website-social-links/route.ts',
  'app/api/public/website-social-links/route.ts',
  'components/WebsiteSocialLinksWorkspace.tsx',
  'app/website-management/[section]/page.tsx',
  'lib/nanofix/websiteManagementConfig.ts'
];

const requiredPlatforms = ['facebook', 'instagram', 'tiktok', 'youtube'];
const requiredColumns = [
  'website_social_link_id',
  'platform',
  'label',
  'url',
  'icon_key',
  'display_order',
  'placement',
  'is_active',
  'open_new_tab',
  'rel_attr',
  'notes'
];

const failures = [];
for (const file of requiredFiles) {
  if (!exists(file)) failures.push(`Missing required file: ${file}`);
}

if (!failures.length) {
  const migration = read('supabase/migrations/20260526002000_v28_1_2_website_social_links.sql');
  const adminApi = read('app/api/admin/website-social-links/route.ts');
  const publicApi = read('app/api/public/website-social-links/route.ts');
  const workspace = read('components/WebsiteSocialLinksWorkspace.tsx');
  const page = read('app/website-management/[section]/page.tsx');
  const config = read('lib/nanofix/websiteManagementConfig.ts');

  if (!migration.includes('create table if not exists public.website_social_links')) failures.push('website_social_links migration table is missing.');
  if (!migration.includes('enable row level security')) failures.push('website_social_links RLS is missing.');
  if (!migration.includes('website_social_links_admin_all')) failures.push('website_social_links admin RLS policy is missing.');

  for (const column of requiredColumns) {
    if (!migration.includes(column) || !adminApi.includes(column)) failures.push(`Missing website social link column in migration/admin API: ${column}`);
  }

  for (const platform of requiredPlatforms) {
    if (!migration.includes(`'${platform}'`) || !workspace.includes(platform) || !adminApi.includes(platform)) {
      failures.push(`Missing default public website social platform support: ${platform}`);
    }
  }

  if (!adminApi.includes('export async function GET') || !adminApi.includes('export async function POST') || !adminApi.includes('export async function PATCH')) {
    failures.push('website-social-links admin API must support GET, POST and PATCH.');
  }

  if (!adminApi.includes('auditLog') || !adminApi.includes('create_website_social_link') || !adminApi.includes('update_website_social_link')) {
    failures.push('website-social-links admin API must write audit logs for create/update.');
  }

  if (!publicApi.includes('export async function GET') || !publicApi.includes('is_active') || !publicApi.includes('publicColumns')) {
    failures.push('website-social-links public API must expose only active public link fields.');
  }

  if (!workspace.includes('/api/admin/website-social-links')) failures.push('WebsiteSocialLinksWorkspace does not call /api/admin/website-social-links.');
  if (!page.includes('WebsiteSocialLinksWorkspace') || !page.includes("section.key === 'contact-social-links'")) {
    failures.push('/website-management/contact-social-links is not routed to WebsiteSocialLinksWorkspace.');
  }
  if (!config.includes("key: 'contact-social-links'")) failures.push('websiteManagementConfig is missing contact-social-links section.');
}

if (failures.length) {
  console.error('NANOFIX website social links verification failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('NANOFIX website social links verification passed.');
console.log('Checked website_social_links table, admin API, public API, Website Management UI and default 4 social platforms.');
