import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const failures = [];
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const exists = (file) => fs.existsSync(path.join(root, file));
const assert = (ok, msg) => { if (!ok) failures.push(msg); };
const must = (content, marker, label) => assert(content.includes(marker), `${label} missing ${marker}`);

const baseFiles = ['app/globals.css', 'components/CustomerPortalShell.tsx', 'components/CustomerPortalPageFrame.tsx', 'package.json'];
const portalPages = [
  'app/customer-portal/page.tsx',
  'app/customer-portal/records/page.tsx',
  'app/customer-portal/financial/page.tsx',
  'app/customer-portal/warranties/page.tsx',
  'app/customer-portal/submit-request/page.tsx',
  'app/customer-portal/uploads/page.tsx',
  'app/customer-portal/warranty-claims/[serviceRequestId]/page.tsx'
];

for (const file of [...baseFiles, ...portalPages]) assert(exists(file), `Missing file: ${file}`);

if (!failures.length) {
  const css = read('app/globals.css');
  const shell = read('components/CustomerPortalShell.tsx');
  const frame = read('components/CustomerPortalPageFrame.tsx');
  const pkg = read('package.json');

  for (const marker of ['nanofix-customer-portal', '#120a06', '#ff5f00', '#ff3d00', '#ffb000', 'customer-portal-header', 'customer-portal-logo', 'customer-portal-shell-card']) must(css, marker, 'Customer Portal CSS theme');
  for (const marker of ['customer-portal-action-primary', 'customer-portal-action-secondary', 'button[type="submit"]', 'a[href*="submit-request"]', 'a[href*="warranty-claims"]', 'a[target="_blank"]', 'a[href*="financial"]', 'a[href*="warranties"]', 'bg-amber-50', 'bg-red-50']) must(css, marker, 'Customer Portal action hierarchy');
  for (const marker of ['nanofix-customer-portal min-h-screen', 'customer-portal-header', 'customer-portal-logo', 'customer-portal-priority-strip', 'customer-portal-shell-card', 'hover:bg-orange-500/20']) must(shell, marker, 'Customer Portal shell theme');
  for (const marker of ['CustomerPortalPageFrame', 'customer-portal-page-frame', 'customer-portal-page-hero', 'customer-portal-page-content', 'primaryLabel', 'secondaryLabel']) must(frame, marker, 'Customer Portal page frame');

  for (const page of portalPages) {
    const content = read(page);
    must(content, 'CustomerPortalShell', `${page}`);
    must(content, 'CustomerPortalPageFrame', `${page}`);
    must(content, 'eyebrow=', `${page}`);
    must(content, 'title=', `${page}`);
    must(content, 'description=', `${page}`);
  }

  must(pkg, 'verify:customer-portal-orange-gold-theme', 'package scripts');
  must(pkg, 'verify-customer-portal-orange-gold-theme.mjs', 'package scripts');
  must(pkg, 'validate:predeploy', 'package scripts');
}

console.log(JSON.stringify({ ok: failures.length === 0, verifier: 'verify-customer-portal-orange-gold-theme', failures }, null, 2));
if (failures.length) process.exit(1);
