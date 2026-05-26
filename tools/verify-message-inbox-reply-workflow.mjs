#!/usr/bin/env node
import { readFileSync, existsSync } from 'node:fs';

const checks = [];
function must(condition, label) {
  checks.push({ label, ok: Boolean(condition) });
}
function read(path) {
  if (!existsSync(path)) return '';
  return readFileSync(path, 'utf8');
}

const migration = read('supabase/migrations/20260526010100_v28_1_3_message_inbox_reply_workflow.sql');
const webhook = read('app/api/webhooks/social-messages/route.ts');
const repliesApi = read('app/api/admin/social-message-replies/route.ts');
const dispatchWorker = read('app/api/system/social-message-reply-dispatch-worker/route.ts');
const inbox = read('components/SocialMessagesWorkspace.tsx');
const dashboard = read('app/api/admin/dashboard/route.ts');
const socialMediaApi = read('app/api/admin/social-media/route.ts');
const pkg = read('package.json');

must(migration.includes('create table if not exists public.social_messages'), 'social_messages table is protected / created');
must(migration.includes('create table if not exists public.social_message_replies'), 'social_message_replies table exists');
must(migration.includes('ai_reply_suggestion'), 'AI reply suggestion column exists');
must(migration.includes('sla_due_at') && migration.includes('sla_status'), 'SLA fields exist');
must(migration.includes('dispatch_attempt_count') && migration.includes('next_retry_at'), 'reply dispatch retry fields exist');
must(migration.includes('nanofix_social_reply_guard'), 'reply dispatch guard trigger exists');
must(migration.includes('AI-generated replies require human_approved=true'), 'AI generated reply cannot dispatch without human approval');
must(migration.includes('social_messages_admin_all') && migration.includes('social_message_replies_admin_all'), 'admin RLS policies exist');
must(webhook.includes('NANOFIX_SOCIAL_WEBHOOK_SECRET') && webhook.includes('x-nanofix-webhook-secret'), 'webhook secret guard exists');
must(webhook.includes('buildAiSuggestion') && webhook.includes('ai_auto_reply_allowed: false'), 'webhook creates advisory AI suggestion only');
must(webhook.includes('duplicate: true') && webhook.includes('external_message_id'), 'webhook idempotency guard exists');
must(repliesApi.includes("requireAdmin(request, 'write:content')"), 'reply API requires admin write permission');
must(repliesApi.includes('human_approved') && repliesApi.includes('ai_auto_reply_allowed: false'), 'reply API preserves human approval rule');
must(dispatchWorker.includes('NANOFIX_SYSTEM_WORKER_TOKEN') && dispatchWorker.includes('CRON_SECRET'), 'dispatch worker uses system worker authorization');
must(dispatchWorker.includes("eq('dispatch_status', 'queued')") && dispatchWorker.includes("eq('human_approved', true)"), 'dispatch worker only sends approved queued replies');
must(dispatchWorker.includes('social_accounts') && dispatchWorker.includes("connection_status', 'connected'"), 'dispatch worker requires connected social account binding');
must(dispatchWorker.includes('nextRetryIso') && dispatchWorker.includes('dispatch_attempt_count'), 'dispatch worker handles retry delay and attempt count');
must(dispatchWorker.includes('ai_auto_reply_allowed: false') && dispatchWorker.includes('human_approved: true'), 'dispatch worker sends human-approved payload only');
must(inbox.includes('Reply Workflow / 回复流程') && inbox.includes('AI Draft + Human Approval'), 'inbox UI includes reply workflow panel');
must(inbox.includes('SLA / 时效') && inbox.includes('risk_score_percent'), 'inbox UI displays SLA and risk score');
must(dashboard.includes('High Risk Messages') && dashboard.includes('Channel Messages'), 'dashboard KPIs include message risk and channel messages');
must(socialMediaApi.includes('reply_status') && socialMediaApi.includes('ai_reply_suggestion'), 'social media API exposes enhanced message fields');
must(pkg.includes('verify:message-inbox'), 'package script includes verify:message-inbox');
must(pkg.includes('verify:message-inbox') && pkg.includes('validate:predeploy'), 'predeploy includes message inbox validation');

const failed = checks.filter((item) => !item.ok);
for (const item of checks) {
  console.log(`${item.ok ? '✅' : '❌'} ${item.label}`);
}
if (failed.length) {
  console.error(`\nMessage inbox workflow validation failed: ${failed.length} check(s).`);
  process.exit(1);
}
console.log('\nMessage inbox reply workflow validation passed.');
