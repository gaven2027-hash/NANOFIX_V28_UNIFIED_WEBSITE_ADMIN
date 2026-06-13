# NANOFIX V28.9 AI / Social / Ads Operational Closure

Branch: `v28-9-ai-social-ads-operational-closure`
Base: `d060702` / V28.9 Auto Global Repair Scanner Coverage

## Purpose

This step connects the AI Intelligence Center, Social Media Management, Advertising Center, Website CMS and Service Operations through protected operational APIs and a shared admin UI panel.

中文目标：把 AI 草稿、社媒询盘、广告线索、网站 CMS 和业务订单处理打通成真实后台闭环，同时保持人工审核、发布审批和广告激活保护。

## Closed loops added

1. AI content draft loop
   - route: `/api/ai/content-drafts`
   - writes operational evidence for `content_drafts`, `ai_logs` and `audit_logs`
   - keeps public publishing behind human review and Website Publish Approval

2. Social enquiry conversion loop
   - route: `/api/social/messages/convert`
   - creates `unified_intake`, `leads` and `service_requests`
   - adds optional internal inbox and audit evidence

3. Paid campaign attribution loop
   - route: `/api/ads/leads/attribute`
   - creates `unified_intake`, `leads` and `service_requests`
   - stores campaign attribution metadata for later ROI review

4. Social account bridge loop
   - routes: `/api/social/accounts/[provider]/connect|test|sync`
   - records bridge evidence and internal notification without direct public publishing

5. Advertising account bridge loop
   - routes: `/api/ads/accounts/[provider]/connect|test|sync`
   - records bridge evidence and internal notification without direct paid-platform activation

## Security boundaries

- `/api/ai`, `/api/social` and `/api/ads` are protected by middleware.
- API routes call `requireAdmin()` and use the verified middleware role-header contract.
- Protected field values posted through admin forms are summarized, not persisted by the closure helper.
- No social post is directly published.
- No website content is directly published.
- No paid campaign is directly activated.
- All public-facing output remains behind review / approval gates.

## UI surfaces

- AI Intelligence Center includes the V28.9 operational closure panel.
- Social Media Management includes the V28.9 operational closure panel.
- Advertising Center now has a dedicated route and page.
- Advertising Center includes account bridge and paid attribution UI.

## Verification

Run from Windows PowerShell:

```powershell
cd "C:\Users\Amelindo\Documents\NANOFIX_V28_UNIFIED_WEBSITE_ADMIN"
pwd
git status
git fetch origin
git checkout -B v28-9-ai-social-ads-operational-closure origin/v28-9-ai-social-ads-operational-closure
git status

node tools/verify-v28-9-ai-social-ads-operational-closure.mjs
npm.cmd run build:ci
git status
```

This step is not complete until the verifier is `ok:true`, build passes, working tree is clean, PR preview is Ready, PR is merged, and production `/api/ready` remains healthy.
