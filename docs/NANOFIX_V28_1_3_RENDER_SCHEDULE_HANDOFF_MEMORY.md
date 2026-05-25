# NANOFIX V28.1.3 Approved Rendered Output Schedule Handoff Memory

This addendum documents the controlled handoff from an approved rendered social video output into a scheduled social publish snapshot.

Canonical related documents:

- `docs/NANOFIX_V28_1_2_OA_FIXES_AND_SOLUTIONS_MEMORY.md`
- `docs/NANOFIX_V28_1_3_SOCIAL_VIDEO_MATERIALS_MEMORY.md`
- `docs/NANOFIX_V28_1_3_SOCIAL_VIDEO_RENDERER_CONTRACT.md`
- `docs/NANOFIX_V28_1_3_RENDERED_OUTPUT_REVIEW_MEMORY.md`

---

## 1. Purpose

A rendered video may only enter the scheduling workflow after human admin approval.

The schedule handoff creates a `social_publish_versions` snapshot for audit, review and later scheduling/publishing workflows. It does not publish to any platform by itself.

---

## 2. Implemented files

API:

- `app/api/admin/social-media/render-jobs/route.ts`

UI:

- `components/SocialRenderedOutputReviewPanel.tsx`
- `components/SocialVideoRenderJobsWorkspace.tsx`

Verification:

- `tools/verify-social-render-schedule-handoff.mjs`
- `package.json` script `verify:social-render-schedule-handoff`

---

## 3. API action

The render jobs API supports:

`create_rendered_output_schedule_snapshot`

Required conditions:

- Render job status must be `approved`.
- `output_json.renderer_contract_valid` must be `true`.
- `output_json.rendered_output_review.status` must be `approved`.
- `output_json.renderer_result` must contain either:
  - `output_video_url`, or
  - `output_storage_path`.

If any condition is missing, the API must reject the action with:

`Only approved rendered outputs with a valid renderer contract and output video reference can create schedule snapshots.`

---

## 4. Created social publish version

On success, the API inserts a row into:

`social_publish_versions`

with:

- `platform` from the render job
- next `version_no` for that platform
- `status = scheduled`
- `scheduled_at` from the admin input or null
- `published_by` set to the admin actor id
- `snapshot_json.source = approved_rendered_social_video_output`
- `snapshot_json.publish_requires_separate_admin_action = true`
- `snapshot_json.ai_auto_publish_allowed = false`
- `snapshot_json.admin_review_required = true`

The snapshot contains:

- render job id
- content id
- platform
- title
- render type
- material pack
- render settings
- render plan
- renderer result
- rendered output review

---

## 5. Render job update

After the snapshot is created, the render job is updated to:

- `render_status = scheduled`
- `scheduled_at` from the admin input or null
- `output_json.schedule_snapshot_handoff.status = scheduled_snapshot_created`
- `output_json.schedule_snapshot_handoff.version_id`
- `output_json.schedule_snapshot_handoff.version_no`
- `output_json.schedule_snapshot_handoff.scheduled_at`
- `admin_review_required = true`
- `ai_auto_publish_allowed = false`

Audit action:

`create_social_video_render_schedule_snapshot`

---

## 6. UI behavior

The rendered output review panel now includes:

- Schedule Time / 排期时间
- Create Schedule Snapshot / 创建排期快照
- Schedule Snapshot Handoff / 排期快照交接 status panel

The create snapshot button is enabled only after:

- rendered output is approved,
- renderer contract is valid,
- and a real output video reference exists.

The UI must always show the warning:

`This creates a scheduled snapshot only. It does not publish or call platform APIs.`

---

## 7. Verification requirements

The script `tools/verify-social-render-schedule-handoff.mjs` must check:

- API has `create_rendered_output_schedule_snapshot`.
- API has `hasApprovedRenderedOutput` or equivalent guard.
- API requires status `approved`.
- API requires `renderer_contract_valid === true`.
- API requires `rendered_output_review.status === approved`.
- API requires `output_video_url` or `output_storage_path`.
- API inserts into `social_publish_versions`.
- Snapshot source is `approved_rendered_social_video_output`.
- Snapshot uses `publish_requires_separate_admin_action: true`.
- UI has Create Schedule Snapshot button.
- UI states no publishing or platform API call happens.
- `validate:predeploy` includes `npm run verify:social-render-schedule-handoff`.

---

## 8. Must not regress

Future development must not:

- Create a schedule snapshot from a non-approved render job.
- Create a schedule snapshot when renderer contract validation failed.
- Create a schedule snapshot when no real output video URL/storage path exists.
- Treat scheduled snapshot creation as actual publishing.
- Call Facebook, TikTok, YouTube, Instagram, Xiaohongshu, Google Business Profile, LinkedIn, X/Twitter, Carousell, Seedly, WhatsApp Channel, Telegram Channel or Website Blog APIs from this handoff step.
- Set `ai_auto_publish_allowed` to true.
- Set `admin_review_required` to false.
- Remove the audit log action `create_social_video_render_schedule_snapshot`.
