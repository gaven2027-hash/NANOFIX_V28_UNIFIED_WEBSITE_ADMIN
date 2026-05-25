import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const exists = (file) => fs.existsSync(path.join(root, file));

const migrationFile = 'supabase/migrations/20260526007000_v28_1_2_module_rls_policies.sql';
const requiredPolicies = [
  'admin_profiles_admin_select',
  'ai_drafts_content_admin_all',
  'ai_logs_admin_select',
  'ai_management_records_admin_all',
  'ai_operation_versions_admin_all',
  'app_modules_admin_all',
  'auth_otp_logs_admin_select',
  'backup_jobs_admin_all',
  'backup_schedules_admin_all',
  'content_drafts_content_admin_all',
  'cta_config_content_admin_all',
  'customer_auth_actions_admin_all',
  'customer_binding_suggestions_admin_all',
  'customer_center_records_admin_all',
  'customer_center_versions_admin_all',
  'customer_portal_versions_admin_all',
  'dead_letter_events_admin_select',
  'engineer_portal_versions_admin_all',
  'entity_events_admin_select',
  'form_rate_limits_admin_select',
  'global_search_documents_admin_all',
  'inbound_events_admin_select',
  'integration_outbox_admin_select',
  'invoice_items_finance_admin_all',
  'lead_attachments_admin_all',
  'module_health_events_admin_select',
  'otp_verifications_admin_select',
  'password_reset_requests_admin_select',
  'payment_events_finance_admin_select',
  'pdpa_requests_admin_all',
  'search_logs_admin_select',
  'seo_routes_content_admin_all',
  'social_management_records_content_admin_all',
  'social_publish_versions_content_admin_all',
  'status_transition_logs_admin_select',
  'system_setting_records_admin_all',
  'system_setting_versions_admin_all',
  'webhook_events_admin_select',
  'webhook_retry_jobs_admin_all',
  'website_publish_versions_content_admin_all'
];

const selectOnlyPolicies = [
  'admin_profiles_admin_select',
  'ai_logs_admin_select',
  'auth_otp_logs_admin_select',
  'dead_letter_events_admin_select',
  'entity_events_admin_select',
  'form_rate_limits_admin_select',
  'inbound_events_admin_select',
  'integration_outbox_admin_select',
  'module_health_events_admin_select',
  'otp_verifications_admin_select',
  'password_reset_requests_admin_select',
  'payment_events_finance_admin_select',
  'search_logs_admin_select',
  'status_transition_logs_admin_select',
  'webhook_events_admin_select'
];

const failures = [];
if (!exists(migrationFile)) failures.push(`Missing required migration: ${migrationFile}`);

function policyIsSelectOnly(sql, policyName) {
  const escaped = policyName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp(`create\\s+policy\\s+${escaped}\\s+on\\s+public\\.[a-z0-9_]+\\s+for\\s+select\\s+using`, 'i');
  return pattern.test(sql);
}

if (!failures.length) {
  const migration = read(migrationFile);
  for (const policy of requiredPolicies) {
    if (!migration.includes(`create policy ${policy}`)) failures.push(`Missing module RLS policy: ${policy}`);
  }
  for (const policy of selectOnlyPolicies) {
    if (!policyIsSelectOnly(migration, policy)) {
      failures.push(`Sensitive log/event policy must be select-only: ${policy}`);
    }
  }
  if (!migration.includes('auth.uid()')) failures.push('Policies must bind access to Supabase auth.uid().');
  if (!migration.includes('p.is_active = true')) failures.push('Policies must require active profiles.');
  if (!migration.includes("'super_admin'")) failures.push('Policies must include super_admin role.');
}

if (failures.length) {
  console.error('NANOFIX module RLS verification failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('NANOFIX module RLS verification passed.');
console.log('Checked AI, backup, customer center, webhook, search, OTP, SEO and system settings RLS policies.');
