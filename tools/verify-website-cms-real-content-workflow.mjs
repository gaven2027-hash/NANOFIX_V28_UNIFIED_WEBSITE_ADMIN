import { existsSync, readFileSync } from 'node:fs';

const failures = [];
const read = (file) => existsSync(file) ? readFileSync(file, 'utf8') : '';
const assert = (condition, message) => { if (!condition) failures.push(message); };

const migration = read('supabase/migrations/20260604_v28_4_4_website_cms_real_content_seed.sql');
const api = read('app/api/admin/website-management/route.ts');
const ui = read('components/WebsiteManagementLiveCore.tsx');
const packageJson = read('package.json');

const requiredSlugs = [
  'home',
  'leak-detection',
  'no-hacking-repair',
  'waterproofing-works',
  'track-record-warranty',
  'guide',
  'free-quote'
];

const requiredBlockKeys = [
  'hero',
  'why_choose_nanofix',
  'homepage_cta',
  'service_cards',
  'seo_faq',
  'method_comparison',
  'care_notice',
  'scope',
  'quality_control',
  'warranty_terms',
  'client_portal',
  'faq',
  'aeo_answer_block',
  'form_guidance',
  'contact_cta'
];

assert(Boolean(migration), 'V28.4.4 CMS real content seed migration file must exist.');
assert(migration.includes('NANOFIX V28.4.4 Website CMS Real Content Seed & Publish Workflow'), 'Migration must include V28.4.4 title marker.');
assert(migration.includes('non-destructive') || migration.includes('Non-destructive'), 'Migration must document non-destructive behavior.');
assert(migration.includes('Do not reset the production database'), 'Migration must document no production reset.');
assert(migration.includes('Do not run migration repair blindly'), 'Migration must document no blind migration repair.');
assert(migration.includes('website_pages_locale_slug_uidx'), 'Migration must ensure page locale+slug uniqueness.');
assert(migration.includes('website_content_blocks_page_locale_key_uidx'), 'Migration must ensure block page+locale+key uniqueness.');
assert(migration.includes('route_path'), 'Migration must include route_path for production CMS schema compatibility.');
assert(migration.includes('content_type'), 'Migration must include content_type for website_content_blocks production schema.');
assert(migration.includes('content_json'), 'Migration must include content_json for website_content_blocks production schema.');
assert(migration.includes('published_version'), 'Migration must include published_version for website_content_blocks production schema.');
assert(migration.includes('jsonb_build_object'), 'Migration must build content_json for seeded content blocks.');
assert(migration.includes('on conflict (locale, slug)'), 'CMS pages must be idempotent via upsert.');
assert(migration.includes('on conflict (page_id, locale, block_key)'), 'CMS blocks must be idempotent via upsert.');
assert(!/drop\s+table|drop\s+column|truncate\s+table|delete\s+from/i.test(migration), 'Migration must not drop, truncate, or delete CMS data.');

for (const slug of requiredSlugs) assert(migration.includes(`'${slug}'`), `CMS seed must include page slug: ${slug}`);
for (const blockKey of requiredBlockKeys) assert(migration.includes(`'${blockKey}'`), `CMS seed must include content block key: ${blockKey}`);

for (const marker of [
  'NANOFIX Singapore No-Hacking Leak Repair & Waterproofing',
  'Leak Detection Services',
  'No-Hacking Leak Repair',
  'Waterproofing Works',
  'Track Record & Warranty',
  'Water Leak Guide & FAQs',
  'Get a Free Quote',
  'AI Answer Summary',
  'Customer Portal & Repair Tracking'
]) {
  assert(migration.includes(marker), `CMS seed must include visible content marker: ${marker}`);
}

assert(api.includes("action === 'create_page'"), 'Website Management API must support create_page.');
assert(api.includes("action === 'create_block'"), 'Website Management API must support create_block.');
assert(api.includes("website_page_status_update"), 'Website Management API must audit page status updates.');
assert(api.includes("website_content_block_status_update"), 'Website Management API must audit block status updates.');
assert(api.includes("pending_approval") && api.includes("published") && api.includes("archived"), 'Website Management API must support approval, publish and archive states.');
assert(api.includes("published_at"), 'Website Management API must set published_at for published pages.');

assert(ui.includes('Create CMS Draft'), 'Website Management UI must expose Create CMS Draft.');
assert(ui.includes('Send Approval'), 'Website Management UI must expose Send Approval action.');
assert(ui.includes('Publish'), 'Website Management UI must expose Publish action.');
assert(ui.includes('Archive'), 'Website Management UI must expose Archive action.');
assert(ui.includes('CMS page created and audited'), 'Website Management UI must show page creation audit success message.');
assert(ui.includes('Content block created and audited'), 'Website Management UI must show block creation audit success message.');

assert(packageJson.includes('verify:website-cms-real-content-workflow'), 'package.json must define verify:website-cms-real-content-workflow.');
assert(packageJson.includes('verify:website-cms-schema-alignment && npm run verify:website-cms-real-content-workflow'), 'validate:predeploy must run V28.4.4 verification after schema alignment.');

if (failures.length) {
  console.error('Website CMS real content workflow verification failed:');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log('Website CMS real content workflow verification passed.');
