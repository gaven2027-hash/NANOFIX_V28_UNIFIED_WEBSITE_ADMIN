import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const migrationPath = path.join(root, 'supabase', 'migrations', '20260611_v28_7_practical_backend_foundation.sql');
const registryPath = path.join(root, 'data', 'v28.7-real-backend-registry.ts');

const migration = fs.readFileSync(migrationPath, 'utf8');
const registry = fs.readFileSync(registryPath, 'utf8');

const requiredTables = [
  'v287_service_chain_stages',
  'v287_customer_chain_stages',
  'integration_providers',
  'integration_credentials',
  'integration_test_logs',
  'webhook_events',
  'integration_outbox',
  'dead_letter_events',
  'platform_video_specs',
  'media_transform_jobs',
  'media_renditions'
];

const requiredProviders = [
  'whatsapp_cloud',
  'facebook_pages',
  'instagram_business',
  'google_business_profile',
  'youtube_shorts',
  'tiktok_business',
  'x_platform',
  'xiaohongshu_manual',
  'google_ads',
  'meta_ads',
  'tiktok_ads',
  'x_ads',
  'bing_ads'
];

const requiredServiceStages = [
  'leads_intake',
  'site_inspection',
  'quotations',
  'jobs_scheduling',
  'engineer_tasks',
  'invoices',
  'payments',
  'warranty_completion',
  'operations_audit'
];

const requiredCustomerStages = [
  'customer_profiles',
  'customer_binding_verification',
  'customer_portal_accounts',
  'repair_tracking',
  'quotes_payments',
  'warranty_documents',
  'reviews_feedback',
  'privacy_consent'
];

const requiredVideoSpecs = [
  ['instagram', 'reels'],
  ['facebook', 'reels'],
  ['tiktok', 'organic'],
  ['youtube', 'shorts'],
  ['x', 'video_landscape'],
  ['x', 'video_square'],
  ['google_business_profile', 'post_video'],
  ['xiaohongshu', 'note_video'],
  ['ads', 'vertical_video'],
  ['ads', 'square_video']
];

function fail(message) {
  console.error(`V28.7 real backend foundation verification failed: ${message}`);
  process.exitCode = 1;
}

for (const table of requiredTables) {
  if (!migration.includes(`create table if not exists public.${table}`)) {
    fail(`Missing create table statement for ${table}`);
  }
  if (!migration.includes(`alter table public.${table} enable row level security`)) {
    fail(`Missing RLS enable statement for ${table}`);
  }
}

if (/disable\s+row\s+level\s+security/i.test(migration)) {
  fail('Migration must not disable RLS');
}

if (/drop\s+table|truncate\s+table|delete\s+from\s+public\./i.test(migration)) {
  fail('Migration must not drop, truncate or delete production data');
}

for (const provider of requiredProviders) {
  if (!migration.includes(`'${provider}'`) || !registry.includes(`key: '${provider}'`)) {
    fail(`Missing provider in migration or registry: ${provider}`);
  }
}

for (const stage of requiredServiceStages) {
  if (!migration.includes(`'${stage}'`) || !registry.includes(`key: '${stage}'`)) {
    fail(`Missing service stage in migration or registry: ${stage}`);
  }
}

for (const stage of requiredCustomerStages) {
  if (!migration.includes(`'${stage}'`) || !registry.includes(`key: '${stage}'`)) {
    fail(`Missing customer stage in migration or registry: ${stage}`);
  }
}

for (const [platform, placement] of requiredVideoSpecs) {
  if (!migration.includes(`'${platform}', '${placement}'`)) {
    fail(`Missing video spec seed in migration: ${platform}/${placement}`);
  }
  if (!registry.includes(`platform: '${platform}', placement: '${placement}'`)) {
    fail(`Missing video spec registry entry: ${platform}/${placement}`);
  }
}

if (!migration.includes('encrypted_payload text') || !migration.includes('Never return encrypted_payload or plaintext secrets')) {
  fail('API Credential Center must declare encrypted payload storage and no-plaintext policy comment');
}

if (!process.exitCode) {
  console.log('V28.7 real backend foundation verification passed. Service, customer, integration, webhook, outbox, dead-letter and video rules are present with RLS enabled.');
}
