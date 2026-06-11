import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const navigationPath = path.join(root, 'data', 'v28.7-admin-navigation.ts');
const reexportPath = path.join(root, 'data', 'adminNavigation.ts');
const anchorComponentPath = path.join(root, 'components', 'MenuAnchorSections.tsx');
const menuMapPath = path.join(root, 'docs', 'v28.7', 'current-menu-map.json');

const navigationSource = fs.readFileSync(navigationPath, 'utf8');
const reexportSource = fs.readFileSync(reexportPath, 'utf8');
const anchorComponentSource = fs.readFileSync(anchorComponentPath, 'utf8');
const menuMap = JSON.parse(fs.readFileSync(menuMapPath, 'utf8'));

const expectedCounts = new Map([
  ['/admin', 4],
  ['/dashboard', 6],
  ['/website-management', 8],
  ['/service-operations', 9],
  ['/customer-center', 8],
  ['/social-media', 8],
  ['/admin/advertising-center', 8],
  ['/ai-intelligence', 7],
  ['/system-settings', 8]
]);

const expectedTitles = [
  'Navigation & Homepage',
  'Service Pages',
  'Track Record & Warranty',
  'Guide, FAQ & Tips',
  'Forms & Submissions',
  'Media Library',
  'SEO / AEO & Analytics',
  'Preview / Publish / Version',
  'Leads & Intake',
  'Site Inspection',
  'Quotations',
  'Jobs & Scheduling',
  'Engineer Tasks',
  'Invoices',
  'Payments',
  'Warranty & Completion',
  'Operations Audit',
  'Social Accounts & API Connections',
  'Unified Inbox & WhatsApp',
  'AI Reply & Human Transfer',
  'Content Studio',
  'Multi-platform Video Generator',
  'Preview, Approval & Publishing',
  'Social Leads & Attribution',
  'Social Logs & Performance',
  'Ads Accounts & API Connections',
  'Google Ads',
  'Meta Ads',
  'TikTok Ads',
  'X Ads',
  'Video Ads & Creatives',
  'Landing Pages & UTM',
  'Budget / ROI / Performance',
  'AI Dashboard & Alerts',
  'Website AI Content',
  'Social AI Content',
  'Ads AI Assistant',
  'Lead Scoring & Intake AI',
  'Quote / Invoice / Warranty AI',
  'Privacy, Risk & AI Logs',
  'Users, Roles & Permissions',
  'API Credential Center',
  'Supabase Database & RLS',
  'GitHub / Vercel Deployment',
  'Backup & Restore',
  'Security & Health Checks',
  'Webhooks & Error Logs',
  'Global Settings'
];

function fail(message) {
  console.error(`V28.7 admin menu verification failed: ${message}`);
  process.exitCode = 1;
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function countChildren(route) {
  const routePattern = new RegExp(`href: '${escapeRegExp(route)}',`);
  const lines = navigationSource.split('\n');
  const start = lines.findIndex((line) => routePattern.test(line));

  if (start === -1) {
    fail(`Missing route ${route} in V28.7 navigation`);
    return 0;
  }

  const childrenStart = lines.findIndex((line, index) => index > start && line.includes('children: ['));
  if (childrenStart === -1) {
    fail(`Missing children array for route ${route}`);
    return 0;
  }

  let count = 0;
  for (let index = childrenStart + 1; index < lines.length; index += 1) {
    const line = lines[index];
    if (/^\s*\]\s*$/.test(line)) break;
    if (line.trim().startsWith('child(')) count += 1;
  }

  return count;
}

for (const [route, expectedCount] of expectedCounts.entries()) {
  const actualCount = countChildren(route);
  if (actualCount !== expectedCount) {
    fail(`${route} expected ${expectedCount} children, found ${actualCount}`);
  }
}

for (const title of expectedTitles) {
  if (!navigationSource.includes(`'${title}'`)) {
    fail(`Missing simplified menu title: ${title}`);
  }
}

const requiredChineseLabels = ['网站后台管理', '业务订单处理', '客户中心', '社媒管理', '广告推广中心', 'AI 智能中心', '系统设置'];
for (const label of requiredChineseLabels) {
  if (!navigationSource.includes(label)) {
    fail(`Missing Chinese label: ${label}`);
  }
}

if (!navigationSource.includes('legacyFrom?: string[]')) {
  fail('MenuChild must preserve legacyFrom for old submenu anchor compatibility');
}

if (!reexportSource.includes("./v28.7-admin-navigation")) {
  fail('data/adminNavigation.ts must re-export the V28.7 simplified navigation');
}

if (!anchorComponentSource.includes('anchorsForItem') || !anchorComponentSource.includes('legacyFrom')) {
  fail('MenuAnchorSections must generate fallback anchors for legacyFrom entries');
}

if (!Array.isArray(menuMap.current_menu_summary) || menuMap.current_menu_summary.length !== 9) {
  fail('current-menu-map.json must include 9 scanned menu summaries');
}

if (!Array.isArray(menuMap.final_modules) || menuMap.final_modules.length !== 7) {
  fail('current-menu-map.json must include 7 practical backend final modules');
}

if (!process.exitCode) {
  console.log('V28.7 admin menu verification passed. Simplified menu counts, bilingual labels and legacy anchors are present.');
}
