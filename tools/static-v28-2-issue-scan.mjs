import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const failures = [];
const warnings = [];

const scanRoots = ['app', 'components', 'lib', 'tools'];
const textExtensions = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.sql', '.json', '.md']);
const requiredAdminApiMarkers = ['requireActorApi', 'requireAdminApi', 'requireAdmin', 'requireRoleApi'];
const workflowApiFiles = [
  'app/api/admin/automation-notifications/route.ts',
  'app/api/admin/internal-inbox/route.ts',
  'app/api/admin/unified-tasks/route.ts',
  'app/api/admin/workflow-audit/route.ts',
  'app/api/admin/workflow-settings/route.ts'
];

function walk(dir) {
  const absolute = path.join(root, dir);
  if (!fs.existsSync(absolute)) return [];
  return fs.readdirSync(absolute, { withFileTypes: true }).flatMap((entry) => {
    const rel = path.join(dir, entry.name).replaceAll('\\', '/');
    if (entry.isDirectory()) {
      if (['node_modules', '.next', '.git', 'out', 'dist', 'coverage'].includes(entry.name)) return [];
      return walk(rel);
    }
    return [rel];
  });
}

function read(file) {
  return fs.readFileSync(path.join(root, file), 'utf8');
}

function exists(file) {
  return fs.existsSync(path.join(root, file));
}

function addFailure(file, message) {
  failures.push(`${file}: ${message}`);
}

function addWarning(file, message) {
  warnings.push(`${file}: ${message}`);
}

const files = scanRoots.flatMap(walk).filter((file) => textExtensions.has(path.extname(file)));

for (const file of files) {
  const text = read(file);
  if (/\.select\s*\(\s*['"]\*['"]\s*\)/.test(text)) addFailure(file, 'Supabase select("*") is not allowed; use explicit field whitelists.');
  if (/\blocalStorage\b|\bsessionStorage\b/.test(text)) addFailure(file, 'Browser storage must not be used for production workflow/admin state.');
  if (/catch\s*\([^)]*\)\s*\{[\s\S]{0,220}(NextResponse\.json\s*\(\s*\{\s*ok\s*:\s*true|return\s+\{\s*ok\s*:\s*true)/.test(text)) addFailure(file, 'Potential fake success in catch block.');
  if (/fallback[^\n]{0,120}ok\s*:\s*true/i.test(text)) addWarning(file, 'Review fallback success path; ensure it is not production fake success.');
}

const adminApiFiles = walk('app/api/admin').filter((file) => file.endsWith('/route.ts') || file.endsWith('/route.js'));
for (const file of adminApiFiles) {
  const text = read(file);
  if (!requiredAdminApiMarkers.some((marker) => text.includes(marker))) addFailure(file, 'Admin API route is missing requireActorApi/requireAdminApi/requireAdmin/requireRoleApi marker.');
  if (/x-admin-role|x-nanofix-role/.test(text) && !text.includes('headers.delete')) addFailure(file, 'Admin API route references untrusted role headers directly.');
}

for (const file of workflowApiFiles) {
  if (!exists(file)) {
    addFailure(file, 'Required V28.2 workflow API file is missing.');
    continue;
  }
  const text = read(file);
  if (!text.includes('writeAuditLog')) addFailure(file, 'V28.2 workflow API must write Audit Logs.');
  if (!text.includes('requireActorApi')) addFailure(file, 'V28.2 workflow API must use requireActorApi.');
  if (/\.select\s*\(\s*['"]\*['"]\s*\)/.test(text)) addFailure(file, 'V28.2 workflow API must not use select("*").');
}

const systemSettings = exists('app/system-settings/page.tsx') ? read('app/system-settings/page.tsx') : '';
if (!systemSettings.includes('WorkflowSettingsWorkspace')) addFailure('app/system-settings/page.tsx', 'System Settings must render WorkflowSettingsWorkspace.');
if (systemSettings.includes('AutomationNotificationWorkspace')) addFailure('app/system-settings/page.tsx', 'System Settings must not render Dashboard operation workspace.');

const readyRoute = exists('app/api/ready/route.ts') ? read('app/api/ready/route.ts') : '';
for (const table of ['automation_rules', 'notification_outbox', 'internal_inbox_messages', 'unified_tasks', 'task_events', 'workflow_settings']) {
  if (!readyRoute.includes(table)) addFailure('app/api/ready/route.ts', `/api/ready missing ${table}.`);
}

const globalSearch = exists('app/api/global-search/route.ts') ? read('app/api/global-search/route.ts') : '';
for (const marker of ['automation_rules', 'notification_outbox', 'internal_inbox_messages', 'unified_tasks', 'workflow_settings', 'workflowSettingHref', 'mergeResults']) {
  if (!globalSearch.includes(marker)) addFailure('app/api/global-search/route.ts', `Global Search missing V28.2 marker ${marker}.`);
}

const dashboardWorkspace = exists('components/AutomationNotificationWorkspace.tsx') ? read('components/AutomationNotificationWorkspace.tsx') : '';
for (const marker of ['writeApi', 'runWriteAction', 'Demo rows cannot be acknowledged', 'Demo rows cannot be updated', 'WorkflowAuditTrail']) {
  if (!dashboardWorkspace.includes(marker)) addFailure('components/AutomationNotificationWorkspace.tsx', `Workflow dashboard missing marker ${marker}.`);
}

const settingsWorkspace = exists('components/WorkflowSettingsWorkspace.tsx') ? read('components/WorkflowSettingsWorkspace.tsx') : '';
for (const marker of ['/api/admin/workflow-settings', 'PATCH', 'automation_rule_setting', 'notification_channel', 'unified_task_sla']) {
  if (!settingsWorkspace.includes(marker)) addFailure('components/WorkflowSettingsWorkspace.tsx', `Workflow settings workspace missing marker ${marker}.`);
}

const auditTrail = exists('components/WorkflowAuditTrail.tsx') ? read('components/WorkflowAuditTrail.tsx') : '';
for (const marker of ['/api/admin/workflow-audit?limit=12', 'task_events', 'audit_logs', 'notification_delivery']) {
  if (!auditTrail.includes(marker)) addFailure('components/WorkflowAuditTrail.tsx', `Workflow audit trail missing marker ${marker}.`);
}

const masterMemory = exists('docs/NANOFIX_V28_2_MASTER_MEMORY_20260529.md') ? read('docs/NANOFIX_V28_2_MASTER_MEMORY_20260529.md') : '';
if (!masterMemory.includes('Use this file as the single project memory reference')) addFailure('docs/NANOFIX_V28_2_MASTER_MEMORY_20260529.md', 'Master memory must state single project memory reference.');
for (const staleMemory of ['docs/NANOFIX_V28_1_7_CONTINUATION_MEMORY_20260529.md']) {
  if (exists(staleMemory)) addFailure(staleMemory, 'Conflicting stale memory file must not exist after V28.2 master memory lock.');
}

const report = {
  ok: failures.length === 0,
  generated_at: new Date().toISOString(),
  scanner: 'static-v28-2-issue-scan',
  scanned_files: files.length,
  admin_api_routes: adminApiFiles.length,
  failures,
  warnings
};

console.log(JSON.stringify(report, null, 2));
if (failures.length) process.exit(1);
