import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const exists = (file) => fs.existsSync(path.join(root, file));

const migrationFile = 'supabase/migrations/20260526006000_v28_1_2_core_business_rls_policies.sql';
const policies = [
  'leads_admin_all',
  'unified_intake_admin_all',
  'bookings_admin_all',
  'inspections_admin_all',
  'quotations_admin_all',
  'quotation_versions_admin_all',
  'payments_admin_all',
  'receipts_admin_all',
  'warranties_admin_all',
  'audit_logs_admin_select',
  'website_pages_admin_all',
  'website_content_blocks_admin_all',
  'social_messages_admin_all'
];

const requiredTables = [
  'public.leads',
  'public.unified_intake',
  'public.bookings',
  'public.inspections',
  'public.quotations',
  'public.quotation_versions',
  'public.payments',
  'public.receipts',
  'public.warranties',
  'public.audit_logs',
  'public.website_pages',
  'public.website_content_blocks',
  'public.social_messages'
];

const failures = [];
if (!exists(migrationFile)) failures.push(`Missing required migration: ${migrationFile}`);

if (!failures.length) {
  const migration = read(migrationFile);
  for (const table of requiredTables) {
    if (!migration.includes(`on ${table}`)) failures.push(`Missing policy target table: ${table}`);
  }
  for (const policy of policies) {
    if (!migration.includes(`create policy ${policy}`)) failures.push(`Missing policy: ${policy}`);
  }
  if (!migration.includes('audit_logs_admin_select') || migration.includes('audit_logs_admin_all')) {
    failures.push('audit_logs must use admin select-only policy, not all write policy.');
  }
  if (!migration.includes("p.is_active = true")) failures.push('Policies must require active profiles.');
  if (!migration.includes('auth.uid()')) failures.push('Policies must bind access to Supabase auth.uid().');
}

if (failures.length) {
  console.error('NANOFIX core business RLS verification failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('NANOFIX core business RLS verification passed.');
console.log('Checked admin RLS policies for core business, CMS, finance, warranty and social message tables.');
