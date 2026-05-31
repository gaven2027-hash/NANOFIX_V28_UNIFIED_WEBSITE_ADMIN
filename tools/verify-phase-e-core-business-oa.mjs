import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const failures = [];
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const exists = (file) => fs.existsSync(path.join(root, file));
const assert = (ok, msg) => { if (!ok) failures.push(msg); };
const must = (content, marker, label) => assert(content.includes(marker), `${label} missing ${marker}`);

const files = [
  'data/coreBusinessLiveRequirements.ts',
  'components/CoreBusinessLiveOperationsPanel.tsx',
  'app/admin/core-business-oa/page.tsx',
  'components/AdminShell.tsx',
  'tailwind.config.ts',
  'app/globals.css',
  'package.json'
];
for (const file of files) assert(exists(file), `Missing file: ${file}`);

if (!failures.length) {
  const registry = read('data/coreBusinessLiveRequirements.ts');
  const panel = read('components/CoreBusinessLiveOperationsPanel.tsx');
  const page = read('app/admin/core-business-oa/page.tsx');
  const shell = read('components/AdminShell.tsx');
  const tailwind = read('tailwind.config.ts');
  const css = read('app/globals.css');
  const pkg = read('package.json');

  for (const marker of [
    'core-service-requests',
    'core-jobs',
    'core-invoices',
    'core-payments',
    'core-customer-center',
    'core-website-publish-approval',
    'core-social-inbox',
    "currentStatus: 'partial'",
    'targetStatus: \'live\'',
    'requiredTables',
    'requiredApis',
    'requiredPanels',
    'requiredAuditActions'
  ]) must(registry, marker, 'Phase E registry');

  for (const marker of [
    'CoreBusinessLiveOperationsPanel',
    'Core Business Fully Operable Checklist',
    '核心业务真实可操作清单',
    'LIVE',
    'Partial',
    'Open OA Section'
  ]) must(panel, marker, 'Phase E panel');

  for (const marker of [
    'AdminShell',
    'CoreBusinessLiveOperationsPanel',
    'Core Business Fully Operable OA',
    'PageHeader'
  ]) must(page, marker, 'Phase E admin page');

  for (const marker of ['bg-adminBg', 'bg-sidebar', 'text-activeBlue', 'from-sky-400', 'to-blue-500']) must(shell, marker, 'Internal Admin blue shell');
  for (const marker of ['adminBg: "#F3F9FF"', 'sidebar: "#1E293B"', 'activeBlue: "#48B8FF"']) must(tailwind, marker, 'Tailwind blue admin palette');
  must(css, '.nanofix-customer-portal .bg-activeBlue', 'Customer Portal scoped orange theme');
  assert(!shell.includes('nanofix-customer-portal'), 'Internal Admin shell must not include customer portal theme class.');

  must(pkg, 'verify:phase-e-core-business-oa', 'package scripts');
  must(pkg, 'verify-phase-e-core-business-oa.mjs', 'package scripts');
  must(pkg, 'validate:predeploy', 'package scripts');
}

console.log(JSON.stringify({ ok: failures.length === 0, verifier: 'verify-phase-e-core-business-oa', failures }, null, 2));
if (failures.length) process.exit(1);
