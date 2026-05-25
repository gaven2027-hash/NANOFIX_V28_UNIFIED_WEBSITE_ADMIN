import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const exists = (file) => fs.existsSync(path.join(root, file));

const requiredFiles = [
  'supabase/migrations/20260526001000_v28_1_2_social_accounts_binding.sql',
  'app/api/admin/social-accounts/route.ts',
  'components/SocialAccountsBindingWorkspace.tsx',
  'app/social-media/[section]/page.tsx',
  'lib/nanofix/socialMediaConfig.ts'
];

const requiredPlatforms = [
  'facebook',
  'instagram',
  'tiktok',
  'youtube_shorts',
  'xiaohongshu',
  'google_business_profile',
  'whatsapp'
];

const requiredColumns = [
  'social_account_id',
  'platform',
  'account_name',
  'account_handle',
  'account_url',
  'business_id',
  'page_id',
  'app_id',
  'connection_status',
  'is_active',
  'webhook_url',
  'api_base_url',
  'access_token_secret_name',
  'refresh_token_secret_name',
  'token_expires_at',
  'permissions_json',
  'settings_json',
  'notes'
];

const failures = [];
for (const file of requiredFiles) {
  if (!exists(file)) failures.push(`Missing required file: ${file}`);
}

if (!failures.length) {
  const migration = read('supabase/migrations/20260526001000_v28_1_2_social_accounts_binding.sql');
  const api = read('app/api/admin/social-accounts/route.ts');
  const workspace = read('components/SocialAccountsBindingWorkspace.tsx');
  const page = read('app/social-media/[section]/page.tsx');
  const config = read('lib/nanofix/socialMediaConfig.ts');

  if (!migration.includes('create table if not exists public.social_accounts')) failures.push('social_accounts migration table is missing.');
  if (!migration.includes('enable row level security')) failures.push('social_accounts RLS is missing.');
  if (!migration.includes('social_accounts_admin_all')) failures.push('social_accounts admin RLS policy is missing.');

  for (const column of requiredColumns) {
    if (!migration.includes(column) || !api.includes(column)) failures.push(`Missing social account column in migration/API: ${column}`);
  }

  for (const platform of requiredPlatforms) {
    if (!api.includes(platform) || !workspace.includes(platform)) failures.push(`Missing social platform support: ${platform}`);
  }

  if (!api.includes('export async function GET') || !api.includes('export async function POST') || !api.includes('export async function PATCH')) {
    failures.push('social-accounts API must support GET, POST and PATCH.');
  }
  if (!api.includes('auditLog') || !api.includes('create_social_account_binding') || !api.includes('update_social_account_binding')) {
    failures.push('social-accounts API must write audit logs for create/update.');
  }
  if (!workspace.includes('/api/admin/social-accounts')) failures.push('SocialAccountsBindingWorkspace does not call /api/admin/social-accounts.');
  if (!page.includes('SocialAccountsBindingWorkspace') || !page.includes("section.key === 'social-accounts'")) {
    failures.push('/social-media/social-accounts is not routed to SocialAccountsBindingWorkspace.');
  }
  if (!config.includes("key: 'social-accounts'")) failures.push('socialMediaConfig is missing social-accounts section.');
}

if (failures.length) {
  console.error('NANOFIX social account binding verification failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('NANOFIX social account binding verification passed.');
console.log('Checked social_accounts table, API, UI workspace, route and audit logging.');
