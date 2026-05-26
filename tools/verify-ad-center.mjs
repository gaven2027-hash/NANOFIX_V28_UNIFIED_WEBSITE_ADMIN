#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs';

function read(path) { return existsSync(path) ? readFileSync(path, 'utf8') : ''; }
function ok(condition, label, failures) {
  console.log(`${condition ? '✅' : '❌'} ${label}`);
  if (!condition) failures.push(label);
}

const failures = [];
const auth = read('lib/nanofix/auth.ts');
const config = read('lib/nanofix/advertising-center.ts');
const adminData = read('lib/admin-data.ts');
const workspace = read('components/AdvertisingCenterWorkspace.tsx');
const importWorkspace = read('components/AdvertisingImportWorkspace.tsx');
const insightsWorkspace = read('components/AdvertisingInsightsWorkspace.tsx');
const creativesWorkspace = read('components/AdvertisingCreativesWorkspace.tsx');
const budgetWorkspace = read('components/AdvertisingBudgetWorkspace.tsx');
const page = read('app/admin/advertising-center/page.tsx');
const importPage = read('app/admin/advertising-center/import/page.tsx');
const insightsPage = read('app/admin/advertising-center/insights/page.tsx');
const creativesPage = read('app/admin/advertising-center/creatives/page.tsx');
const budgetPage = read('app/admin/advertising-center/budgets/page.tsx');
const api = read('app/api/admin/advertising-center/route.ts');
const importApi = read('app/api/admin/advertising-center/import/route.ts');
const insightsApi = read('app/api/admin/advertising-center/insights/route.ts');
const creativesApi = read('app/api/admin/advertising-center/creatives/route.ts');
const budgetApi = read('app/api/admin/advertising-center/budgets/route.ts');
const coreMigration = read('supabase/migrations/20260527010000_v28_1_4_advertising_center.sql');
const loopMigration = read('supabase/migrations/20260527013000_v28_1_4_advertising_center_full_loop.sql');

ok(page.includes('AdvertisingCenterWorkspace'), 'ad center page exists', failures);
ok(importPage.includes('AdvertisingImportWorkspace'), 'ad CSV import page exists', failures);
ok(insightsPage.includes('AdvertisingInsightsWorkspace'), 'ad insights page exists', failures);
ok(creativesPage.includes('AdvertisingCreativesWorkspace'), 'ad creatives page exists', failures);
ok(budgetPage.includes('AdvertisingBudgetWorkspace'), 'ad budgets page exists', failures);
ok(workspace.includes('Advertising & Promotion Center'), 'ad center workspace exists', failures);
ok(page.includes('/admin/advertising-center/budgets') && page.includes('/admin/advertising-center/creatives'), 'ad center quick links include budgets and creatives', failures);
ok(importWorkspace.includes('Advertising CSV') && importWorkspace.includes('Import CSV'), 'CSV import workspace exists', failures);
ok(insightsWorkspace.includes('Advertising ROI Insights') && insightsWorkspace.includes('Risk Alerts'), 'ROI insights workspace exists', failures);
ok(creativesWorkspace.includes('Creatives & Copy') && creativesWorkspace.includes('Save Creative Draft'), 'creatives workspace exists', failures);
ok(budgetWorkspace.includes('Budgets & Strategy') && budgetWorkspace.includes('Submit Budget Request'), 'budget strategy workspace exists', failures);
ok(importApi.includes('parseCsv') && importApi.includes('ad_performance_daily'), 'CSV import API parses and writes performance rows', failures);
ok(importApi.includes('refreshCampaignTotals') && importApi.includes('ad_sync_logs'), 'CSV import refreshes campaign totals and logs sync', failures);
ok(insightsApi.includes('buildAlerts') && insightsApi.includes('byPlatform') && insightsApi.includes('byDate'), 'insights API builds alerts, platform and daily summaries', failures);
ok(insightsApi.includes('high_spend_no_leads') && insightsApi.includes('low_roas'), 'insights API checks high spend and low ROAS alerts', failures);
ok(creativesApi.includes('write:ad_creative') && creativesApi.includes('ad_creatives'), 'creatives API writes ad creative drafts', failures);
ok(budgetApi.includes('ad_budget.review') && budgetApi.includes('super_admin_approve'), 'budget API supports finance review and Super Admin approval', failures);
ok(workspace.includes('Connected Accounts') && workspace.includes('AI Suggestions') && workspace.includes('Approval Gates'), 'workspace has accounts, AI suggestions and approval gates', failures);
ok(workspace.includes('super_admin_takeover') && workspace.includes('Generated URL'), 'workspace has Super Admin takeover and UTM generation', failures);
ok(api.includes('read:advertising') && api.includes('ad_campaign.draft'), 'ad center API permissions exist', failures);
ok(importApi.includes("requireAdmin(request, 'ad_campaign.draft')"), 'CSV import API requires ad campaign draft permission', failures);
ok(insightsApi.includes("requireAdmin(request, 'read:advertising')"), 'insights API requires advertising read permission', failures);
ok(api.includes('isSuperAdmin') && api.includes('super_admin_takeover'), 'ad center API checks Super Admin takeover', failures);
ok(api.includes('ad_budget_change_requests') && api.includes('ad_super_admin_takeovers'), 'API supports budget requests and takeover records', failures);
ok(auth.includes('super_admin: ["*"]'), 'Super Admin wildcard permission exists', failures);
ok(auth.includes('read:advertising') && auth.includes('write:ad_creative') && auth.includes('read:ad_roi'), 'role advertising permissions exist', failures);
ok(config.includes('superAdminAdvertisingCapabilities') && config.includes('adApprovalGateRules'), 'Super Admin capability and approval gate config exists', failures);
ok(config.includes('sampleAdAccounts') && config.includes('sampleAdSuggestions'), 'account and AI suggestion fallback data exists', failures);
ok(adminData.includes('Advertising & Promotion Center') && adminData.includes('order: "5"'), 'central admin menu includes advertising center at order 5', failures);
ok(adminData.includes('Advertising Campaign') && adminData.includes('advertising_center_notice'), 'workflow and editable notice include advertising center', failures);
ok(coreMigration.includes('public.ad_campaigns'), 'ad campaigns schema exists', failures);
ok(coreMigration.includes('public.ad_ai_suggestions'), 'ad AI suggestions schema exists', failures);
ok(coreMigration.includes('public.ad_approval_requests'), 'ad approval schema exists', failures);
ok(loopMigration.includes('public.ad_platform_accounts'), 'ad platform accounts schema exists', failures);
ok(loopMigration.includes('public.ad_creatives'), 'ad creatives schema exists', failures);
ok(loopMigration.includes('public.ad_performance_daily'), 'ad daily performance schema exists', failures);
ok(loopMigration.includes('public.ad_conversion_attribution'), 'ad attribution schema exists', failures);
ok(loopMigration.includes('public.ad_budget_change_requests'), 'ad budget request schema exists', failures);
ok(loopMigration.includes('public.ad_sync_logs'), 'ad sync logs schema exists', failures);
ok(loopMigration.includes('public.ad_super_admin_takeovers'), 'Super Admin takeover schema exists', failures);
ok((coreMigration + loopMigration).includes('enable row level security'), 'ad tables enable RLS', failures);

if (failures.length) {
  console.error(`\nAd center verification failed: ${failures.length}`);
  process.exit(1);
}
console.log('\nAd center verification passed.');
