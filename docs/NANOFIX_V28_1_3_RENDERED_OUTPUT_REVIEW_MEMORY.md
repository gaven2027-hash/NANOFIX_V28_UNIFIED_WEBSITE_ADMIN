# NANOFIX V28.1.3 Rendered Output Review Memory

This addendum documents the rendered video output review layer added after the renderer contract foundation.

Canonical related documents:

- `docs/NANOFIX_V28_1_2_OA_FIXES_AND_SOLUTIONS_MEMORY.md`
- `docs/NANOFIX_V28_1_3_SOCIAL_VIDEO_MATERIALS_MEMORY.md`
- `docs/NANOFIX_V28_1_3_SOCIAL_VIDEO_RENDERER_CONTRACT.md`

---

## 1. Purpose

A rendered video result must not be treated as publish-ready automatically.

Even when an external renderer returns a valid result and the internal worker marks a job as `rendered`, NANOFIX requires a human admin review layer before any scheduling, publishing or platform handoff.

---

## 2. Implemented files

API:

- `app/api/admin/social-media/render-jobs/route.ts`

UI:

- `components/SocialRenderedOutputReviewPanel.tsx`
- `components/SocialVideoRenderJobsWorkspace.tsx`

Verification:

- `tools/verify-social-video-render-plan.mjs`

---

## 3. API actions

The render jobs API now supports:

### `approve_rendered_output`

Purpose:

Approve a rendered video output after admin review.

Required conditions:

- `render_status` must be `rendered`.
- `output_json.renderer_contract_valid` must be `true`.
- `output_json.renderer_result` must contain either:
  - `output_video_url`, or
  - `output_storage_path`.

If any condition is missing, the API must reject approval.

On success:

- Sets `render_status = approved`.
- Sets `approved_by` from the admin actor.
- Writes `output_json.rendered_output_review.status = approved`.
- Keeps `admin_review_required = true`.
- Keeps `ai_auto_publish_allowed = false`.
- Writes audit log action `approve_social_video_rendered_output`.

### `request_render_revision`

Purpose:

Send a rendered job back for revision.

On success:

- Sets `render_status = draft`.
- Stores the revision reason in `error_message`.
- Writes `output_json.rendered_output_review.status = revision_requested`.
- Keeps `admin_review_required = true`.
- Keeps `ai_auto_publish_allowed = false`.
- Writes audit log action `request_social_video_render_revision`.

---

## 4. Review UI

Implemented component:

`components/SocialRenderedOutputReviewPanel.tsx`

The panel displays:

- Render job status
- Renderer contract validation status
- Output video URL or storage path
- Renderer name and version
- Output MIME type
- Video width / height / duration
- File size
- SHA256 checksum if available
- Thumbnail URL or thumbnail storage path
- Latest review status and notes
- Review notes textbox
- `Approve Rendered Output / 批准渲染结果`
- `Request Revision / 要求返工`

Approval button must only be enabled when:

- status is `rendered`,
- renderer contract is valid,
- and a real output video URL or storage path exists.

---

## 5. Safety rules

Rendered output review must always preserve:

- `admin_review_required: true`
- `ai_auto_publish_allowed: false`

The renderer must not bypass human review.

The rendered output approval step does not publish to Facebook, TikTok, YouTube Shorts, Instagram, Xiaohongshu, Google Business Profile, LinkedIn, X/Twitter, Carousell, Seedly, WhatsApp Channel, Telegram Channel, Website Blog or any other platform.

Publishing/scheduling must remain a separate admin-controlled step.

---

## 6. Verification requirements

`tools/verify-social-video-render-plan.mjs` must check:

- `SocialRenderedOutputReviewPanel.tsx` exists.
- `approve_rendered_output` exists in the API.
- `request_render_revision` exists in the API.
- API uses `hasRenderableOutput` or equivalent validation.
- API requires `renderer_contract_valid === true` before approval.
- API rejects approval without output video URL/storage path.
- UI displays rendered output review controls.
- UI has `Approve Rendered Output` and `Request Revision` actions.
- UI references `output_video_url`, `output_storage_path` and `renderer_contract_valid`.

---

## 7. Must not regress

Future development must not:

- Automatically approve a rendered output.
- Automatically publish after renderer success.
- Mark a non-contract-valid output as approved.
- Approve a rendered output without a real output video URL/storage path.
- Remove audit logs for approval or revision request.
- Set `ai_auto_publish_allowed` to true.
- Set `admin_review_required` to false.
