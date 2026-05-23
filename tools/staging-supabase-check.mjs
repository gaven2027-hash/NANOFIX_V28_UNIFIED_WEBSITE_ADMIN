#!/usr/bin/env node
import fs from 'node:fs';

const required = [
  'SUPABASE_URL',
  'SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'SUPABASE_DB_URL',
  'NANOFIX_BACKUP_ENCRYPTION_KEY',
  'CRON_SECRET',
  'NANOFIX_SYSTEM_WORKER_TOKEN'
];

const missing = required.filter((key) => !process.env[key]);
const report = {
  ok: missing.length === 0,
  checked_at: new Date().toISOString(),
  missing,
  staging_guard: 'Use this only after loading .env.staging; do not run staging checks against production.'
};

fs.writeFileSync('STAGING_SUPABASE_CHECK_REPORT_V28.json', `${JSON.stringify(report, null, 2)}\n`);
if (!report.ok) {
  console.error(`Missing staging variables: ${missing.join(', ')}`);
  process.exit(1);
}
console.log('Staging Supabase environment variables are present.');
