# NANOFIX V28.1.3 Scheduled Publisher Worker Memory

This document records the scheduled social publishing worker foundation.

Canonical related documents:

- `docs/NANOFIX_V28_1_2_OA_FIXES_AND_SOLUTIONS_MEMORY.md`
- `docs/NANOFIX_V28_1_3_GLOBAL_PUBLISH_APPROVAL_BEFORE_SCHEDULE_MEMORY.md`
- `docs/NANOFIX_V28_1_3_RENDER_SCHEDULE_HANDOFF_MEMORY.md`

---

## 1. Purpose

After all checks and final approval are completed before scheduling, the scheduled snapshot is considered publish-ready.

The scheduled publisher worker is responsible for executing due scheduled publish-ready snapshots.

It must not add another approval step.

It must not fake a successful platform publish.

---

## 2. Implemented files

Publisher contract:

- `lib/nanofix/socialPublisherContract.ts`

Worker:

- `app/api/system/social-scheduled-publisher-worker/route.ts`

Verification:

- `tools/verify-social-scheduled-publisher-worker.mjs`
- `package.json` script `verify:social-scheduled-publisher-worker`

---

## 3. Worker endpoint

Endpoint:

`/api/system/social-scheduled-publisher-worker`

Authorization:

- Requires `CRON_SECRET` or `NANOFIX_SYSTEM_WORKER_TOKEN` in production.
- Accepts either:
  - `Authorization: Bearer <token>`
  - `x-system-worker-token`

The worker should remain internal-only.

---

## 4. Publish conditions

The worker only selects rows from:

`social_publish_versions`

where:

- `status = scheduled`
- `scheduled_at <= now()`

Before calling a publisher service, it verifies the snapshot contains:

- `final_approval_completed_before_schedule = true`
- `publish_ready_after_schedule = true`
- `admin_review_required = true`
- `ai_auto_publish_allowed = false`

If any required flag is missing, the row is marked `failed`.

This enforces the global rule:

`final approval → schedule → wait → publish`

not:

`schedule → final approval → publish`

---

## 5. External publisher service

The worker calls an external publisher only when configured:

- `NANOFIX_SOCIAL_PUBLISHER_ENDPOINT`
- `NANOFIX_SOCIAL_PUBLISHER_TOKEN`

If `NANOFIX_SOCIAL_PUBLISHER_ENDPOINT` is not configured, the worker marks the due version as `failed` and records that it refused to fake-publish.

---

## 6. Publisher contract

Implemented validator:

`validateSocialPublisherResult()` in `lib/nanofix/socialPublisherContract.ts`

A successful publisher result must include:

- `ok: true`
- `publisher_name`
- `version_id`
- `platform`
- `external_post_id` or `external_post_url`
- `published_at`
- `platform_api_called: true`
- `final_approval_completed_before_schedule: true`
- `publish_ready_after_schedule: true`
- `ai_auto_publish_allowed: false`

If the result fails contract validation, the worker marks the version as `failed`, not `published`.

---

## 7. Result updates

On successful publisher result:

- `social_publish_versions.status = published`
- `social_publish_versions.published_at = publisher result published_at`
- `snapshot_json.publisher_result` stores the normalized publisher result
- `snapshot_json.publisher_contract_valid = true`
- `snapshot_json.platform_api_called = true`
- `snapshot_json.external_post_id` and/or `snapshot_json.external_post_url` are recorded
- `snapshot_json.final_approval_completed_before_schedule = true`
- `snapshot_json.publish_ready_after_schedule = true`
- `snapshot_json.ai_auto_publish_allowed = false`

Audit action:

`social_scheduled_publisher_published`

On failure:

- `social_publish_versions.status = failed`
- `snapshot_json.publish_worker_result` or `publish_worker_error` stores the reason
- `snapshot_json.platform_api_called = false`

Audit action:

`social_scheduled_publisher_failed`

The worker also writes:

`social_scheduled_publisher_started`

when it begins processing a due scheduled version.

---

## 8. Cron status

This worker is not automatically added to Vercel Cron yet.

Do not add it to cron until:

- platform account bindings are confirmed;
- token storage and secret references are verified;
- real external publisher endpoint is implemented and tested;
- platform-specific API compliance is reviewed.

Manual/internal calls are allowed only with the system worker token.

---

## 9. Must not regress

Future development must not:

- Add another approval stage after scheduling.
- Publish scheduled content without `final_approval_completed_before_schedule = true`.
- Publish scheduled content without `publish_ready_after_schedule = true`.
- Mark content as `published` when the external publisher endpoint is not configured.
- Mark content as `published` without an external platform post ID or URL.
- Set `ai_auto_publish_allowed` to true by default.
- Make the worker public.
- Add the worker to cron before a real publisher endpoint is configured and tested.
