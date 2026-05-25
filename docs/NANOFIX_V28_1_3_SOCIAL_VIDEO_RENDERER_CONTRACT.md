# NANOFIX V28.1.3 Social Video Renderer Contract

This document defines the external renderer contract for NANOFIX Social Video Render Jobs.

Canonical implementation files:

- `lib/nanofix/socialVideoRendererContract.ts`
- `app/api/system/social-video-render-worker/route.ts`
- `app/api/admin/social-media/render-jobs/route.ts`
- `components/SocialVideoRenderJobsWorkspace.tsx`

This contract sits on top of:

- `docs/NANOFIX_V28_1_2_OA_FIXES_AND_SOLUTIONS_MEMORY.md`
- `docs/NANOFIX_V28_1_3_SOCIAL_VIDEO_MATERIALS_MEMORY.md`

---

## 1. Purpose

The Next.js app does not render final videos by itself yet.

The internal worker:

`/api/system/social-video-render-worker`

may call a future external renderer service through:

`NANOFIX_VIDEO_RENDERER_ENDPOINT`

The external renderer may be implemented later with tools such as FFmpeg, Remotion, Cloud Run, Supabase Edge Function, a queue worker, or a third-party rendering provider.

The worker must only mark a job as `rendered` when the renderer returns a valid result matching this contract.

---

## 2. Renderer request payload

When the worker calls the renderer, it sends a JSON object like:

```json
{
  "contract_version": "v28.1.3-renderer-contract-1",
  "render_job_id": "uuid",
  "platform": "tiktok",
  "render_type": "short_video",
  "title": "Render: NANOFIX no-hacking leak repair proof",
  "material_pack": {},
  "render_settings": {},
  "output_json": {},
  "required_result_fields": ["ok", "renderer_name", "render_job_id", "output_mime_type", "rendered_at"],
  "required_output_reference": "output_video_url or output_storage_path",
  "admin_review_required": true,
  "ai_auto_publish_allowed": false
}
```

Rules:

- `render_job_id` must be echoed back unchanged.
- `material_pack` may contain private signed URLs; the renderer must treat them as confidential.
- `reference_video_urls` are style references only and must not be reused as NANOFIX-owned footage.
- `admin_review_required` must remain `true`.
- `ai_auto_publish_allowed` must remain `false`.

---

## 3. Required renderer success response

A successful renderer response must be a JSON object:

```json
{
  "ok": true,
  "renderer_name": "nanofix-video-renderer",
  "renderer_version": "v1",
  "render_job_id": "uuid",
  "output_storage_path": "rendered/social-video/job-id.mp4",
  "output_mime_type": "video/mp4",
  "output_file_size_bytes": 12345678,
  "duration_seconds": 30,
  "width": 1080,
  "height": 1920,
  "thumbnail_storage_path": "rendered/social-video/job-id.jpg",
  "checksum_sha256": "real-file-checksum",
  "rendered_at": "2026-05-25T00:00:00.000Z",
  "warnings": [],
  "metadata": {
    "platform": "tiktok",
    "aspect_ratio": "9:16"
  },
  "admin_review_required": true,
  "ai_auto_publish_allowed": false
}
```

At least one of the following is required:

- `output_video_url`
- `output_storage_path`

Required fields:

- `ok: true`
- `renderer_name`
- `render_job_id`
- `output_mime_type`
- `rendered_at`
- `admin_review_required: true`
- `ai_auto_publish_allowed: false`

Recommended fields:

- `renderer_version`
- `output_file_size_bytes`
- `duration_seconds`
- `width`
- `height`
- `thumbnail_url` or `thumbnail_storage_path`
- `checksum_sha256`
- `warnings`
- `metadata`

---

## 4. Contract validation

Implemented validator:

`validateSocialVideoRendererResult()` in `lib/nanofix/socialVideoRendererContract.ts`

The validator rejects a renderer result if:

- It is not a JSON object.
- `ok` is not `true`.
- `renderer_name` is missing.
- `render_job_id` is missing.
- `render_job_id` does not match the queued job.
- Both `output_video_url` and `output_storage_path` are missing.
- `output_mime_type` is missing.
- `output_mime_type` is not `video/*`.
- Numeric metadata fields have invalid types.
- `rendered_at` is missing.
- `warnings` is not an array of strings.
- `admin_review_required` is not `true`.
- `ai_auto_publish_allowed` is not `false`.

If validation fails:

- The worker marks the job as `failed`.
- `output_json.renderer_contract_valid` is set to `false`.
- The validation errors are stored in `output_json.worker_result.validation`.
- The job is not marked as `rendered`.

If validation passes:

- The worker marks the job as `rendered`.
- The normalized renderer result is stored in `output_json.renderer_result`.
- `output_json.renderer_contract_valid` is set to `true`.
- Admin review remains required before any scheduling or publishing step.

---

## 5. Security and publishing rules

The renderer contract does not authorize publishing.

Even after a job is marked `rendered`:

- The output must still go through admin review.
- AI cannot auto-approve.
- AI cannot auto-publish.
- Platform posting tokens must remain in social account binding secret references, not inside renderer results.
- Public website must not expose private storage URLs directly.

---

## 6. Failure examples

### Missing output video

```json
{
  "ok": true,
  "renderer_name": "renderer",
  "render_job_id": "uuid",
  "output_mime_type": "video/mp4",
  "rendered_at": "2026-05-25T00:00:00.000Z",
  "admin_review_required": true,
  "ai_auto_publish_allowed": false
}
```

Result: rejected, because no `output_video_url` or `output_storage_path` is provided.

### Wrong job id

```json
{
  "ok": true,
  "renderer_name": "renderer",
  "render_job_id": "another-job-id",
  "output_storage_path": "rendered/video.mp4",
  "output_mime_type": "video/mp4",
  "rendered_at": "2026-05-25T00:00:00.000Z",
  "admin_review_required": true,
  "ai_auto_publish_allowed": false
}
```

Result: rejected, because the job id does not match.

### Publishing bypass attempt

```json
{
  "ok": true,
  "renderer_name": "renderer",
  "render_job_id": "uuid",
  "output_storage_path": "rendered/video.mp4",
  "output_mime_type": "video/mp4",
  "rendered_at": "2026-05-25T00:00:00.000Z",
  "admin_review_required": false,
  "ai_auto_publish_allowed": true
}
```

Result: rejected, because the renderer tried to bypass human review and enable AI auto-publish.

---

## 7. Future renderer implementation notes

A future renderer service should:

- Download only authorized/signed source files.
- Treat reference videos as style references only.
- Use a deterministic output path per render job.
- Return checksum and metadata where possible.
- Never publish to social platforms directly.
- Never store platform access tokens in output metadata.
- Write final output into a private or controlled storage location.
- Let the NANOFIX admin system handle review, approval, scheduling and publishing.
