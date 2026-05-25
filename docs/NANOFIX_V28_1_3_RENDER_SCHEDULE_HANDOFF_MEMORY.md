# NANOFIX V28.1.3 Final Approval Before Scheduling Memory

This addendum documents the corrected NANOFIX social video approval and scheduling workflow.

Canonical related documents:

- `docs/NANOFIX_V28_1_2_OA_FIXES_AND_SOLUTIONS_MEMORY.md`
- `docs/NANOFIX_V28_1_3_SOCIAL_VIDEO_MATERIALS_MEMORY.md`
- `docs/NANOFIX_V28_1_3_SOCIAL_VIDEO_RENDERER_CONTRACT.md`
- `docs/NANOFIX_V28_1_3_RENDERED_OUTPUT_REVIEW_MEMORY.md`

---

## 1. Corrected workflow principle

Final approval must happen before scheduling.

Scheduling means the video has already passed all required checks and is considered ready for publishing at the scheduled time.

There must not be a separate final approval queue after scheduling.

The scheduling step still must not automatically publish or call platform APIs unless a future approved publisher module is explicitly added with separate safeguards.

Correct workflow:

`rendered → final approval → scheduled publish-ready snapshot`

Incorrect workflow, now prohibited:

`rendered → scheduled snapshot → final approval handoff`

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

Explicitly removed / prohibited:

- `app/api/admin/social-media/publish-handoffs/route.ts`
- `supabase/migrations/20260526009200_v28_1_3_social_platform_publish_handoffs.sql`

---

## 3. API actions

The render jobs API supports:

### `approve_rendered_output`

This is now the final approval before scheduling.

Required conditions:

- Render job status must be `rendered`.
- `output_json.renderer_contract_valid` must be `true`.
- `output_json.renderer_result` must contain either:
  - `output_video_url`, or
  - `output_storage_path`.

On success:

- `render_status = approved`
- `output_json.rendered_output_review.status = approved`
- `output_json.rendered_output_review.final_approval_completed = true`
- `output_json.rendered_output_review.ready_for_schedule = true`
- `output_json.rendered_output_review.publish_ready_after_schedule = true`
- `output_json.final_approval_completed_before_schedule = true`
- `admin_review_required = true`
- `ai_auto_publish_allowed = false`

Audit action:

`final_approve_social_video_rendered_output_before_schedule`

### `request_render_revision`

This sends the rendered output back for revision before scheduling.

On success:

- `render_status = draft`
- `output_json.rendered_output_review.status = revision_requested`
- `output_json.rendered_output_review.final_approval_completed = false`
- `output_json.rendered_output_review.ready_for_schedule = false`
- `output_json.rendered_output_review.publish_ready_after_schedule = false`
- `output_json.final_approval_completed_before_schedule = false`
- `admin_review_required = true`
- `ai_auto_publish_allowed = false`

Audit action:

`request_social_video_render_revision_before_schedule`

### `create_rendered_output_schedule_snapshot`

This action schedules only after final approval is already completed.

Required conditions:

- Render job status must be `approved`.
- `output_json.renderer_contract_valid` must be `true`.
- `output_json.rendered_output_review.status` must be `approved`.
- `output_json.rendered_output_review.final_approval_completed` must be `true`.
- `output_json.renderer_result` must contain either:
  - `output_video_url`, or
  - `output_storage_path`.

If any condition is missing, the API must reject the action with:

`Only final-approved rendered outputs with a valid renderer contract and output video reference can be scheduled.`

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
- `snapshot_json.source = final_approved_rendered_social_video_output`
- `snapshot_json.final_approval_completed_before_schedule = true`
- `snapshot_json.publish_ready_after_schedule = true`
- `snapshot_json.platform_api_called = false`
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
- rendered output review / final approval record

---

## 5. Render job update

After the schedule snapshot is created, the render job is updated to:

- `render_status = scheduled`
- `scheduled_at` from the admin input or null
- `output_json.schedule_snapshot_handoff.status = scheduled_publish_ready_snapshot_created`
- `output_json.schedule_snapshot_handoff.version_id`
- `output_json.schedule_snapshot_handoff.version_no`
- `output_json.schedule_snapshot_handoff.scheduled_at`
- `output_json.final_approval_completed_before_schedule = true`
- `output_json.publish_ready_after_schedule = true`
- `output_json.platform_api_called = false`
- `admin_review_required = true`
- `ai_auto_publish_allowed = false`

Audit action:

`final_approve_and_schedule_social_video_render`

---

## 6. UI behavior

The rendered output review panel must show:

- `Final Approval Before Scheduling / 排期前最终审批`
- `Final Approve / 最终审批通过`
- `Final Approve & Schedule / 最终确认并排期`
- `Scheduled Publish-Ready Snapshot / 已排期发布就绪快照`

The schedule button is enabled only after:

- rendered output is final-approved,
- renderer contract is valid,
- final approval is completed,
- and a real output video reference exists.

The UI must state:

`Scheduling confirms the video has passed all required reviews and is publish-ready at the scheduled time. It still does not auto-publish or call platform APIs in this step.`

---

## 7. Verification requirements

The script `tools/verify-social-render-schedule-handoff.mjs` must check:

- API has `create_rendered_output_schedule_snapshot`.
- API has `hasFinalApprovedRenderedOutput` or equivalent guard.
- API requires status `approved`.
- API requires `renderer_contract_valid === true`.
- API requires `rendered_output_review.status === approved`.
- API requires `rendered_output_review.final_approval_completed === true`.
- API requires `output_video_url` or `output_storage_path`.
- API inserts into `social_publish_versions`.
- Snapshot source is `final_approved_rendered_social_video_output`.
- Snapshot uses `final_approval_completed_before_schedule: true`.
- Snapshot uses `publish_ready_after_schedule: true`.
- Snapshot uses `platform_api_called: false`.
- UI has Final Approve & Schedule button.
- UI states scheduling means publish-ready but no auto-publish / no platform API call.
- It must reject any post-schedule final approval handoff API/table.
- `validate:predeploy` includes `npm run verify:social-render-schedule-handoff`.

---

## 8. Must not regress

Future development must not:

- Create a schedule snapshot from a non-approved render job.
- Create a schedule snapshot when renderer contract validation failed.
- Create a schedule snapshot when final approval has not been completed before scheduling.
- Create a schedule snapshot when no real output video URL/storage path exists.
- Reintroduce a post-schedule final approval table or API.
- Treat scheduling as actual automatic platform publishing.
- Call Facebook, TikTok, YouTube, Instagram, Xiaohongshu, Google Business Profile, LinkedIn, X/Twitter, Carousell, Seedly, WhatsApp Channel, Telegram Channel or Website Blog APIs from this scheduling step.
- Set `ai_auto_publish_allowed` to true.
- Set `admin_review_required` to false.
- Remove the audit log action `final_approve_and_schedule_social_video_render`.
