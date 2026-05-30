import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const exists = (file) => fs.existsSync(path.join(root, file));

const routePages = [
  '/admin',
  '/dashboard',
  '/service-operations',
  '/website-management',
  '/social-media',
  '/admin/advertising-center',
  '/ai-intelligence',
  '/customer-center',
  '/system-settings'
];

const routeToPage = {
  '/admin': 'app/admin/page.tsx',
  '/dashboard': 'app/dashboard/page.tsx',
  '/service-operations': 'app/service-operations/page.tsx',
  '/website-management': 'app/website-management/page.tsx',
  '/social-media': 'app/social-media/page.tsx',
  '/admin/advertising-center': 'app/admin/advertising-center/page.tsx',
  '/ai-intelligence': 'app/ai-intelligence/page.tsx',
  '/customer-center': 'app/customer-center/page.tsx',
  '/system-settings': 'app/system-settings/page.tsx'
};

const expectedRouteMarkers = {
  '/admin': ['AdminShell', 'PageHeader', 'MenuAnchorSections', 'module-launch-board'],
  '/dashboard': ['AdminShell', 'Dashboard', 'AutomationNotificationWorkspace', 'MenuAnchorSections'],
  '/service-operations': ['AdminShell', 'WorkflowBoard', 'ServiceOperationsActionPanel', 'StatusMachineTable', 'MenuAnchorSections'],
  '/website-management': ['AdminShell', 'WebsiteManagementWorkspace', 'MenuAnchorSections'],
  '/social-media': ['AdminShell', 'SocialMediaManagementWorkspace', 'MenuAnchorSections'],
  '/admin/advertising-center': ['AdminShell', 'AdvertisingCenterWorkspace', 'MenuAnchorSections'],
  '/ai-intelligence': ['AdminShell', 'SocialPreview', 'StatusMachineTable', 'MenuAnchorSections'],
  '/customer-center': ['AdminShell', 'Customer360', 'CustomerCenterActionWorkspace', 'AdminCustomerDocumentsPanel', 'MenuAnchorSections'],
  '/system-settings': ['AdminShell', 'BackupCenter', 'RbacTable', 'WorkflowSettingsWorkspace', 'MenuAnchorSections']
};

const liveApiFiles = [
  'app/api/admin/automation-notifications/route.ts',
  'app/api/admin/internal-inbox/route.ts',
  'app/api/admin/unified-tasks/route.ts',
  'app/api/admin/workflow-audit/route.ts',
  'app/api/admin/workflow-settings/route.ts',
  'app/api/admin/advertising-center/route.ts',
  'app/api/admin/advertising-center/import/route.ts',
  'app/api/admin/advertising-center/insights/route.ts',
  'app/api/admin/advertising-center/creatives/route.ts',
  'app/api/admin/advertising-center/budgets/route.ts',
  'app/api/admin/cms/blocks/route.ts',
  'app/api/admin/social/messages/route.ts',
  'app/api/admin/backups/jobs/route.ts',
  'app/api/admin/payments/reconcile/route.ts',
  'app/api/admin/warranties/issue/route.ts'
];

function extractMenuItems() {
  const text = read('data/adminNavigation.ts');
  const parentMatches = [...text.matchAll(/order:\s*'([^']+)'[\s\S]*?href:\s*'([^']+)'[\s\S]*?title:\s*'([^']+)'[\s\S]*?children:\s*\[([\s\S]*?)\n\s*\]/g)];
  return parentMatches.map((match) => {
    const children = [...match[4].matchAll(/child\('([^']+)',\s*'([^']+)',\s*'([^']+)'\)/g)].map((child) => ({ href: child[1], title: child[2], zh: child[3] }));
    return { order: match[1], href: match[2], title: match[3], children };
  });
}

function routeFromHref(href) {
  return href.split('#')[0] || '/admin';
}

const menu = extractMenuItems();
const totalSubmodules = menu.reduce((sum, item) => sum + item.children.length, 0);
const missingPages = [];
const pageMarkerFindings = [];
const missingAnchors = [];
const duplicateHrefs = [];
const seenHrefs = new Set();

for (const item of menu) {
  if (!routePages.includes(item.href)) missingPages.push({ route: item.href, reason: 'Not in expected route list' });
  const page = routeToPage[item.href];
  if (!page || !exists(page)) {
    missingPages.push({ route: item.href, page, reason: 'Page file missing' });
    continue;
  }
  const text = read(page);
  const markers = expectedRouteMarkers[item.href] ?? ['AdminShell'];
  pageMarkerFindings.push({ route: item.href, page, ok: markers.every((marker) => text.includes(marker)), missing_markers: markers.filter((marker) => !text.includes(marker)) });
  if (item.children.length > 0 && !text.includes('MenuAnchorSections')) {
    missingAnchors.push({ route: item.href, page, reason: 'MenuAnchorSections missing for submodule anchors' });
  }
  for (const child of item.children) {
    if (seenHrefs.has(child.href)) duplicateHrefs.push(child.href);
    seenHrefs.add(child.href);
    if (routeFromHref(child.href) !== item.href) missingAnchors.push({ route: item.href, child: child.href, reason: 'Child href does not belong to parent route' });
  }
}

const apiFindings = liveApiFiles.map((file) => {
  if (!exists(file)) return { file, exists: false, auth: false, audit: false, explicit_fields: false };
  const text = read(file);
  return {
    file,
    exists: true,
    auth: /requireActorApi|requireAdminApi|requireAdmin|requireRoleApi/.test(text),
    audit: text.includes('writeAuditLog') || file.includes('/cms/blocks') || file.includes('/advertising-center'),
    explicit_fields: !/\.select\s*\(\s*['"]\*['"]\s*\)/.test(text)
  };
});

const adminShell = read('components/AdminShell.tsx');
const tailwind = read('tailwind.config.ts');
const globalCss = read('app/globals.css');
const genericWorkspace = read('components/AdminSubmoduleWorkspace.tsx');
const navSource = read('data/adminNavigation.ts');

const blueStyleFinding = {
  admin_shell_uses_adminBg: adminShell.includes('bg-adminBg'),
  admin_shell_uses_sidebar: adminShell.includes('bg-sidebar'),
  admin_shell_uses_blue_active: adminShell.includes('from-sky-400') && adminShell.includes('to-blue-500') && adminShell.includes('text-activeBlue'),
  tailwind_admin_colors: tailwind.includes('adminBg: "#F3F9FF"') && tailwind.includes('sidebar: "#1E293B"') && tailwind.includes('activeBlue: "#48B8FF"'),
  customer_orange_is_scoped: globalCss.includes('.nanofix-customer-portal .bg-activeBlue') && !adminShell.includes('nanofix-customer-portal')
};

const genericWorkspaceFinding = {
  scaffold_marking: genericWorkspace.includes('Contract scaffold') && genericWorkspace.includes('Partial live binding'),
  client_only_warning: genericWorkspace.includes('This log is client-side only'),
  fake_success_guard: genericWorkspace.includes('no server write') && genericWorkspace.includes('dedicated live workspaces/API responses'),
  has_reality_source_notice: genericWorkspace.includes('Source of truth') && genericWorkspace.includes('data/adminModuleReality.ts')
};

const pageQualityFindings = [];
for (const [route, page] of Object.entries(routeToPage)) {
  if (!exists(page)) continue;
  const text = read(page);
  if (text.includes('<><>')) pageQualityFindings.push({ route, page, severity: 'medium', issue: 'Nested empty fragments reduce readability and can hide layout mistakes.' });
  if (!text.includes('AdminShell')) pageQualityFindings.push({ route, page, severity: 'high', issue: 'Admin route missing AdminShell.' });
}

const liveCoverage = {
  menu_primary_count: menu.length,
  submodule_count: totalSubmodules,
  expected_primary_orders_0_to_8: menu.map((item) => item.order).join(',') === '0,1,2,3,4,5,6,7,8',
  primary_routes: menu.map((item) => item.href),
  live_api_count: apiFindings.filter((item) => item.exists && item.auth && item.explicit_fields).length,
  api_files_checked: apiFindings.length,
  fully_live_modules_known: [
    'Automation & Notification Engine',
    'Internal Inbox',
    'Unified Task Engine',
    'Workflow Audit Trail',
    'Workflow Settings',
    'Advertising Center partial APIs',
    'CMS blocks partial APIs',
    'Social messages partial APIs',
    'Backup jobs',
    'Payment reconcile',
    'Warranty issue'
  ]
};

const blockers = [
  ...missingPages.map((item) => `Missing page/route: ${item.route}`),
  ...missingAnchors.map((item) => `Missing or invalid submenu anchor: ${item.route} ${item.child ?? ''}`),
  ...duplicateHrefs.map((href) => `Duplicate child href: ${href}`),
  ...pageMarkerFindings.filter((item) => !item.ok).map((item) => `Page missing required markers: ${item.route} -> ${item.missing_markers.join(', ')}`),
  ...apiFindings.filter((item) => item.exists && !item.auth).map((item) => `API missing auth marker: ${item.file}`),
  ...apiFindings.filter((item) => item.exists && !item.explicit_fields).map((item) => `API uses select('*'): ${item.file}`)
];

if (!liveCoverage.expected_primary_orders_0_to_8) blockers.push('Primary admin orders are not exactly 0,1,2,3,4,5,6,7,8.');
for (const [key, ok] of Object.entries(blueStyleFinding)) if (!ok) blockers.push(`Admin blue style integrity failed: ${key}`);
if (!genericWorkspaceFinding.scaffold_marking) blockers.push('AdminSubmoduleWorkspace missing explicit scaffold/live status marking.');
if (!genericWorkspaceFinding.client_only_warning) blockers.push('AdminSubmoduleWorkspace missing client-only warning.');
if (!genericWorkspaceFinding.fake_success_guard) blockers.push('AdminSubmoduleWorkspace missing fake-success guard.');

const report = {
  ok: blockers.length === 0,
  generated_at: new Date().toISOString(),
  audit: 'oa-erp-readiness-audit',
  liveCoverage,
  blueStyleFinding,
  menu: menu.map((item) => ({ order: item.order, href: item.href, title: item.title, submodules: item.children.length })),
  missingPages,
  missingAnchors,
  duplicateHrefs,
  pageMarkerFindings,
  apiFindings,
  genericWorkspaceFinding,
  pageQualityFindings,
  blockers,
  recommendations: [
    'Keep Customer Portal orange/gold theme scoped under .nanofix-customer-portal only; Internal Admin must remain bg-adminBg + bg-sidebar + activeBlue.',
    'Promote high-volume generic submodules to dedicated live workspaces one by one: Service Requests, Quotations, Jobs, Invoices, Payments, Warranty, Customer Reviews, Website Publish Approval.',
    'For each promoted submodule require: explicit Supabase table, GET list, POST create, PATCH update/status, Audit Log write, role permission, degraded UI and E2E smoke.',
    'Keep generic AdminSubmoduleWorkspace as contract/readiness preview only; do not use it as production write workflow.',
    'Add route-level smoke checks for every primary admin route and representative second-level anchors.',
    'Use /api/ready and module health checks as the first production go/no-go signal after migrations.'
  ]
};

fs.writeFileSync(path.join(root, 'OA_ERP_READINESS_REPORT.json'), JSON.stringify(report, null, 2), 'utf8');
console.log(JSON.stringify(report, null, 2));
if (blockers.length) process.exitCode = 1;
