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
  'data/adminNavigation.ts',
  'data/adminModuleReality.ts',
  'components/AdminSubmoduleWorkspace.tsx',
  'docs/NANOFIX_V28_2_ADMIN_MENU_REALITY_AUDIT_20260529.md'
];
for (const file of requiredFiles) assert(exists(file), `Missing admin reality file: ${file}`);

if (requiredFiles.every(exists)) {
  const nav = read('data/adminNavigation.ts');
  const registry = read('data/adminModuleReality.ts');
  const workspace = read('components/AdminSubmoduleWorkspace.tsx');
  const auditDoc = read('docs/NANOFIX_V28_2_ADMIN_MENU_REALITY_AUDIT_20260529.md');

  const hrefMatches = [...nav.matchAll(/child\('([^']+)'/g)].map((match) => match[1]);
  const uniqueHrefs = [...new Set(hrefMatches)];
  assert(uniqueHrefs.length >= 140, `Expected broad 0-8 menu coverage; found only ${uniqueHrefs.length} child hrefs.`);

  for (const href of uniqueHrefs) {
    assert(registry.includes(`href: '${href}'`) || registry.includes(`href: \`${href}\``) || registry.includes(`href: \`/${href.split('#')[0].replace(/^\//, '')}#`), `adminModuleReality missing menu href: ${href}`);
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
  warn(registry.includes("status: 'missing'"), 'No current module is explicitly marked missing; this is acceptable only if all menu anchors have at least a contract entry.');

  for (const marker of [
    "import { getAdminModuleReality",
    '@/data/adminModuleReality',
    'Source of truth / 真实性来源',
    'data/adminModuleReality.ts',
    'Registry live marker only',
    'Registry non-live marker',
    'Reality log / 真实性页面日志'
  ]) assert(workspace.includes(marker), `AdminSubmoduleWorkspace missing registry-driven marker: ${marker}`);

  assert(!workspace.includes('function profileFor'), 'AdminSubmoduleWorkspace should not use old keyword-based profileFor guessing.');
  assert(!workspace.includes('slugText'), 'AdminSubmoduleWorkspace should not use old keyword slugText guessing.');
  assert(workspace.includes('fallbackReality'), 'AdminSubmoduleWorkspace should safely treat missing registry entries as contract fallback.');

  for (const marker of [
    'Admin Menu Reality Audit Matrix',
    'Live | Real API/database binding exists',
    'Partial | Some real components/APIs exist',
    'Contract | UI exists as an OA/ERP contract preview',
    'Create a machine-readable module reality registry',
    'data/adminModuleReality.ts'
  ]) assert(auditDoc.includes(marker), `Admin menu reality audit doc missing marker: ${marker}`);

  for (const href of ['/service-operations#leads', '/customer-center#customer-list', '/website-management#homepage-content']) {
    assert(registry.includes(`href: '${href}'`), `High-priority anchor missing from adminModuleReality: ${href}`);
  }
}

const report = {
  ok: failures.length === 0,
  generated_at: new Date().toISOString(),
  verifier: 'verify-admin-module-reality',
  failures,
  warnings
};

console.log(JSON.stringify(report, null, 2));
if (failures.length) process.exit(1);
