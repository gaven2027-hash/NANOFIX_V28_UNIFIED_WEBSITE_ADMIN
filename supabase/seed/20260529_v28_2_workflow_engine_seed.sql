-- NANOFIX V28.2 Workflow Engine seed data
-- Date: 2026-05-29
-- Scope: Automation & Notification Engine -> Internal Inbox -> Unified Task Engine
-- Safe sample records for local/staging verification. Do not use demo records as production business evidence.

-- 1) Default automation rules
insert into public.automation_rules (
  rule_id,
  rule_key,
  name,
  module,
  trigger_event,
  conditions_json,
  channels,
  target_roles,
  is_enabled,
  priority
)
values
  (
    '28020000-0000-0000-0000-000000000001',
    'service_request.created.p0_triage',
    'New P0 repair request triage',
    'service_operations',
    'service_request.created',
    '{"priority":["P0"],"binding_status":["pending","linked"],"requires_human_review":true}'::jsonb,
    array['internal','email']::text[],
    array['operations_admin','support','super_admin']::text[],
    true,
    'P0'
  ),
  (
    '28020000-0000-0000-0000-000000000002',
    'quotation.approval.overdue',
    'Quotation approval overdue escalation',
    'service_operations',
    'quotation.approval_overdue',
    '{"overdue_hours":24,"requires_super_admin_takeover":true}'::jsonb,
    array['internal']::text[],
    array['operations_admin','super_admin']::text[],
    true,
    'P1'
  ),
  (
    '28020000-0000-0000-0000-000000000003',
    'review.privacy.redaction_required',
    'Customer review privacy redaction required',
    'customer_center',
    'review.redaction_required',
    '{"contains_personal_data":true,"public_display_blocked_until_approved":true}'::jsonb,
    array['internal']::text[],
    array['content_admin','support','super_admin']::text[],
    true,
    'P1'
  ),
  (
    '28020000-0000-0000-0000-000000000004',
    'payment.mismatch.finance_review',
    'Payment mismatch finance review',
    'finance',
    'payment.mismatch_detected',
    '{"requires_reconciliation":true,"customer_visible":false}'::jsonb,
    array['internal','email']::text[],
    array['finance','super_admin']::text[],
    true,
    'P1'
  )
on conflict (rule_key) do update set
  name = excluded.name,
  module = excluded.module,
  trigger_event = excluded.trigger_event,
  conditions_json = excluded.conditions_json,
  channels = excluded.channels,
  target_roles = excluded.target_roles,
  is_enabled = excluded.is_enabled,
  priority = excluded.priority,
  updated_at = now();

-- 2) Default unified tasks
insert into public.unified_tasks (
  task_id,
  source_module,
  source_table,
  source_id,
  title,
  description,
  status,
  priority,
  assignee_role,
  due_at,
  sla_minutes,
  metadata_json
)
values
  (
    '28021000-0000-0000-0000-000000000001',
    'service_operations',
    'service_requests',
    '40000000-0000-0000-0000-000000000001',
    'Triage urgent ceiling leak request',
    'Demo P0 task generated from website no-login repair request. Assign operations owner and schedule inspection.',
    'open',
    'P0',
    'operations_admin',
    now() + interval '2 hours',
    120,
    '{"demo":true,"stage":"v28.2","customer_visible":false}'::jsonb
  ),
  (
    '28021000-0000-0000-0000-000000000002',
    'finance',
    'payments',
    'demo-payment-mismatch-001',
    'Review payment mismatch before receipt issue',
    'Demo finance task for payment amount mismatch. Finance must reconcile before receipt is visible to customer.',
    'review',
    'P1',
    'finance',
    now() + interval '1 day',
    1440,
    '{"demo":true,"stage":"v28.2","requires_reconciliation":true}'::jsonb
  ),
  (
    '28021000-0000-0000-0000-000000000003',
    'customer_center',
    'customer_reviews',
    'demo-review-redaction-001',
    'Redact customer review before public display',
    'Demo customer review includes unit number. Content admin/support must redact before website carousel display.',
    'in_progress',
    'P1',
    'content_admin',
    now() + interval '8 hours',
    480,
    '{"demo":true,"stage":"v28.2","privacy_redaction_required":true}'::jsonb
  )
on conflict (task_id) do update set
  source_module = excluded.source_module,
  source_table = excluded.source_table,
  source_id = excluded.source_id,
  title = excluded.title,
  description = excluded.description,
  status = excluded.status,
  priority = excluded.priority,
  assignee_role = excluded.assignee_role,
  due_at = excluded.due_at,
  sla_minutes = excluded.sla_minutes,
  metadata_json = excluded.metadata_json,
  updated_at = now();

-- 3) Internal inbox messages linked to tasks
insert into public.internal_inbox_messages (
  message_id,
  recipient_role,
  subject,
  body,
  category,
  priority,
  related_object_type,
  related_object_id,
  task_id
)
values
  (
    '28022000-0000-0000-0000-000000000001',
    'operations_admin',
    'P0 repair request needs triage',
    'Demo internal inbox message: new urgent ceiling leak request requires assignment and inspection scheduling.',
    'service_request',
    'P0',
    'service_requests',
    '40000000-0000-0000-0000-000000000001',
    '28021000-0000-0000-0000-000000000001'
  ),
  (
    '28022000-0000-0000-0000-000000000002',
    'finance',
    'Payment mismatch requires finance review',
    'Demo internal inbox message: payment amount mismatch blocks receipt issue until reconciliation is complete.',
    'finance',
    'P1',
    'payments',
    'demo-payment-mismatch-001',
    '28021000-0000-0000-0000-000000000002'
  ),
  (
    '28022000-0000-0000-0000-000000000003',
    'content_admin',
    'Review privacy redaction required',
    'Demo internal inbox message: review media contains unit number; redact before public website display.',
    'review_privacy',
    'P1',
    'customer_reviews',
    'demo-review-redaction-001',
    '28021000-0000-0000-0000-000000000003'
  )
on conflict (message_id) do update set
  recipient_role = excluded.recipient_role,
  subject = excluded.subject,
  body = excluded.body,
  category = excluded.category,
  priority = excluded.priority,
  related_object_type = excluded.related_object_type,
  related_object_id = excluded.related_object_id,
  task_id = excluded.task_id,
  archived_at = null,
  updated_at = now();

-- 4) Notification outbox examples
insert into public.notification_outbox (
  notification_id,
  rule_id,
  channel,
  target_role,
  subject,
  body,
  payload_json,
  delivery_status,
  scheduled_at,
  attempt_count,
  related_object_type,
  related_object_id
)
values
  (
    '28023000-0000-0000-0000-000000000001',
    '28020000-0000-0000-0000-000000000001',
    'internal',
    'operations_admin',
    'Queued: urgent repair triage',
    'Demo queued internal notification for urgent repair request triage.',
    '{"demo":true,"stage":"v28.2","task_id":"28021000-0000-0000-0000-000000000001"}'::jsonb,
    'queued',
    now(),
    0,
    'unified_tasks',
    '28021000-0000-0000-0000-000000000001'
  ),
  (
    '28023000-0000-0000-0000-000000000002',
    '28020000-0000-0000-0000-000000000004',
    'internal',
    'finance',
    'Queued: payment mismatch review',
    'Demo queued finance notification for payment mismatch reconciliation.',
    '{"demo":true,"stage":"v28.2","task_id":"28021000-0000-0000-0000-000000000002"}'::jsonb,
    'queued',
    now(),
    0,
    'unified_tasks',
    '28021000-0000-0000-0000-000000000002'
  ),
  (
    '28023000-0000-0000-0000-000000000003',
    '28020000-0000-0000-0000-000000000003',
    'internal',
    'content_admin',
    'Queued: review redaction required',
    'Demo queued content-admin notification for review privacy redaction.',
    '{"demo":true,"stage":"v28.2","task_id":"28021000-0000-0000-0000-000000000003"}'::jsonb,
    'queued',
    now(),
    0,
    'unified_tasks',
    '28021000-0000-0000-0000-000000000003'
  )
on conflict (notification_id) do update set
  rule_id = excluded.rule_id,
  channel = excluded.channel,
  target_role = excluded.target_role,
  subject = excluded.subject,
  body = excluded.body,
  payload_json = excluded.payload_json,
  delivery_status = excluded.delivery_status,
  scheduled_at = excluded.scheduled_at,
  attempt_count = excluded.attempt_count,
  related_object_type = excluded.related_object_type,
  related_object_id = excluded.related_object_id,
  updated_at = now();

-- 5) Task event examples for audit-like timeline display
insert into public.task_events (
  event_id,
  task_id,
  action,
  before_json,
  after_json
)
values
  (
    '28024000-0000-0000-0000-000000000001',
    '28021000-0000-0000-0000-000000000001',
    'seed_created',
    null,
    '{"status":"open","priority":"P0","assignee_role":"operations_admin"}'::jsonb
  ),
  (
    '28024000-0000-0000-0000-000000000002',
    '28021000-0000-0000-0000-000000000002',
    'seed_created',
    null,
    '{"status":"review","priority":"P1","assignee_role":"finance"}'::jsonb
  ),
  (
    '28024000-0000-0000-0000-000000000003',
    '28021000-0000-0000-0000-000000000003',
    'seed_created',
    null,
    '{"status":"in_progress","priority":"P1","assignee_role":"content_admin"}'::jsonb
  )
on conflict (event_id) do update set
  action = excluded.action,
  before_json = excluded.before_json,
  after_json = excluded.after_json;
