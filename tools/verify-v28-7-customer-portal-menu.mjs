import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const configPath = path.join(root, 'data', 'v28.7-customer-portal-navigation.ts');
const portalShellPath = path.join(root, 'components', 'PortalShell.tsx');
const engineerPagePath = path.join(root, 'app', 'portal', 'engineer', 'page.tsx');

const config = fs.readFileSync(configPath, 'utf8');
const portalShell = fs.readFileSync(portalShellPath, 'utf8');
const engineerPage = fs.existsSync(engineerPagePath) ? fs.readFileSync(engineerPagePath, 'utf8') : '';

const expectedMenus = [
  ['Dashboard', '我的首页', 'dashboard'],
  ['My Repairs', '我的维修', 'my-repairs'],
  ['Quotes & Payments', '报价与付款', 'quotes-payments'],
  ['Warranty & Documents', '保修与文件', 'warranty-documents'],
  ['Support & Account', '支持与账号', 'support-account']
];

const blockedVisibleTitles = [
  'Customer Register',
  'Customer Login',
  'Submit Request',
  'New Repair Request',
  'Warranty Claim',
  'My Repair Requests',
  'My Quotations',
  'My Invoices',
  'My Payments & Receipts',
  'My Warranties',
  'My Reviews',
  'Review Privacy Settings'
];

const requiredLegacyAnchors = [
  'customer-register',
  'customer-login',
  'submit-request',
  'new-repair-request',
  'warranty-claim',
  'my-repair-requests',
  'my-quotations',
  'my-invoices',
  'my-payments-receipts',
  'my-warranties',
  'submit-review-link',
  'my-reviews',
  'review-privacy-settings'
];

function fail(message) {
  console.error(`V28.7 customer portal menu verification failed: ${message}`);
  process.exitCode = 1;
}

const menuEntryCount = (config.match(/href: '\/customer-portal#/g) || []).length;
if (menuEntryCount !== 5) {
  fail(`Customer portal navigation must expose exactly 5 menus, found ${menuEntryCount}`);
}

for (const [title, zh, anchor] of expectedMenus) {
  if (!config.includes(`title: '${title}'`) || !config.includes(`zh: '${zh}'`) || !config.includes(`#${anchor}`)) {
    fail(`Missing required customer portal menu: ${title} / ${zh}`);
  }
}

for (const title of blockedVisibleTitles) {
  if (config.includes(`title: '${title}'`)) {
    fail(`Old customer portal item must not remain as a visible menu: ${title}`);
  }
}

for (const anchor of requiredLegacyAnchors) {
  if (!config.includes(`'${anchor}'`)) {
    fail(`Missing legacy anchor compatibility for ${anchor}`);
  }
}

if (!config.includes('includesReviewLink: true')) {
  fail('Support & Account must include the Leave a Review link flag');
}

if (!portalShell.includes('customerPortalNavigation.map')) {
  fail('PortalShell must render customer menus from customerPortalNavigation config');
}

if (!portalShell.includes('type PortalType') || !portalShell.includes("'customer' | 'engineer'")) {
  fail('PortalShell must keep both customer and engineer portal type support');
}

if (!portalShell.includes('engineerPortalNavigation') || !portalShell.includes('EngineerPortalAnchors')) {
  fail('PortalShell must keep engineer portal navigation and EngineerPortalAnchors export');
}

if (engineerPage.includes('EngineerPortalAnchors') && !portalShell.includes('export function EngineerPortalAnchors')) {
  fail('app/portal/engineer imports EngineerPortalAnchors, but PortalShell does not export it');
}

if (engineerPage.includes('type="engineer"') && !portalShell.includes('engineerPortalNavigation')) {
  fail('app/portal/engineer uses type="engineer", but PortalShell does not provide engineer navigation');
}

if (!portalShell.includes('grid grid-cols-5') || !portalShell.includes('lg:hidden')) {
  fail('PortalShell must include mobile five-tab bottom navigation');
}

if (!portalShell.includes('data-customer-portal-legacy-anchor')) {
  fail('PortalShell must preserve old customer portal anchors as fallback spans');
}

if (!portalShell.includes('CustomerReviewLinkButton')) {
  fail('PortalShell must show Leave a Review shortcut in dashboard/support area');
}

if (!process.exitCode) {
  console.log('V28.7 customer portal menu verification passed. Customer portal is simplified to 5 menus with mobile tabs, review link support, legacy anchors and engineer portal compatibility.');
}
