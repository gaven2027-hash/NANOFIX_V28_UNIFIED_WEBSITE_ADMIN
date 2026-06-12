# NANOFIX V28.9 Auto Global Repair Scope

Date: 2026-06-12
Branch: `v28-9-auto-global-repair`

## Purpose

This scope starts the V28.9 compressed repair sprint. It increases automated coverage while keeping the V28.8 production baseline intact.

中文目标：启动 V28.9 压缩修复阶段，先扩大自动扫描范围，保留 V28.8 已经确认的生产健康基线，不重开 V28.8 文档流程。

## Repair scope

The first V28.9 step covers:

- admin API route scan;
- customer and portal route scan;
- AI Intelligence Center scan;
- Social Media Management scan;
- Advertising Center / campaign / promotion scan;
- Website Management / CMS / Website Publish Approval scan;
- Service Operations scan;
- Customer Portal scan;
- broad role/header pattern scan;
- broad Supabase query pattern scan;
- Supabase service-role key placement scan;
- browser token / role storage scan;
- direct AI/social/ad publish-bypass pattern scan;
- direct paid campaign activation-bypass pattern scan;
- customer feedback auto-publish pattern scan;
- readiness endpoint required / optional table coverage scan;
- final V28.8 document set coverage scan;
- route and workflow evidence scan;
- release command coverage scan.

## AI / Social / Advertising coverage

This step explicitly adds scan evidence for the V28.9 operational upgrade target areas:

1. AI Intelligence Center
   - `ai_logs`
   - `content_drafts`
   - AI draft / review / approval markers
   - no direct AI publishing

2. Social Media Management
   - platform / social surface markers
   - scheduling / review / approval markers
   - notification and inbox support
   - no social publish without approval

3. Advertising Center
   - advertising / campaign / promotion markers
   - budget / audience / CTA review readiness markers where present
   - no direct paid-platform activation without approval

4. Website Management / CMS
   - Website Publish Approval remains the public website publishing path
   - AI/social/ad material remains draft/review content until approval

5. Service Operations and Customer Portal linkage
   - lead and service request markers remain visible
   - customer feedback cannot auto-publish into public content
   - audit and notification support remains visible

## Files introduced or updated in this step

- `tools/v28-9-auto-global-repair.mjs`
- `tools/verify-v28-9-auto-global-repair.mjs`
- `docs/v28.9/auto-global-repair-scope.md`

## Local command

```powershell
cd "C:\Users\Amelindo\Documents\NANOFIX_V28_UNIFIED_WEBSITE_ADMIN"
pwd
git status
git fetch origin
git checkout -B v28-9-auto-global-repair origin/v28-9-auto-global-repair
git status

node tools/v28-9-auto-global-repair.mjs
node tools/verify-v28-9-auto-global-repair.mjs
git status
```

## Quality rule

This step is only complete when:

- the auto global repair check returns `ok: true`;
- the verifier returns `ok: true`;
- failures are empty;
- local working tree is clean;
- PR is opened from `v28-9-auto-global-repair` to `main`;
- Vercel Preview is Ready;
- production `/api/ready` remains healthy after merge.

## Safety boundaries

This V28.9 Step 1 scanner does not:

- reset production Supabase;
- disable RLS;
- publish website content;
- publish social media posts;
- activate paid advertising;
- change production data;
- merge directly into `main`;
- bypass verifier / build / smoke / production health gates.

## V28.9 next step

After this scan step is locked, continue with:

1. `v28-9-ai-social-ads-operational-closure`
2. `v28-9-final-release-polish`
