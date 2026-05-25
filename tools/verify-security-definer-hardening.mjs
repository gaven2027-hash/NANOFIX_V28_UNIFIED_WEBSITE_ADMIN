import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const exists = (file) => fs.existsSync(path.join(root, file));

const migrationFile = 'supabase/migrations/20260526005000_v28_1_2_security_definer_access_hardening.sql';
const functions = [
  'public.current_profile_id()',
  'public.current_profile_role()',
  'public.is_admin()',
  'public.handle_new_auth_user()',
  'public.log_status_transition(text,text,uuid,text,text,text,uuid,text,inet)',
  'public.record_module_health_snapshot(text)'
];

const failures = [];
if (!exists(migrationFile)) failures.push(`Missing required migration: ${migrationFile}`);

if (!failures.length) {
  const migration = read(migrationFile);
  for (const fn of functions) {
    if (!migration.includes(`revoke execute on function ${fn} from public, anon, authenticated`)) {
      failures.push(`Missing revoke execute for ${fn}`);
    }
    if (!migration.includes(`grant execute on function ${fn} to service_role`)) {
      failures.push(`Missing service_role grant for ${fn}`);
    }
  }
  if (!migration.includes('drop view if exists public.latest_module_health')) failures.push('latest_module_health view must be recreated.');
  if (!migration.includes('with (security_invoker = true)')) failures.push('latest_module_health must be recreated with security_invoker=true.');
}

if (failures.length) {
  console.error('NANOFIX security definer hardening verification failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('NANOFIX security definer hardening verification passed.');
console.log('Checked SECURITY DEFINER function execute revokes and security_invoker view migration.');
