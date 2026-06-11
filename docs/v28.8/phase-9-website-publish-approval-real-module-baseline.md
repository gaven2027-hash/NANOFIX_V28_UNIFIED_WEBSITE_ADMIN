# NANOFIX V28.8 Phase 9 — Website Publish Approval Real Module Baseline

Date: 2026-06-11
Branch: `v28-8-phase-9-website-publish-approval`
Base: post V28.8 Phase 8 merge commit `fcf1c21dab203204be8ed443e6e25ed10efd7d91`

## Goal

Phase 9 continues the real business-module hardening sequence after Customer Reviews. Website Publish Approval / 网站发布审核 is the controlled release gate for public website content, CMS pages, content blocks, SEO/AEO drafts, customer testimonials, guide articles and AI/social-derived content.

中文目标：在客户反馈基线完成后，锁定网站发布审核真实链路，确保任何官网内容、客户评价引用、AI 草稿、SEO/AEO 文案和 CMS 页面内容，必须经过草稿、预览、审核、发布、审计、可回滚记录后才可公开使用。

## Why Website Publish Approval after Customer Reviews

The expected content chain is:

1. Internal draft / 内部草稿
2. CMS page or content block / CMS 页面或内容区块
3. SEO/AEO review / SEO 与 AEO 审核
4. Customer feedback review if customer words are reused / 涉及客户原话时必须先审核客户反馈
5. Preview / 发布前预览
6. Publish approval / 发布审批
7. Published public website content / 公开官网内容
8. Audit log / 发布审计
9. Version history and rollback / 版本历史与回滚

If publish approval is weak, unapproved customer comments, AI-generated text, or unfinished service content may become public, harming compliance, reputation and SEO/AEO trust.

## Locked Website Publish Approval chain

### 1. Website Management page baseline

The Website Management page must continue to:

- mount `WebsiteManagementLiveCore`;
- mount `WebsiteManagementWorkspace`;
- describe the area as Live CMS, public intake, leads, media, preview, publish approval and version history;
- expose the route `/website-management` through the Admin shell.

### 2. Website Management live API baseline

The Website Management live API must continue to:

- require Admin API authentication;
- allow only internal content/admin roles;
- read real `website_pages` and `website_content_blocks` records;
- read public form submissions, website leads, paid leads and uploads through real Supabase tables;
- expose publish audit logs from `audit_logs` where object type is website page, website content block or website publish;
- use no-store responses and noindex headers;
- avoid `select("*")` on business/CMS tables;
- write read, create and status update audit logs.

### 3. CMS status and approval baseline

The CMS status model must continue to include:

- `draft`;
- `seo_review`;
- `ready_to_publish`;
- `pending_approval`;
- `published`;
- `archived`.

The Website Management UI must continue to:

- create new CMS records as draft;
- expose Send Approval / 送审;
- expose Publish / 发布;
- expose Archive / 归档;
- call the guarded Website Management API;
- use same-origin session bearer headers;
- avoid browser localStorage/sessionStorage workflow state.

### 4. Publish and audit baseline

The status update API must continue to:

- restrict PATCH updates to CMS pages and blocks only;
- reject unsupported sections;
- require an object ID;
- set `published_at` when CMS page status becomes `published`;
- write `website_page_status_update` or `website_content_block_status_update` audit logs;
- preserve before/after snapshots in audit logs;
- never update service records, customer records, invoices, warranties or payments from this publish endpoint.

### 5. Workspace approval map baseline

The Website Management workspace must continue to show:

- quick action for Publish & rollback;
- CMS service page items with statuses like draft, SEO review and ready-to-publish;
- track record and testimonial items as human-reviewed content;
- SEO/AEO and AI draft section;
- Preview, Publish Approval & Version History panel;
- wording that content must be previewed before publishing, approval is required, and restorable version history/publish audit logs are retained.

### 6. Customer feedback reuse safety rule

Customer feedback, customer document feedback, warranty satisfaction responses, photos, testimonials and case comments must not be published automatically.

They may only be reused on the website after:

- internal feedback review is completed;
- personal/private details are removed or redacted;
- content is turned into an approved CMS draft;
- Website Publish Approval approves the final public wording;
- publish audit is recorded.

### 7. AI/SEO/AEO draft safety rule

AI-generated website drafts, SEO titles, AEO/FAQ answers, social copy or advertising copy must remain draft/review material until approved.

AI content cannot directly publish to public website pages without Website Publish Approval.

### 8. Production readiness baseline

The production `/api/ready` endpoint must continue checking the tables needed by the website publish/review chain:

Core:

- `audit_logs`
- `workflow_settings`
- `service_requests`
- `leads`
- `customer_document_feedback`

Optional but important:

- `content_drafts`
- `app_modules`
- `notification_outbox`
- `internal_inbox_messages`
- `ai_logs`

## Phase 9 command

Run this locally before opening or updating the PR:

```powershell
cd "C:\Users\Amelindo\Documents\NANOFIX_V28_UNIFIED_WEBSITE_ADMIN"
pwd
git status

node tools/verify-v28-8-phase-9-website-publish-approval.mjs
```

## Completion criteria

Phase 9 Website Publish Approval baseline is complete when:

- the verifier passes locally;
- git status is clean;
- PR is opened from the repair branch;
- Vercel preview succeeds;
- PR is merged only after checks pass;
- production `/api/ready` stays healthy after merge.

## Next module after this phase

After Website Publish Approval is locked, continue with:

1. Backup & Recovery / 备份与恢复
2. AI / Social / Advertising production-safe content loop
3. System Health & Release Gate hardening
4. Final V28.8 release gate checklist
