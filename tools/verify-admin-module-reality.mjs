import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const failures = [];
const warnings = [];
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const readIfExists = (file) => (fs.existsSync(path.join(root, file)) ? fs.readFileSync(path.join(root, file), 'utf8') : '');
const exists = (file) => fs.existsSync(path.join(root, file));
const assert = (condition, message) => { if (!condition) failures.push(message); };
const warn = (condition, message) => { if (!condition) warnings.push(message); };

const requiredFiles = [
  'data/adminNavigation.ts',
  'data/adminModuleReality.ts',
  'components/AdminSubmoduleWorkspace.tsx',
  'components/SystemSettingsDiagnosticsWorkspace.tsx',
  'components/MenuAnchorSections.tsx',
  'app/api/admin/module-operations/route.ts',
  'docs/NANOFIX_V28_2_ADMIN_MENU_REALITY_AUDIT_20260529.md'
];
for (const file of requiredFiles) assert(exists(file), `Missing admin reality file: ${file}`);

function sourceHasHref(source, href) {
  if (source.includes(`href: '${href}'`) || source.includes(`href: \`${href}\``) || source.includes(`href:${JSON.stringify(href)}`)) return true;
  const [route, anchor] = href.split('#');
  if (!route || !anchor) return false;
  return source.includes(`href: \`${route}#\${anchor}\``) && (source.includes(`'${anchor}'`) || source.includes(`"${anchor}"`));
}

function parseLegacyAnchors(argsText) {
  const legacyMatch = argsText.match(/\[([^\]]*)\]/);
  if (!legacyMatch) return [];
  return [...legacyMatch[1].matchAll(/['"]([^'"]+)['"]/g)].map((match) => match[1]);
}

function extractNavigationEntries(navSource) {
  const entries = [];
  const childCallRegex = /child\(\s*['"]([^'"]+)['"]([\s\S]*?)\)\s*,?/g;
  for (const match of navSource.matchAll(childCallRegex)) {
    const href = match[1];
    const tail = match[2] || '';
    const route = href.split('#')[0];
    const legacyAnchors = parseLegacyAnchors(tail).map((anchor) => `${route}#${anchor}`);
    entries.push({ href, legacyHrefs: legacyAnchors });
  }
  return entries;
}

function registryCoversNavigationEntry(registry, entry) {
  return sourceHasHref(registry, entry.href) || entry.legacyHrefs.some((legacyHref) => sourceHasHref(registry, legacyHref));
}

if (requiredFiles.every(exists)) {
  const nav = `${read('data/adminNavigation.ts')}\n${readIfExists('data/v28.7-admin-navigation.ts')}`;
  const registry = read('data/adminModuleReality.ts');
  const workspace = read('components/AdminSubmoduleWorkspace.tsx');
  const systemDiagnostics = read('components/SystemSettingsDiagnosticsWorkspace.tsx');
  const menuAnchorSections = read('components/MenuAnchorSections.tsx');
  const operationsApi = read('app/api/admin/module-operations/route.ts');
  const auditDoc = read('docs/NANOFIX_V28_2_ADMIN_MENU_REALITY_AUDIT_20260529.md');

  const navEntries = extractNavigationEntries(nav);
  const uniqueEntries = [...new Map(navEntries.map((entry) => [entry.href, entry])).values()];
  assert(uniqueEntries.length >= 66, `Expected V28.7 broad 0-8 menu coverage; found only ${uniqueEntries.length} child hrefs.`);

  for (const entry of uniqueEntries) {
    assert(registryCoversNavigationEntry(registry, entry), `adminModuleReality missing menu href or legacy contract: ${entry.href}`);
  }

  for (const marker of [
    "export type ModuleRealityStatus = 'live' | 'partial' | 'contract' | 'missing'",
    'AdminModuleReality',
    'getAdminModuleReality',
    'getAdminModuleRealitySummary',
    '/dashboard#automation-notification-engine',
    '/dashboard#internal-inbox',
    '/dashboard#unified-task-engine',
    '/system-settings#automation-rule-settings',
    '/system-settings#notification-channel-settings',
    '/system-settings#unified-task-sla-settings'
  ]) assert(registry.includes(marker), `adminModuleReality missing marker: ${marker}`);

  for (const status of ["status: 'live'", "status: 'partial'", "status: 'contract'"]) {
    assert(registry.includes(status), `adminModuleReality missing status bucket: ${status}`);
  }
  warn(registry.includes("status: 'missing'"), 'No current module is explicitly marked missing; acceptable if all menu anchors have at least a contract entry.');

  for (const marker of [
    "import { getAdminModuleReality",
    '@/data/adminModuleReality',
    '/api/admin/module-operations',
    'Refresh Live Data / 刷新实时数据',
    'Write Audit Check / 写入审计',
    'Create Follow-up Task / 新建跟进任务',
    'Open Linked API / 打开关联接口',
    'Open Main Workspace / 打开主模块',
    'Module Diagnostics / 模块诊断'
  ]) assert(workspace.includes(marker), `AdminSubmoduleWorkspace missing operations marker: ${marker}`);

  assert(systemDiagnostics.includes('AdminSubmoduleWorkspace route="/system-settings"'), 'SystemSettingsDiagnosticsWorkspace must be the explicit diagnostics entry.');
  assert(systemDiagnostics.includes('System Settings Only / 仅系统设置可见'), 'SystemSettingsDiagnosticsWorkspace must state diagnostics are system-settings only.');
  assert(menuAnchorSections.includes('data-admin-anchor-fallback'), 'MenuAnchorSections must provide safe hidden anchors for daily routes.');
  assert(!menuAnchorSections.includes('AdminSubmoduleWorkspace'), 'MenuAnchorSections must not render diagnostics in daily workspaces.');

  assert(!workspace.includes('function profileFor'), 'AdminSubmoduleWorkspace should not use old keyword-based profileFor guessing.');
  assert(!workspace.includes('slugText'), 'AdminSubmoduleWorkspace should not use old keyword slugText guessing.');
  assert(!workspace.includes('Source of truth / 真实性来源'), 'AdminSubmoduleWorkspace must not show static reality-source説明 text in the operations UI.');
  assert(!workspace.includes('Reality log / 真实性页面日志'), 'AdminSubmoduleWorkspace must not show static reality-log説明 text in the operations UI.');

  for (const marker of [
    'requireActorApi',
    'writeAuditLog',
    'unified_tasks',
    'entity_events',
    'audit_logs',
    'tableProbe',
    'api_probes',
    'record_audit_check',
    'create_followup_task'
  ]) assert(operationsApi.includes(marker), `module-operations API missing live operation marker: ${marker}`);

  for (const marker of [
    'Admin Menu Reality Audit Matrix',
    'Live | Real API/database binding exists',
    'Partial | Some real components/APIs exist',
    'Contract | UI exists as an OA/ERP contract preview',
    'Create a machine-readable module reality registry',
    'data/adminModuleReality.ts'
  ]) assert(auditDoc.includes(marker), `Admin menu reality audit doc missing marker: ${marker}`);

  for (const href of ['/service-operations#leads', '/customer-center#customer-list', '/website-management#homepage-content']) {
    assert(sourceHasHref(registry, href), `High-priority anchor missing from adminModuleReality: ${href}`);
  }
}

const report = {
  ok: failures.length === 0,
  generated_at: new Date().toISOString(),
  verifier: 'verify-admin-module-reality',
  standard: 'V28.4.2 admin reality with V28.7 simplified visible menu and legacy contract coverage',
  failures,
  warnings
};

console.log(JSON.stringify(report, null, 2));
if (failures.length) process.exit(1);
