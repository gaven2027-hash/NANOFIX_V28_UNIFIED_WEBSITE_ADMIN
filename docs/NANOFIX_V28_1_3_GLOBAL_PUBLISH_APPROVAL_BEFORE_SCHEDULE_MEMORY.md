# NANOFIX V28.1.3 Global Publishing Rule: Approval Before Scheduling

This document records the global NANOFIX backend publishing governance rule confirmed for all publishable content modules.

Canonical base memory remains:

- `docs/NANOFIX_V28_1_2_OA_FIXES_AND_SOLUTIONS_MEMORY.md`

Related social/video documents:

- `docs/NANOFIX_V28_1_3_SOCIAL_VIDEO_MATERIALS_MEMORY.md`
- `docs/NANOFIX_V28_1_3_SOCIAL_VIDEO_RENDERER_CONTRACT.md`
- `docs/NANOFIX_V28_1_3_RENDERED_OUTPUT_REVIEW_MEMORY.md`
- `docs/NANOFIX_V28_1_3_RENDER_SCHEDULE_HANDOFF_MEMORY.md`

---

## 1. Global rule

All publishable backend content must complete all required verification, compliance checks, review and approval before scheduling.

Once a content item is scheduled, the system treats it as publish-ready at the scheduled time.

Correct global workflow:

`draft → review/checks → final approval → schedule → wait for scheduled publishing`

Incorrect workflow, prohibited:

`draft → schedule → final approval → publish`

This rule applies to all future and current publishing modules, including but not limited to:

- Social media posts
- AI-generated social drafts
- Rendered social videos
- Website CMS pages
- Website blog posts
- Guide / SEO / AEO content
- Google Business Profile updates
- WhatsApp Channel / Telegram Channel posts
- Forum / LinkedIn / X / Carousell / Seedly content
- Any future platform publishing module

---

## 2. Meaning of scheduling

Scheduling is not an approval step.

Scheduling means:

- content has already passed all required checks;
- content has already received final admin approval;
- required output files, links, captions, metadata and compliance flags are ready;
- the system is allowed to wait until the scheduled time for the publish action;
- no extra final approval queue should exist after scheduling.

---

## 3. Required flags for scheduled/published snapshots

Any scheduled or published snapshot must include:

- `final_approval_completed_before_schedule: true`
- `publish_ready_after_schedule: true`
- `admin_review_required: true`
- `ai_auto_publish_allowed: false`

For modules that may call platform APIs in the future, the scheduling step should also record:

- `platform_api_called: false`

Actual platform publishing, if implemented later, must be a separate controlled publisher/worker that only processes schedule-ready content at or after `scheduled_at`.

---

## 4. Current implementation

### Social media generic publish snapshot

File:

`app/api/admin/social-media/route.ts`

The `publish_snapshot` action now rejects `scheduled` or `published` snapshots unless:

- `final_approval_completed_before_schedule === true`
- `publish_ready_after_schedule === true`
- `admin_review_required === true`
- `ai_auto_publish_allowed === false`

Audit action:

`publish_snapshot_after_pre_schedule_final_approval`

### Rendered social video schedule snapshot

File:

`app/api/admin/social-media/render-jobs/route.ts`

The `create_rendered_output_schedule_snapshot` action now requires:

- render job status is `approved`;
- renderer contract is valid;
- rendered output review status is `approved`;
- `rendered_output_review.final_approval_completed === true`;
- output video URL or storage path exists.

The generated snapshot uses:

- `source = final_approved_rendered_social_video_output`
- `final_approval_completed_before_schedule = true`
- `publish_ready_after_schedule = true`
- `platform_api_called = false`
- `admin_review_required = true`
- `ai_auto_publish_allowed = false`

Audit action:

`final_approve_and_schedule_social_video_render`

---

## 5. Explicitly prohibited design

The following design is not allowed:

- creating a separate final approval queue after scheduling;
- adding a `pending_final_approval` status after a scheduled snapshot exists;
- creating a publish handoff table that represents final approval after scheduling;
- allowing scheduling before verification and approval are finished;
- allowing scheduled content to remain blocked by a later human approval step.

The following files were intentionally removed / must not be reintroduced for this purpose:

- `app/api/admin/social-media/publish-handoffs/route.ts`
- `supabase/migrations/20260526009200_v28_1_3_social_platform_publish_handoffs.sql`

A future platform publisher is allowed, but it must treat scheduled content as already approved and only handle platform delivery, retry, error handling and publish result recording.

---

## 6. Future publisher/worker rule

A future publisher worker may process content only when:

- status is `scheduled`;
- `scheduled_at` is due;
- `final_approval_completed_before_schedule === true`;
- `publish_ready_after_schedule === true`;
- `ai_auto_publish_allowed === false` unless a later explicitly approved policy changes this;
- all module-specific output and compliance requirements are present.

The publisher worker must not introduce another final approval stage.

---

## 7. Verification expectations

Verification scripts must protect this rule by checking:

- generic social `publish_snapshot` rejects scheduled/published snapshots without pre-schedule final approval flags;
- rendered video scheduling requires final approval before scheduling;
- post-schedule final approval handoff files do not exist;
- UI text states scheduling means publish-ready after all reviews;
- scheduling step does not auto-publish or call platform APIs unless future publisher worker is explicitly implemented.

---

## 8. Must not regress

Future development must not:

- Move final approval after scheduling.
- Add post-schedule approval queues.
- Schedule content before final checks and approval.
- Treat scheduling as an uncertain draft state.
- Remove `final_approval_completed_before_schedule` from scheduled/published snapshots.
- Remove `publish_ready_after_schedule` from scheduled/published snapshots.
- Allow AI to auto-publish by default.
- Bypass audit logging for final approval or scheduling.
