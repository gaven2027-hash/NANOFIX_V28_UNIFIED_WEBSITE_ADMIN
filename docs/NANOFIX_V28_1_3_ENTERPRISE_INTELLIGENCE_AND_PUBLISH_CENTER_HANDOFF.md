# NANOFIX V28.1.3 Enterprise Intelligence & Publish Center Handoff Memory

Date: 2026-05-26

This document is the continuation memory for the NANOFIX V28 / Next.js + Vercel + Supabase + GitHub project.

## Canonical project baseline

Repository: `gaven2027-hash/NANOFIX_V28_UNIFIED_WEBSITE_ADMIN`

Working branch: `v28-1-1-operable-admin-phase-1`

Production domain: `https://www.nanofixsg.com`

Vercel project: `nanofix-v28-unified`

Supabase project ref: `qjwcjttdyzsgexswbygt`

Primary baseline memory document:

`docs/NANOFIX_V28_1_2_OA_FIXES_AND_SOLUTIONS_MEMORY.md`

All future work must preserve the V28.1.2 OA Production Candidate fixes:
- Operable OA admin backend
- Real Service & Order Operations CRUD
- Registration / login / approval flow
- Customer / engineer / admin permission boundary
- Supabase RLS hardening
- SECURITY DEFINER permission tightening
- FK performance indexes batch A / batch B
- Social account API binding
- Website social link management
- Website CMS backend integration
- Backup & Download Center
- Health checks and module isolation
- Vercel / GitHub / Supabase deployment gates
- PR mergeable=false risk awareness
- V28.1.3 optimization recommendations

## Locked governance principles

AI may analyze, predict, suggest, summarize, recommend, simulate, score, and learn from feedback.

AI must not auto publish, auto schedule, auto dispatch, auto edit final approved content, auto reply to customers, auto change strategy, or auto block publish based only on ROI prediction.

Approval must happen before scheduling.

Correct flow:

`Draft -> Edit -> Preview -> Review -> Approved -> Publish Center -> Publish Now / Schedule -> Published`

ROI %, Risk %, Viral Probability %, Engagement Prediction %, Conversion Probability %, Confidence %, and other AI advisory scores are reference-only and must not block publish.

Blocking is only allowed for true governance rules:
- approval missing
- compliance failure
- permission failure
- required final publish gate failure
- invalid account binding
- dispatch integrity failure

## Completed Website Management enhancements

Added provider registry:

`lib/nanofix/websiteVisualEditorProviders.ts`

Confirmed providers:
1. `nanofix_internal_visual_gif_editor`
2. `canva_brand_template_editor`
3. `adobe_firefly_express`
4. `creatomate_visual_gif_api`
5. `runway_image_gif_assist`
6. `custom_visual_webhook_editor`
7. `manual_final_asset_upload`

Added migration:

`supabase/migrations/20260526009300_v28_1_3_website_visual_editor_fields.sql`

Added fields to `website_content_blocks`:
- `visual_editor_provider`
- `visual_asset_type`
- `visual_editor_status`
- `visual_prompt`
- `visual_template_id`
- `visual_model`
- `visual_output_url`
- `visual_output_storage_path`
- `visual_alt_text`
- `visual_preview_json`
- `visual_cost_estimate`

Updated:

`app/api/admin/website-management/route.ts`

Now supports visual editor metadata, image/GIF prompt, image/GIF output URL, same-position preview JSON, and publish snapshot visual metadata.

Added:

`components/WebsiteSamePositionPreviewPanel.tsx`

Supports Hero, Section, Card Grid, CTA, FAQ-ready layouts, Desktop / Tablet / Mobile preview modes, and 1440px / 768px / 390px simulation.

Added:

`components/WebsiteRealIframePreviewPanel.tsx`

Added route:

`app/preview/website/page.tsx`

Supports real Next.js website preview in iframe, noindex / nofollow protection, Desktop / Tablet / Mobile iframe preview, and draft injection preview token.

Added helper:

`lib/nanofix/previewDraft.ts`

Supports build/encode/decode draft preview payloads.

Updated:

`components/LegacyWebsitePage.tsx`

Added mobile-only carousel arrow indicators:
- shown only on screens <= 767px
- desktop carousel unchanged
- automatic horizontal scroll/snap detection
- orange #FF5F00 left/right chevrons
- gradient edge hints
- click arrow scroll support

## Completed Publish Center implementation

Added migration:

`supabase/migrations/20260526009400_v28_1_3_unified_publish_center.sql`

Added table:

`publish_center_items`

Important fields:
- `module`
- `source_type`
- `platform`
- `status`
- `approval_status`
- `final_publish_gate`
- `snapshot_json`
- `scheduled_at`
- `published_at`
- `ai_auto_publish_allowed`
- `final_approval_completed_before_schedule`
- `publish_ready_after_schedule`
- `platform_api_called`

Security / governance:
- RLS enabled
- admin-only policy
- trigger prevents AI auto-publish
- trigger enforces approval before schedule / publish

Added API:

`app/api/admin/publish-center/route.ts`

Supports:
- GET publish queue
- POST create publish item
- PATCH update item
- PATCH action=publish_now
- PATCH action=schedule_publish
- PATCH action=push_back_to_review

Final Publish Gate:
- Website checks: `seo_ok`, `mobile_ok`, `cta_ok`, `alt_ok`, `broken_image_ok`, `cls_ok`
- Social checks: `ratio_ok`, `thumbnail_ok`, `caption_ok`, `hashtag_ok`, `video_rendered_ok`, `account_connected_ok`

Added UI:

`components/PublishCenterWorkspace.tsx`

Added page:

`app/admin/publish-center/page.tsx`

Supports Website / Social publish queue, Ready To Publish, Scheduled, Published, Failed, Save/Edit, Publish Now, Schedule, Push Back To Review, Final Publish Gate JSON editor, and Snapshot JSON editor.

Supported platforms:
- website
- facebook
- instagram
- tiktok
- youtube_shorts
- xiaohongshu
- google_business_profile
- linkedin
- x_twitter
- telegram_channel
- whatsapp_channel
- forum
- carousell_services
- seedly_community

## Confirmed AI Advisory requirements

Add AI Advisory Panel for manual uploads, AI-generated content, Canva, CapCut, Premiere, website CMS content, and social content.

All advisory metrics must be percentage-based:
- Predicted ROI %
- Risk %
- Publish Confidence %
- Viral Probability %
- Engagement Prediction %
- Conversion Probability %
- Trust Score %
- Reputation Score %
- Service Quality Score %
- Workforce Efficiency %
- Material ROI %
- Gross Profit Margin %
- Net Profit Margin %
- Business Risk Forecast %
- Enterprise Stability %
- Resilience %
- Awareness %
- Sustainability %

AI Advisory must be non-blocking.

Even if ROI is low or risk is high, the flow can continue to:

`Review -> Approved -> Publish Center -> Publish / Schedule`

AI should provide improvement suggestions with expected percentage lift:
- Change thumbnail: +26%
- Strengthen hook: +41%
- Improve CTA: +18%
- Add subtitles: +14%
- Add Singapore-local keywords: +12%
- Adjust publish time: +9%

## Dashboard / Analytics requirements

Main Dashboard / Analytics & Alerts must show:
- website published today
- website failed today
- social published today
- social failed today
- dispatch success %
- dispatch failure %
- queue delay
- retry count
- rollback count
- leads
- revenue
- ROI %

ROI must be shown as percentage.

ROI formula:

`ROI(%) = ((Revenue - Cost) / Cost) x 100`

Next implementation should add:
- analytics event bus
- unified metrics table
- dashboard aggregation API
- daily KPI endpoint
- publish/dispatch/lead/revenue event ingestion
- Dashboard UI cards and charts

## Future enterprise intelligence architecture memory

Treat these as future design layers, not as automatic execution authority:
- ROI Intelligence
- Viral Pattern Engine
- Creative Pattern Memory
- Competitive Intelligence
- Market Signal Intelligence
- Audience Intelligence
- Conversion Psychology
- Customer Journey Intelligence
- Revenue Attribution
- Intent Intelligence
- Lead Qualification
- Trust Intelligence
- Relationship Intelligence
- Reputation Intelligence
- Brand Authority Intelligence
- Service Intelligence
- Operational Quality Intelligence
- Workforce Intelligence
- Engineer Performance Intelligence
- Material Intelligence
- Supplier Intelligence
- Cost Optimization Intelligence
- Financial Intelligence
- Profitability Intelligence
- Strategic Forecasting
- Business Sustainability Intelligence
- Governance Intelligence
- Operational Reliability Intelligence
- Dispatch Health Monitor
- Recovery & Incident Center
- Immutable Audit Chain
- Governance Lock Engine
- Safe Rollback Engine
- Reliability & Resilience Center
- Queue Isolation Engine
- Dispatch Circuit Breaker
- Organizational Memory
- Knowledge Intelligence
- Decision Intelligence
- Executive Strategy Intelligence
- Autonomous Advisory Intelligence
- Strategic Coordination
- Unified Intelligence Mesh
- Cognitive Operating System
- Executive Mission Layer
- Adaptive Governance
- Executive Command Fabric
- Predictive Ecosystem Intelligence
- Digital Twin Governance
- Scenario Intelligence
- Meta-Intelligence
- Strategic Consciousness
- Institutional Intelligence
- Long-Term Evolution Intelligence
- Civilization Intelligence
- Legacy Sustainability

All these layers must follow:

`AI suggests, human decides.`

## Immediate next tasks in the new chat

1. Add AI Advisory database table:
   - `content_advisory_reports`
   - percentage metrics
   - suggestions JSON
   - `non_blocking=true`
   - linked to `publish_center_items`

2. Add AI Advisory API:
   - `/api/admin/ai-advisory`
   - create / read / refresh advisory reports
   - does not block publish

3. Add AI Advisory Panel UI:
   - inside `PublishCenterWorkspace`
   - shows Predicted ROI %, Risk %, Confidence %, Viral Probability %
   - shows improvement suggestions
   - clearly labels “Reference only / Does not block publishing”

4. Add Unified Analytics database:
   - `analytics_events`
   - `daily_analytics_metrics`
   - event_type: publish_success, publish_failed, dispatch_retry, lead_created, payment_received

5. Add Dashboard API:
   - `/api/admin/analytics/overview`
   - daily website/social publish counts
   - success/failure counts
   - ROI %
   - revenue
   - leads

6. Add Dashboard UI cards:
   - Daily Website Publish
   - Daily Social Publish
   - Dispatch Success %
   - Revenue
   - ROI %
   - Leads

7. Add validation script:
   - `tools/verify-publish-center-analytics-and-advisory.mjs`
   - include in `validate:predeploy`
