# NANOFIX V28.1.3 Video Renderer Provider Selection Memory

This document records the selectable video editor / renderer platform workflow for Social Video Render Jobs.

Canonical related documents:

- `docs/NANOFIX_V28_1_2_OA_FIXES_AND_SOLUTIONS_MEMORY.md`
- `docs/NANOFIX_V28_1_3_SOCIAL_VIDEO_MATERIALS_MEMORY.md`
- `docs/NANOFIX_V28_1_3_SOCIAL_VIDEO_RENDERER_CONTRACT.md`
- `docs/NANOFIX_V28_1_3_RENDERED_OUTPUT_REVIEW_MEMORY.md`
- `docs/NANOFIX_V28_1_3_RENDER_SCHEDULE_HANDOFF_MEMORY.md`
- `docs/NANOFIX_V28_1_3_GLOBAL_PUBLISH_APPROVAL_BEFORE_SCHEDULE_MEMORY.md`

---

## 1. Confirmed requirement

NANOFIX Social Video Render Jobs must allow admins to choose which video editor / renderer platform will process the material.

Each platform option must show a clear feature note after the platform name, such as:

- suitable for automated branded video generation;
- suitable for template-based batch videos;
- suitable for AI creative clips;
- suitable for custom automation / third-party wrapper;
- suitable for self-editing and manual upload.

The platform choice must be saved per render job and must be used by the render worker.

---

## 2. Provider order

The platform order is confirmed as:

1. `NANOFIX Internal Renderer - Remotion + FFmpeg`  
   `适合自动化品牌视频生成`

2. `Creatomate API`  
   `适合模板化批量视频和广告`

3. `Runway API`  
   `适合 AI 创意片段和视觉延展`

4. `Custom Webhook Renderer`  
   `适合自定义自动化接口或第三方封装`

5. `Manual Final Video Upload`  
   `适合自己用剪映/Canva/外包剪辑后上传`

Default provider:

`nanofix_internal_remotion_ffmpeg`

---

## 3. Implemented registry

Implemented file:

`lib/nanofix/socialVideoRendererProviders.ts`

Important exports:

- `SOCIAL_VIDEO_RENDERER_PROVIDERS`
- `DEFAULT_SOCIAL_VIDEO_RENDERER_PROVIDER`
- `normaliseRendererProvider()`
- `getSocialVideoRendererProvider()`
- `getRendererEndpointForProvider()`
- `rendererProviderOptionsForClient()`

Each provider includes:

- `key`
- `label`
- `label_zh`
- `display_label`
- `display_label_zh`
- `short_note`
- `short_note_zh`
- `priority`
- `category`
- `default_render_type`
- `endpoint_env`
- `token_env`
- `supports_worker`
- `requires_external_endpoint`
- `recommended_for`
- `description`

---

## 4. Database fields

Updated migration:

`supabase/migrations/20260526009100_v28_1_3_social_video_render_jobs.sql`

The render job table now includes:

- `renderer_provider`
- `renderer_template_id`
- `renderer_model`
- `renderer_endpoint_key`
- `renderer_cost_estimate`

Allowed providers:

- `nanofix_internal_remotion_ffmpeg`
- `creatomate_api`
- `runway_api`
- `custom_webhook_renderer`
- `manual_final_video_upload`

Index:

- `social_video_render_jobs_renderer_provider_idx`

---

## 5. API behavior

Updated API:

`app/api/admin/social-media/render-jobs/route.ts`

Rules:

- Saves `renderer_provider` and related fields per job.
- Normalizes unknown provider values to the default provider.
- Stores provider notes into `render_settings`.
- Stores provider metadata into `output_json.render_plan` context.
- Includes provider metadata inside scheduled publish-ready snapshots.
- Returns `rendererProviders` to the admin UI.

Provider metadata stored in output/snapshot includes:

- `renderer_provider`
- `renderer_provider_label`
- `renderer_provider_label_zh`
- `renderer_provider_note`
- `renderer_provider_note_zh`
- `renderer_provider_priority`
- `renderer_provider_category`
- `renderer_supports_worker`
- `renderer_requires_external_endpoint`
- `renderer_template_id`
- `renderer_model`
- `renderer_endpoint_key`
- `renderer_cost_estimate`

---

## 6. Worker behavior

Updated worker:

`app/api/system/social-video-render-worker/route.ts`

Rules:

- Reads `renderer_provider` from each render job.
- Routes to the provider-specific endpoint through `getRendererEndpointForProvider()`.
- Uses provider-specific env vars:
  - `NANOFIX_INTERNAL_VIDEO_RENDERER_ENDPOINT`
  - `NANOFIX_INTERNAL_VIDEO_RENDERER_TOKEN`
  - `NANOFIX_CREATOMATE_RENDERER_ENDPOINT`
  - `NANOFIX_CREATOMATE_RENDERER_TOKEN`
  - `NANOFIX_RUNWAY_RENDERER_ENDPOINT`
  - `NANOFIX_RUNWAY_RENDERER_TOKEN`
  - `NANOFIX_CUSTOM_VIDEO_RENDERER_ENDPOINT`
  - `NANOFIX_CUSTOM_VIDEO_RENDERER_TOKEN`
- Includes provider metadata in the renderer request payload.
- Stores provider metadata into worker output.
- Does not fake-render if the selected provider endpoint is missing.
- Does not call any external renderer when `manual_final_video_upload` is selected.

Manual upload rule:

`manual_final_video_upload` is for final videos edited outside the system, such as CapCut, Canva or agency-edited files. It must not be queued for automatic rendering.

---

## 7. Admin UI behavior

Updated UI:

`components/SocialVideoRenderJobsWorkspace.tsx`

The UI now has:

- `Video Editor / Renderer Platform / 视频编辑平台`
- Platform options with feature notes in the dropdown.
- A provider detail card below the dropdown.
- Provider priority badge.
- Provider category badge.
- Worker automation / manual upload badge.
- Fields for:
  - `Renderer Template ID / 模板 ID`
  - `Renderer Model / 模型`
  - `Endpoint Key / 接口环境变量`
  - `Cost Estimate / 预计成本`

The queue button is disabled for:

`manual_final_video_upload`

UI warning:

`Manual Final Video Upload is for self-editing with CapCut, Canva or agency videos. Do not queue it for automatic rendering; upload the final video result and continue review/scheduling.`

Chinese UI warning:

`人工上传最终视频适合自己用剪映、Canva 或外包剪辑，不进入自动渲染队列。`

---

## 8. Verification

Added verification script:

`tools/verify-social-video-renderer-provider-selection.mjs`

Package script:

`verify:social-video-renderer-provider-selection`

`validate:predeploy` includes:

`npm run verify:social-video-renderer-provider-selection`

The verification script checks:

- provider registry exists;
- all five providers exist;
- provider notes exist in English and Chinese;
- database fields and check constraints exist;
- API saves and returns provider metadata;
- Worker routes by selected provider;
- Manual upload provider is blocked from automatic rendering;
- UI has provider dropdown, notes, provider cards and manual upload warning.

---

## 9. Must not regress

Future development must not:

- Remove the video editor / renderer provider selector.
- Remove the platform feature notes after each option.
- Change the default provider away from `nanofix_internal_remotion_ffmpeg` without explicit approval.
- Collapse all renderer providers back into one generic endpoint only.
- Queue `manual_final_video_upload` for automatic rendering.
- Store raw provider API tokens in render job rows.
- Fake-render when a selected provider endpoint is not configured.
- Remove provider metadata from render settings, render output or scheduled snapshots.
