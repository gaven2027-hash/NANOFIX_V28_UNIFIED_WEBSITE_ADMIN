import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const failures = [];
const warnings = [];
const exists = (file) => fs.existsSync(path.join(root, file));
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const assert = (ok, message) => { if (!ok) failures.push(message); };
const warn = (ok, message) => { if (!ok) warnings.push(message); };

const migrationDirs = ['supabase/migrations', 'migrations', 'db/migrations'];
const migrationFiles = migrationDirs.flatMap((dir) => {
  const abs = path.join(root, dir);
  if (!fs.existsSync(abs)) return [];
  return fs.readdirSync(abs).filter((name) => name.endsWith('.sql')).map((name) => `${dir}/${name}`);
});

assert(migrationFiles.length > 0, 'No SQL migration files found.');

const sql = migrationFiles.map((file) => `\n-- FILE: ${file}\n${read(file)}`).join('\n');

const hardTables = [
  'quotation_acceptances',
  'payment_intents'
];

const requiredBusinessTables = [
  'customers',
  'profiles',
  'unified_intake',
  'leads',
  'service_requests',
  'jobs',
  'quotations',
  'quotation_versions',
  'invoices',
  'payments',
  'warranties',
  'warranty_pdf_documents',
  'audit_logs',
  'status_transition_logs'
];

function includesTable(table) {
  return new RegExp(`\\bpublic\\.${table}\\b|\\b${table}\\b`, 'i').test(sql);
}
function hasCreateTable(table) {
  return new RegExp(`create\\s+table\\s+(if\\s+not\\s+exists\\s+)?public\\.${table}\\b`, 'i').test(sql);
}
function hasRls(table) {
  return new RegExp(`alter\\s+table\\s+public\\.${table}\\s+enable\\s+row\\s+level\\s+security`, 'i').test(sql);
}
function hasPolicy(table) {
  return new RegExp(`create\\s+policy[\\s\\S]{0,180}on\\s+public\\.${table}\\b`, 'i').test(sql);
}
function hasIndex(table) {
  return new RegExp(`create\\s+index[\\s\\S]{0,160}on\\s+public\\.${table}\\b`, 'i').test(sql);
}

for (const table of hardTables) {
  assert(hasCreateTable(table), `Missing create table migration for ${table}.`);
  assert(hasRls(table), `Missing RLS enablement for ${table}.`);
  assert(hasPolicy(table), `Missing policy for ${table}.`);
  assert(hasIndex(table), `Missing index for ${table}.`);
}

for (const table of requiredBusinessTables) {
  warn(includesTable(table), `No migration evidence found for business table ${table}.`);
  warn(hasRls(table), `No RLS enablement evidence found for ${table}.`);
  warn(hasPolicy(table), `No policy evidence found for ${table}.`);
}

const positiveMarkers = [
  'public.quotation_acceptances',
  'public.payment_intents',
  'public.quotations',
  'public.jobs',
  'public.customers',
  'public.profiles',
  'public.invoices',
  'enable row level security',
  'customers can read own quotation acceptances',
  'customers can read own payment intents',
  'service role can write quotation acceptances',
  'service role can write payment intents',
  'public.owns_customer(customer_id)',
  'public.current_profile_role()'
];
for (const marker of positiveMarkers) assert(sql.includes(marker), `Supabase production audit missing marker: ${marker}`);

const report = {
  ok: failures.length === 0,
  verifier: 'verify-supabase-production-audit',
  migrationFilesChecked: migrationFiles,
  blocking_failures: failures,
  readiness_warnings: warnings,
  productionMeaning: 'Failures block known quote/payment customer security regressions. Warnings show broader business tables that still need migration/RLS proof before full production-live declaration.'
};

console.log(JSON.stringify(report, null, 2));
if (failures.length) process.exit(1);
