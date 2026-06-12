# NANOFIX V28.8 Phase 11 — AI / Social / Advertising Production-Safe Content Loop Baseline

Date: 2026-06-12
Branch: `v28-8-phase-11-ai-social-advertising-safe-content-loop`
Base: post V28.8 Phase 10 merge commit `9300369d0f426a9caa62d0f096d416d77793665e`

## Goal

Phase 11 continues the real business-module hardening sequence after Backup & Recovery. AI / Social / Advertising production-safe content loop is the safety gate that keeps AI-generated drafts, social media captions, advertising ideas, keyword plans, SEO/AEO text, customer-review reuse, and promotional campaigns inside a review-and-approval workflow before anything becomes public or paid media.

中文目标：在备份与恢复基线完成后，锁定 AI、社媒、广告内容闭环，确保 AI 生成内容、社媒草稿、广告文案、SEO/AEO 草稿、客户评价引用和促销内容都必须先进入草稿、审核、预览、审批、审计流程，不能直接发布官网、社媒或广告平台。

## Expected production-safe content chain

1. Source signal / 来源信号
   - customer request;
   - customer feedback;
   - warranty satisfaction;
   - website lead;
   - social message;
   - search keyword;
   - competitor insight;
   - manual admin idea.
2. AI draft / AI 草稿
3. Internal review / 内部审核
4. Compliance and privacy check / 合规与隐私检查
5. Website Publish Approval or Social Publish Approval / 官网或社媒发布审批
6. Final scheduled or published content / 最终排期或发布内容
7. Audit log and notification / 审计日志与通知
8. Backup and recovery coverage / 备份与恢复覆盖

## Locked Phase 11 safety rules

### 1. No direct AI publishing

AI-generated text, image prompts, SEO/AEO content, service descriptions, FAQs, social captions and ad copy must remain draft/review material until approved.

The system must not contain or introduce direct-public-publish behavior such as:

- AI draft automatically becoming published website content;
- AI draft automatically becoming live social post;
- AI draft automatically becoming paid ad campaign;
- customer feedback automatically becoming public testimonial;
- unreviewed generated content bypassing Website Publish Approval.

### 2. Website content path

Anything intended for public website use must follow the Phase 9 Website Publish Approval chain:

- draft;
- SEO/AEO review;
- preview;
- pending approval;
- publish approval;
- audit log;
- version/rollback trail.

AI content may be used only as source material for a CMS draft.

### 3. Social content path

Social content for Facebook, Instagram, TikTok, YouTube Shorts, Google Business Profile and Xiaohongshu must follow:

- material upload or idea input;
- AI draft generation;
- platform-specific draft adaptation;
- internal review;
- approval;
- schedule or manual publish;
- audit log;
- notification or inbox entry if blocked, risky or failed.

### 4. Advertising content path

Advertising and promotion content must follow:

- campaign idea or keyword plan;
- AI draft;
- landing page / offer / CTA review;
- budget and audience review;
- approval;
- schedule/manual export;
- audit log;
- no direct paid-platform activation without approval.

### 5. Customer feedback reuse safety

Customer feedback, customer document feedback, warranty satisfaction responses, photos, testimonials, service records and case comments must not be auto-published.

They may only be reused after:

- internal feedback review is complete;
- private details are removed or redacted;
- customer identity is anonymised unless explicit approval exists;
- content is converted into an approved CMS/social/ad draft;
- final public wording is approved;
- audit log is recorded.

### 6. Data and table readiness baseline

The production `/api/ready` endpoint must continue checking the support tables needed by this content loop:

Core:

- `audit_logs`
- `workflow_settings`
- `service_requests`
- `leads`
- `customer_document_feedback`

Optional/support:

- `content_drafts`
- `ai_logs`
- `notification_outbox`
- `internal_inbox_messages`
- `app_modules`
- `automation_rules`

### 7. Audit and notification baseline

AI/social/advertising actions must keep the following expectations:

- generated content is logged or traceable;
- publish approval is auditable;
- failed/risky content can create notification or inbox items;
- direct public publish without approval is prohibited;
- generated content should not expose secrets, service-role keys, admin tokens, customer private data or unredacted signed URLs.

### 8. Backup continuity baseline

Phase 11 inherits Phase 10 backup coverage. AI logs, content drafts, notifications, inbox messages, website/public content approval data and audit logs must remain covered by backup readiness checks.

### 9. Non-goals in this phase

Phase 11 does not:

- publish live website content;
- publish social media posts;
- create paid ad campaigns;
- connect to paid advertising spend;
- bypass Website Publish Approval;
- bypass Social Publish Approval;
- expose secret keys or tokens;
- mutate production Supabase outside the existing safe routes.

## Phase 11 command

Run this locally before opening or updating the PR:

```powershell
cd "C:\Users\Amelindo\Documents\NANOFIX_V28_UNIFIED_WEBSITE_ADMIN"
pwd
git status

node tools/verify-v28-8-phase-11-ai-social-advertising-safe-content-loop.mjs
```

## Completion criteria

Phase 11 AI / Social / Advertising production-safe content loop baseline is complete when:

- the verifier passes locally;
- git status is clean;
- PR is opened from the repair branch;
- Vercel preview succeeds;
- PR is merged only after checks pass;
- production `/api/ready` stays healthy after merge;
- no direct AI/social/ad public publish bypass has been introduced.

## Next module after this phase

After Phase 11 is locked, continue with:

1. System Health & Release Gate hardening
2. Final V28.8 release gate checklist
3. Production smoke-test checklist
4. V28.8 final release readiness report
