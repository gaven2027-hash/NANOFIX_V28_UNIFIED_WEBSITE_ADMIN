#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs';

const failures = [];
const warnings = [];

function read(path) {
  return existsSync(path) ? readFileSync(path, 'utf8') : '';
}

function must(ok, label) {
  console.log(`${ok ? '✅' : '❌'} ${label}`);
  if (!ok) failures.push(label);
}

function warn(ok, label) {
  console.log(`${ok ? '✅' : '⚠️'} ${label}`);
  if (!ok) warnings.push(label);
}

const websitePage = read('app/website-management/page.tsx');
const websiteApi = read('app/api/admin/website-management/route.ts');
const liveCore = read('components/WebsiteManagementLiveCore.tsx');
const workspace = read('components/WebsiteManagementWorkspace.tsx');
const readyEndpoint = read('app/api/ready/route.ts');
const phase8Doc = read('docs/v28.8/phase-8-customer-reviews-real-module-baseline.md');
const phase9Doc = read('docs/v28.8/phase-9-website-publish-approval-real-module-baseline.md');
const packageJson = read('package.json');

console.log('\nV28.8 Phase 9 Website Publish Approval verification');
console.log('---------------------------------------------------');

must(Boolean(phase9Doc), 'Phase 9 Website Publish Approval baseline document exists');
must(phase9Doc.includes('Website Publish Approval Real Module Baseline') && phase9Doc.includes('网站发布审核'), 'Baseline document covers Website Publish Approval');
must(phase9Doc.includes('draft') && phase9Doc.includes('pending_approval') && phase9Doc.includes('published') && phase9Doc.includes('archived'), 'Baseline document covers CMS status approval model');
must(phase9Doc.includes('Customer feedback, customer document feedback') && phase9Doc.includes('must not be published automatically'), 'Baseline document blocks automatic customer feedback publishing');
must(phase9Doc.includes('AI-generated website drafts') && phase9Doc.includes('cannot directly publish'), 'Baseline document blocks direct AI publishing');
must(phase9Doc.includes('node tools/verify-v28-8-phase-9-website-publish-approval.mjs'), 'Baseline document exposes direct Phase 9 verifier command');

// Website Management page baseline.
must(websitePage.includes('WebsiteManagementLiveCore') && websitePage.includes('WebsiteManagementWorkspace'), 'Website Management page mounts live core and workspace');
must(websitePage.includes('Live CMS, public intake, leads, media, preview, publish approval and version history'), 'Website Management page describes preview, publish approval and version history');
must(websitePage.includes('AdminShell') && websitePage.includes('MenuAnchorSections route="/website-management"'), 'Website Management page stays inside AdminShell and menu anchors');

// Website Management live API baseline.
must(websiteApi.includes('requireAdminApi') && websiteApi.includes("['super_admin', 'operations_admin', 'content_admin', 'support']"), 'Website Management GET is Admin API guarded');
must(websiteApi.includes("requireAdminApi(request, ['super_admin', 'content_admin'])"), 'Website Management POST/PATCH write boundary is super_admin/content_admin');
must(websiteApi.includes("key: 'pages'") && websiteApi.includes("table: 'website_pages'") && websiteApi.includes('page_id,slug,locale,title,meta_title,meta_description,status,published_at'), 'Website Management API reads website_pages with whitelisted fields');
must(websiteApi.includes("key: 'blocks'") && websiteApi.includes("table: 'website_content_blocks'") && websiteApi.includes('block_id,page_id,block_key,locale,title,body,status,sort_order'), 'Website Management API reads website_content_blocks with whitelisted fields');
must(websiteApi.includes("key: 'publish_audit'") && websiteApi.includes("table: 'audit_logs'") && websiteApi.includes("website_publish"), 'Website Management API reads publish audit logs from audit_logs');
must(websiteApi.includes("'Cache-Control': 'no-store, max-age=0'") && websiteApi.includes("'X-Robots-Tag': 'noindex, nofollow'"), 'Website Management API returns no-store/noindex headers');
must(websiteApi.includes('website_management_live_read') && websiteApi.includes('website_page_create') && websiteApi.includes('website_content_block_create'), 'Website Management API writes read/create audit logs');
must(websiteApi.includes('website_page_status_update') && websiteApi.includes('website_content_block_status_update'), 'Website Management API writes status update audit logs');
must(!/select\(['"]\*['"]\)/.test(websiteApi), 'Website Management API does not use select star');

// Status and publishing controls.
must(websiteApi.includes("['draft', 'seo_review', 'ready_to_publish', 'pending_approval', 'published', 'archived']"), 'Website Management API keeps full CMS approval status model');
must(websiteApi.includes("status === 'published'") && websiteApi.includes('published_at: now'), 'Website Management API sets published_at for published pages');
must(websiteApi.includes("if (!['pages', 'blocks'].includes(spec.key))") && websiteApi.includes('Only CMS pages and content blocks can be edited from this endpoint'), 'Website Management PATCH is restricted to CMS pages and blocks');
must(websiteApi.includes('before: beforeData') && websiteApi.includes('after: row'), 'Website Management status update audit keeps before/after snapshots');
must(!websiteApi.includes("from('invoices')") && !websiteApi.includes("from('payments')") && !websiteApi.includes("from('warranties')"), 'Website publish endpoint does not update invoice/payment/warranty records');

// Website Management live UI baseline.
must(liveCore.includes('/api/admin/website-management') && liveCore.includes('sessionHeaders'), 'Website live core calls guarded Website Management API with session headers');
must(liveCore.includes("status: 'draft'") && liveCore.includes('Create Draft / 新建草稿'), 'Website live core creates CMS records as draft');
must(liveCore.includes('Send Approval') && liveCore.includes("pending_approval"), 'Website live core exposes Send Approval status');
must(liveCore.includes('Publish') && liveCore.includes("published"), 'Website live core exposes Publish status');
must(liveCore.includes('Archive') && liveCore.includes("archived"), 'Website live core exposes Archive status');
must(liveCore.includes('CMS status updated and audited'), 'Website live core confirms audited status updates');
must(!/localStorage|sessionStorage/.test(liveCore), 'Website live core does not use browser storage workflow state');

// Workspace approval map baseline.
must(workspace.includes('Publish & rollback') && workspace.includes('Preview, Publish Approval & Version History'), 'Website workspace exposes publish/rollback and approval/version history');
must(workspace.includes('Publish approval required') && workspace.includes('pending_approval'), 'Website workspace shows pending approval item');
must(workspace.includes('Guide articles, FAQ, care tips, SEO questions and AEO answers remain human-reviewed before publishing'), 'Website workspace keeps SEO/AEO human-review wording');
must(workspace.includes('Website AI Drafts / 网站 AI 草稿'), 'Website workspace links AI drafts as draft/review material');
must(workspace.includes('发布前预览、审批后发布') && workspace.includes('发布审计'), 'Website workspace Chinese copy requires preview, approval and audit');

// Phase 8 safety carry-over.
must(phase8Doc.includes('does not publish customer reviews publicly') && phase8Doc.includes('Website Publish Approval / Social Publish Approval'), 'Phase 8 customer feedback safety remains linked to Website Publish Approval');
must(phase9Doc.includes('Website Publish Approval approves the final public wording') && phase9Doc.includes('publish audit is recorded'), 'Phase 9 requires approval and audit before public customer feedback reuse');

// Production readiness chain.
for (const table of ['audit_logs','workflow_settings','service_requests','leads','customer_document_feedback']) {
  must(readyEndpoint.includes(`"${table}"`), `/api/ready checks Website Publish Approval core table ${table}`);
}
for (const table of ['content_drafts','app_modules','notification_outbox','internal_inbox_messages','ai_logs']) {
  must(readyEndpoint.includes(`"${table}"`), `/api/ready checks Website Publish Approval support table ${table}`);
}
must(readyEndpoint.includes('failed_core_tables') && readyEndpoint.includes('failed_optional_tables'), '/api/ready exposes failed core and optional tables');

warn(packageJson.includes('"verify:v28-8-phase-9-website-publish-approval"'), 'package.json exposes V28.8 Phase 9 Website Publish Approval npm alias');
warn(websiteApi.includes("table: 'content_drafts'") || websiteApi.includes('content_drafts'), 'Website Management API directly reads content_drafts table');

if (failures.length) {
  console.error(`\nV28.8 Phase 9 Website Publish Approval verification failed: ${failures.length} issue(s).`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(JSON.stringify({
  ok: true,
  verifier: 'verify-v28-8-phase-9-website-publish-approval',
  failures,
  warnings,
  checked: {
    websiteManagementPageBaseline: true,
    websiteManagementApiBaseline: true,
    cmsStatusApprovalModel: true,
    websitePublishApprovalUiBaseline: true,
    customerFeedbackReuseSafety: true,
    aiDraftPublishSafety: true,
    productionReadyEndpointTables: true
  }
}, null, 2));
