# NANOFIX V28.1.3 Social Video Materials Enhancement Memory

This document records the V28.1.3 enhancement added on top of the V28.1.2 OA Production Candidate memory.

Canonical base memory remains:

`docs/NANOFIX_V28_1_2_OA_FIXES_AND_SOLUTIONS_MEMORY.md`

This addendum must be followed for all future Social Media Management / AI Social Assistant / Multi-Platform Preview development.

---

## 1. Confirmed enhancement goal

The Social AI / Multi-Platform Preview workflow must clearly separate:

1. Source Video / 素材视频
2. Reference Video / 参考视频
3. Video Clips / 可直接上传的视频素材片段

The old ambiguous single `video_url` concept must not be reintroduced as the only video input.

---

## 2. Current implemented workflow

The intended workflow is now:

`Upload / enter source videos → Upload / enter reference videos → Upload video clips → Add keywords / CTA / notes → Select target platforms → Generate platform-specific drafts → Side-by-side preview → Admin review → Create video render job → Queue / approve / schedule snapshot`

AI safety rule remains unchanged:

- AI must save output as draft only.
- AI cannot auto-publish.
- AI cannot auto-approve.
- Admin review is required.

---

## 3. Structured material pack fields

Implemented in:

`components/SocialMaterialPackBuilder.tsx`

Required fields:

- `script_keywords`
- `source_video_urls`
- `reference_video_urls`
- `video_clip_urls`
- `cover_image_url`
- `image_urls`
- `service_area`
- `cta`
- `reference_notes`
- `notes`
- `uploaded_materials`

Definitions:

| Field | Purpose |
| --- | --- |
| `source_video_urls` | NANOFIX-owned source videos used as content material, such as inspection, repair, before/after or site work videos. |
| `reference_video_urls` | Videos used only for creative/style reference, such as pacing, hook, captions, framing or format. These must not be treated as directly usable source material. |
| `video_clip_urls` | Direct video material clips, such as before-work, during-work, after-work, leak diagnosis and site inspection clips. |
| `cover_image_url` | Cover image for Shorts/Reels/TikTok/Xiaohongshu/Carousell listing previews. |
| `image_urls` | Supporting image materials such as site photos, before/after photos, inspection images and project images. |
| `reference_notes` | Explicit instruction on what should be learned from reference videos. |
| `uploaded_materials` | Audit-friendly metadata for uploaded files: kind, bucket, path, signed URL, filename, size, MIME type and safety flags. |

---

## 4. Direct upload controls

Implemented upload controls:

1. Upload Source Video / 上传素材视频
2. Upload Reference Video / 上传参考视频
3. Upload Video Clip / 上传视频片段
4. Upload Cover Image / 上传封面图
5. Upload Image Material / 上传图片素材

The upload UI calls:

`POST /api/admin/social-media/material-upload`

Implemented in:

`app/api/admin/social-media/material-upload/route.ts`

---

## 5. Upload API rules

The upload API must continue to enforce:

- Admin permission: `requireAdmin(request, 'write:content')`
- Allowed upload kinds:
  - `source_video`
  - `reference_video`
  - `video_clip`
  - `image`
  - `cover_image`
- MIME family restriction:
  - `video/*`
  - `image/*`
- Maximum file size:
  - `500MB`
- Storage bucket:
  - `nanofix-social-materials`
- Audit action:
  - `upload_social_material`
- Safety flags:
  - `admin_review_required: true`
  - `ai_auto_publish_allowed: false`

The upload API returns material metadata and a temporary signed URL.

---

## 6. Supabase Storage bucket

Implemented migration:

`supabase/migrations/20260526009000_v28_1_3_social_video_material_storage.sql`

Bucket:

`nanofix-social-materials`

Rules:

- Bucket must remain private.
- File size limit: `524288000` bytes.
- Allowed MIME types include common video and image types.
- Admin/editor/manager roles can read/insert/update/delete through Storage RLS policies.
- Public website must not directly expose raw private storage URLs.

---

## 7. Multi-platform preview integration

Updated file:

`components/SocialMultiPlatformPreviewBoard.tsx`

The old `Source Media JSON` free-text-only area has been replaced by the structured `SocialMaterialPackBuilder` UI.

The generated `source_media` object passed to:

`POST /api/admin/social-media` with `action = create_multi_platform_drafts`

must include the structured material pack fields above.

---

## 8. Video render job queue foundation

Implemented migration:

`supabase/migrations/20260526009100_v28_1_3_social_video_render_jobs.sql`

Implemented API:

`app/api/admin/social-media/render-jobs/route.ts`

Implemented workspace:

`components/SocialVideoRenderJobsWorkspace.tsx`

Implemented route:

`/social-media/social-video-render-jobs`

Purpose:

This is a queue/audit foundation for future video rendering workers. It stores render job requests, material pack JSON, render settings, output metadata and status. It does not render final MP4 files by itself yet.

Table:

`social_video_render_jobs`

Important columns:

- `render_job_id`
- `content_id`
- `platform`
- `render_status`
- `render_type`
- `title`
- `material_pack`
- `render_settings`
- `output_json`
- `error_message`
- `admin_review_required`
- `ai_auto_publish_allowed`
- `requested_by`
- `approved_by`
- `scheduled_at`
- `started_at`
- `finished_at`

Allowed statuses:

- `draft`
- `queued`
- `processing`
- `rendered`
- `failed`
- `cancelled`
- `approved`
- `scheduled`

Allowed render types:

- `short_video`
- `long_video`
- `story`
- `reel`
- `listing_video`
- `blog_embed`

Safety rules:

- Render job API must force `admin_review_required: true`.
- Render job API must force `ai_auto_publish_allowed: false`.
- Render job create/update actions must write audit logs.
- Render job table must keep RLS enabled.
- Only authorized admin/editor/manager roles may manage render jobs.

Multi-platform preview integration:

`components/SocialMultiPlatformPreviewWorkspace.tsx` now allows a selected platform draft to create a video render job through:

`POST /api/admin/social-media/render-jobs`

The render job copies the draft's structured `source_media` material pack from `source_references` when available.

---

## 9. Verification and deployment gates

Updated verification files:

- `tools/verify-social-multi-platform-preview.mjs`
- `tools/verify-oa-production-readiness.mjs`

The checks must ensure:

- `SocialMaterialPackBuilder.tsx` exists.
- `material-upload/route.ts` exists.
- `render-jobs/route.ts` exists.
- `SocialVideoRenderJobsWorkspace.tsx` exists.
- `source_video_urls`, `reference_video_urls`, `video_clip_urls`, `cover_image_url`, `image_urls`, `reference_notes`, `uploaded_materials` exist.
- Upload kinds `source_video`, `reference_video`, `video_clip`, `cover_image`, `image` exist.
- The private bucket `nanofix-social-materials` exists.
- Upload API has 500MB limit.
- Upload API writes audit logs.
- `social_video_render_jobs` table exists.
- Render job API writes create/update audit logs.
- Render job API forces AI auto-publish off and admin review on.
- `/social-media/social-video-render-jobs` is routed to the dedicated workspace.
- Multi-platform preview can create video render jobs from selected drafts.
- AI draft-only and admin review safety flags remain enforced.

---

## 10. Current limitation

This enhancement implements structured materials, uploads and a render job queue foundation for AI/social content generation, but it is not yet a full video-rendering engine.

Still not implemented:

- Automatic video timeline editor
- Auto cut/merge/export final MP4
- Subtitle burn-in
- Voiceover/TTS rendering
- Background music mixing
- Full transcode pipeline
- Thumbnail extraction from uploaded video
- Batch multi-file upload in a single request
- Background render worker / queue worker execution
- Actual MP4 output generation

These should be handled as a later V28.1.4 / V28.2 video rendering module if needed.

---

## 11. Must not regress

Future development must not:

- Collapse `source_video_urls`, `reference_video_urls` and `video_clip_urls` back into one ambiguous `video_url` field.
- Make `nanofix-social-materials` public.
- Store raw platform API tokens or secrets in social material records.
- Allow AI to auto-publish or auto-approve generated content.
- Remove audit logging for uploads.
- Remove admin review requirements.
- Remove the `social_video_render_jobs` queue/audit table without replacing it with an equivalent render job system.
- Trigger actual rendering/publishing without an approved admin-controlled workflow.

---

## 12. Related platform preview context

The multi-platform preview center currently includes:

- FB Preview
- TikTok Preview
- YouTube Shorts Preview
- Instagram Preview
- Xiaohongshu Preview
- Forum Preview
- Google Business Profile Preview
- LinkedIn Preview
- X / Twitter Preview
- Carousell Services Preview
- Seedly Community Preview
- WhatsApp Channel Preview
- Telegram Channel Preview
- Website Blog Preview
