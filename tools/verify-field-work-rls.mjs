import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const exists = (file) => fs.existsSync(path.join(root, file));

const migrationFile = 'supabase/migrations/20260526004000_v28_1_2_field_work_rls_policies.sql';
const protectedTables = [
  'nanofix_deployment_probe',
  'job_assignments',
  'job_checklists',
  'job_photos',
  'customer_signatures'
];
const requiredPolicies = [
  'nanofix_deployment_probe_admin_all',
  'job_assignments_admin_all',
  'job_assignments_engineer_own',
  'job_assignments_engineer_status_update',
  'job_checklists_admin_all',
  'job_checklists_engineer_assigned',
  'job_photos_admin_all',
  'job_photos_engineer_assigned',
  'customer_signatures_admin_all',
  'customer_signatures_engineer_assigned'
];

const failures = [];
if (!exists(migrationFile)) failures.push(`Missing required migration: ${migrationFile}`);

if (!failures.length) {
  const migration = read(migrationFile);
  for (const table of protectedTables) {
    if (!migration.includes(`alter table public.${table} enable row level security`)) {
      failures.push(`Missing RLS enable statement for ${table}`);
    }
  }
  for (const policy of requiredPolicies) {
    if (!migration.includes(`create policy ${policy}`)) failures.push(`Missing RLS policy: ${policy}`);
  }
  if (!migration.includes("p.role in ('super_admin','operations_admin','support')")) {
    failures.push('Admin policies must be limited to super_admin, operations_admin and support.');
  }
  if (!migration.includes("p.role = 'engineer'")) {
    failures.push('Engineer ownership policies are missing.');
  }
  if (!migration.includes('job_assignments.engineer_id') || !migration.includes('job_checklists.engineer_id') || !migration.includes('job_photos.uploaded_by')) {
    failures.push('Engineer ownership fields are not checked across field work tables.');
  }
}

if (failures.length) {
  console.error('NANOFIX field work RLS verification failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('NANOFIX field work RLS verification passed.');
console.log('Checked RLS enablement and admin/engineer policies for field work tables.');
