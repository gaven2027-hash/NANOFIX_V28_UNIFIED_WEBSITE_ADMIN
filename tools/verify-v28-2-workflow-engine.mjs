import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const failures = [];
const warnings = [];
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const exists = (file) => fs.existsSync(path.join(root, file));
const assert = (condition, message) => { if (!condition) failures.push(message); };
const warn = (condition, message) => { if (!condition) warnings.push(message); };

const requiredFiles = [
  'docs/NANOFIX_V28_2_MASTER_MEMORY_20260529.md',
  'components/AutomationNotificationWorkspace.tsx',
  'app/dashboard/page.tsx',
  'app/api/admin/automation-notifications/route.ts',
  'app/api/admin/internal-inbox/route.ts',
  'app/api/admin/unified-tasks/route.ts',
  'app/api/global-search/route.ts',
  'app/api/ready/route.ts',
  'data/adminNavigation.ts',
  'supabase/migrations/202605290001_v28_2_automation_inbox_task_engine.sql',
  'supabase/seed/20260529_v28_2_workflow_engine_seed.sql'
];

for (const file of requiredFiles) assert(exists(file), `Missing V28.2 workflow file: ${file}`);

if (requiredFiles.every(exists)) {
  const memory = read('docs/NANOFIX_V28_2_MASTER_MEMORY_20260529.md');
  for (const needle of [
    'Automation & Notification Engine',
    'Internal Inbox',
    'Unified Task Engine',
    'No localStorage workflow state and no fake-success fallback'
  ]) assert(memory.includes(needle), `V28.2 master memory missing rule: ${needle}`);

  const nav = read('data/adminNavigation.ts');
  for (const anchor of [
    '/dashboard#automation-notification-engine',
    '/dashboard#internal-inbox',
    '/dashboard#unified-task-engine',
    '/system-settings#automation-rule-settings',
    '/system-settings#notification-channel-settings',
    '/system-settings#unified-task-sla-settings'
  ]) assert(nav.includes(anchor), `Admin navigation missing V28.2 anchor: ${anchor}`);
  assert(!nav.includes("href: '/automation"), 'Do not add a new first-level Automation menu; keep 0–8 structure');

  const dashboard = read('app/dashboard/page.tsx');
  assert(dashboard.includes('AutomationNotificationWorkspace'), 'Dashboard must render AutomationNotificationWorkspace');

  const workspace = read('components/AutomationNotificationWorkspace.tsx');
  for (const marker of ['automation-notification-engine', 'internal-inbox', 'unified-task-engine']) {
    assert(workspace.includes(marker), `AutomationNotificationWorkspace missing anchor marker: ${marker}`);
  }
  for (const apiPath of ['/api/admin/automation-notifications', '/api/admin/internal-inbox', '/api/admin/unified-tasks']) {
    assert(workspace.includes(apiPath), `AutomationNotificationWorkspace must bind live API: ${apiPath}`);
  }
  for (const liveMarker of ['loadLiveData', 'degraded', 'errors', 'Refresh live data', 'Demo rows below remain clearly separated']) {
    assert(workspace.includes(liveMarker), `AutomationNotificationWorkspace missing live/degraded marker: ${liveMarker}`);
  }
  for (const writeMarker of [
    'writeApi',
    "method: 'POST'",
    "method: 'PATCH'",
    'runWriteAction',
    'acknowledgeInboxMessage',
    'createTaskFromInbox',
    'advanceTask',
    'queueNotification',
    'actionState',
    'Live data refreshed',
    'API 返回 OK'
  ]) assert(workspace.includes(writeMarker), `AutomationNotificationWorkspace missing write-action marker: ${writeMarker}`);
  for (const bodyMarker of [
    "action: 'acknowledge'",
    "writeApi('POST', '/api/admin/internal-inbox'",
    "writeApi('POST', '/api/admin/unified-tasks'",
    "writeApi('PATCH', '/api/admin/unified-tasks'",
    "writeApi('POST', '/api/admin/automation-notifications'"
  ]) assert(workspace.includes(bodyMarker), `AutomationNotificationWorkspace missing API write call: ${bodyMarker}`);
  assert(workspace.includes("credentials: 'same-origin'"), 'Live API fetch/write must use same-origin credentials');
  assert(workspace.includes("cache: 'no-store'"), 'Live API fetch/write must disable cache for workflow status');
  assert(workspace.includes("'content-type': 'application/json'"), 'Write API calls must send JSON content-type');
  assert(workspace.includes('await loadLiveData()'), 'Successful write actions must refresh live data');
  assert(workspace.includes('Demo rows cannot be acknowledged') && workspace.includes('Demo rows cannot be updated'), 'Demo fallback rows must not be treated as writable live records');
  assert(!/localStorage|sessionStorage/.test(workspace), 'V28.2 workflow UI must not store production workflow state in browser storage');
  assert(!/return\s+\{\s*ok:\s*true\s*\}/.test(workspace), 'V28.2 workflow UI must not fake live API success');

  const automationApi = read('app/api/admin/automation-notifications/route.ts');
  for (const needle of ['requireActorApi', 'automation_rules', 'notification_outbox', 'writeAuditLog']) {
    assert(automationApi.includes(needle), `Automation API missing ${needle}`);
  }
  assert(!/ok:\s*true[^\n]+catch/i.test(automationApi), 'Automation API appears to contain fake success fallback');

  const inboxApi = read('app/api/admin/internal-inbox/route.ts');
  for (const needle of ['requireActorApi', 'internal_inbox_messages', 'writeAuditLog', 'acknowledge', 'archive']) {
    assert(inboxApi.includes(needle), `Internal Inbox API missing ${needle}`);
  }

  const tasksApi = read('app/api/admin/unified-tasks/route.ts');
  for (const needle of ['requireActorApi', 'unified_tasks', 'task_events', 'writeAuditLog', 'PATCH']) {
    assert(tasksApi.includes(needle), `Unified Tasks API missing ${needle}`);
  }

  const search = read('app/api/global-search/route.ts');
  for (const source of ['automation_rules', 'notification_outbox', 'internal_inbox_messages', 'unified_tasks']) {
    assert(search.includes(source), `Global Search missing V28.2 source: ${source}`);
  }

  const ready = read('app/api/ready/route.ts');
  for (const table of ['automation_rules', 'notification_outbox', 'internal_inbox_messages', 'unified_tasks', 'task_events']) {
    assert(ready.includes(table), `/api/ready missing V28.2 table: ${table}`);
  }
  assert(ready.includes('28.2.0-automation-inbox-task-engine'), '/api/ready missing V28.2 version marker');

  const sql = read('supabase/migrations/202605290001_v28_2_automation_inbox_task_engine.sql');
  for (const table of ['public.automation_rules', 'public.notification_outbox', 'public.internal_inbox_messages', 'public.unified_tasks', 'public.task_events']) {
    assert(sql.includes(table), `Migration missing table: ${table}`);
  }
  for (const phrase of ['enable row level security', 'create_unified_task_with_inbox', 'revoke all on function public.create_unified_task_with_inbox']) {
    assert(sql.toLowerCase().includes(phrase.toLowerCase()), `Migration missing security/RPC phrase: ${phrase}`);
  }

  const seed = read('supabase/seed/20260529_v28_2_workflow_engine_seed.sql');
  for (const seedNeedle of [
    'service_request.created.p0_triage',
    'quotation.approval.overdue',
    'review.privacy.redaction_required',
    'payment.mismatch.finance_review',
    '28021000-0000-0000-0000-000000000001',
    '28022000-0000-0000-0000-000000000001',
    '28023000-0000-0000-0000-000000000001',
    '28024000-0000-0000-0000-000000000001'
  ]) assert(seed.includes(seedNeedle), `V28.2 seed missing demo marker: ${seedNeedle}`);
  for (const table of ['public.automation_rules', 'public.notification_outbox', 'public.internal_inbox_messages', 'public.unified_tasks', 'public.task_events']) {
    assert(seed.includes(table), `V28.2 seed missing table insert: ${table}`);
  }
  assert(!/example\.com|\+65\s?8\d{3}\s?\d{4}/i.test(seed), 'V28.2 seed should not introduce real-looking customer contact data');

  const smoke = exists('tools/e2e-smoke.mjs') ? read('tools/e2e-smoke.mjs') : '';
  warn(smoke.includes('/api/admin/automation-notifications') && smoke.includes('/api/ready'), 'E2E smoke should include V28.2 API and ready checks');
}

const report = {
  ok: failures.length === 0,
  generated_at: new Date().toISOString(),
  verifier: 'verify-v28-2-workflow-engine',
  failures,
  warnings
};

console.log(JSON.stringify(report, null, 2));
if (failures.length) process.exit(1);
