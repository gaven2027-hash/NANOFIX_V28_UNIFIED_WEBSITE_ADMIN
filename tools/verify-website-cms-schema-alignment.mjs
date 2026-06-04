import { existsSync, readFileSync } from 'node:fs';

const failures = [];
const read = (file) => existsSync(file) ? readFileSync(file, 'utf8') : '';
const assert = (condition, message) => { if (!condition) failures.push(message); };

const api = read('app/api/admin/website-management/route.ts');
const migration = read('supabase/migrations/20260604_v28_4_3_website_cms_schema_alignment.sql');
const liveCore = read('components/WebsiteManagementLiveCore.tsx');

assert(api.includes("fallbackSelect: 'page_id,locale,title"), 'Website pages API must include fallback select without slug.');
assert(api.includes("fallbackSelect: 'block_id,block_key"), 'Content blocks API must include fallback select without page_id.');
assert(api.includes('isMissingColumnError'), 'Website Management API must detect missing-column schema drift.');
assert(api.includes('normalizeCmsRow'), 'Website Management API must normalize legacy rows for UI consistency.');
assert(api.includes('legacyPagePayload'), 'Website Management API must support legacy page insert payloads.');
assert(api.includes('legacyBlockPayload'), 'Website Management API must support legacy block insert payloads.');
assert(api.includes('website_pages.slug not present in current DB schema'), 'Website Management API must expose internal fallback marker for missing page slug.');
assert(api.includes('website_content_blocks.page_id not present in current DB schema'), 'Website Management API must expose internal fallback marker for missing block page_id.');
assert(api.includes('errors.length ? 207 : 200'), 'Website Management GET must return 207 only for real unrecovered source errors.');

assert(migration.includes('alter table public.website_pages') && migration.includes('add column if not exists slug text'), 'Migration must add website_pages.slug non-destructively.');
assert(migration.includes('alter table public.website_content_blocks') && migration.includes('add column if not exists page_id uuid'), 'Migration must add website_content_blocks.page_id non-destructively.');
assert(migration.includes('website_pages_locale_slug_uidx'), 'Migration must add locale+slug index.');
assert(migration.includes('website_content_blocks_page_id_fkey'), 'Migration must add nullable page_id FK safely.');
assert(!/drop\s+table|drop\s+column|truncate\s+table/i.test(migration), 'Migration must not drop or truncate CMS data.');
assert(migration.includes('Do not reset the production database'), 'Migration must document no reset/no repair rule.');

assert(liveCore.includes('payload.errors') && liveCore.includes('Some sources returned warnings'), 'Website Management UI must keep warning area for unrecovered source errors.');

if (failures.length) {
  console.error('Website CMS schema alignment verification failed:');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log('Website CMS schema alignment verification passed.');
