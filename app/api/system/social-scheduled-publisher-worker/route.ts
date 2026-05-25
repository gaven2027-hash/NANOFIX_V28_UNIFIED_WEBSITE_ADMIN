import { createSupabaseAdminClient, auditLog } from '@/lib/supabase-server';
import { fail, ok } from '@/lib/nanofix/api';
import { validateSocialPublisherResult } from '@/lib/nanofix/socialPublisherContract';

export const dynamic = 'force-dynamic';

type VersionRow = Record<string, unknown>;

type PublishResult =
  | { ok: true; result: Record<string, unknown>; validation: ReturnType<typeof validateSocialPublisherResult> }
  | { ok: false; skipped?: boolean; error: string; details?: unknown; validation?: ReturnType<typeof validateSocialPublisherResult> };

const versionColumns = 'version_id,content_id,record_id,platform,version_no,status,snapshot_json,scheduled_at,published_at,published_by,created_at';

function authorized(request: Request) {
  const expected = process.env.CRON_SECRET || process.env.NANOFIX_SYSTEM_WORKER_TOKEN;
  if (!expected) return process.env.NODE_ENV !== 'production';
  const auth = request.headers.get('authorization') || '';
  const bearer = auth.toLowerCase().startsWith('bearer ') ? auth.slice(7).trim() : null;
  return bearer === expected || request.headers.get('x-system-worker-token') === expected;
}

function safeLimit(value: unknown) {
  const n = Number(value || 3);
  if (!Number.isFinite(n)) return 3;
  return Math.max(1, Math.min(10, Math.floor(n)));
}

function text(value: unknown, fallback = '') {
  return typeof value === 'string' ? value.trim() : fallback;
}

function getSnapshot(row: VersionRow) {
  return row.snapshot_json && typeof row.snapshot_json === 'object' ? row.snapshot_json as Record<string, unknown> : {};
}

function isPublishReady(row: VersionRow) {
  const snapshot = getSnapshot(row);
  return row.status === 'scheduled'
    && snapshot.final_approval_completed_before_schedule === true
    && snapshot.publish_ready_after_schedule === true
    && snapshot.admin_review_required === true
    && snapshot.ai_auto_publish_allowed === false;
}

function publisherEndpoint() {
  return (process.env.NANOFIX_SOCIAL_PUBLISHER_ENDPOINT || '').trim();
}

function publisherToken() {
  return (process.env.NANOFIX_SOCIAL_PUBLISHER_TOKEN || '').trim();
}

async function callPublisher(row: VersionRow): Promise<PublishResult> {
  const endpoint = publisherEndpoint();
  if (!endpoint) {
    return {
      ok: false,
      skipped: true,
      error: 'NANOFIX_SOCIAL_PUBLISHER_ENDPOINT is not configured. Worker marked this scheduled version failed instead of fake-publishing.'
    };
  }

  const snapshot = getSnapshot(row);
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(publisherToken() ? { Authorization: `Bearer ${publisherToken()}` } : {})
    },
    body: JSON.stringify({
      contract_version: 'v28.1.3-social-publisher-contract-1',
      version_id: row.version_id,
      platform: row.platform,
      scheduled_at: row.scheduled_at,
      snapshot_json: snapshot,
      required_result_fields: ['ok', 'publisher_name', 'version_id', 'platform', 'published_at', 'platform_api_called'],
      required_output_reference: 'external_post_id or external_post_url',
      final_approval_completed_before_schedule: true,
      publish_ready_after_schedule: true,
      ai_auto_publish_allowed: false
    })
  });

  const json = await response.json().catch(() => ({}));
  if (!response.ok || json.ok === false) {
    return { ok: false, error: json.error || `Publisher returned HTTP ${response.status}`, details: json };
  }

  const validation = validateSocialPublisherResult(json, String(row.version_id || ''), String(row.platform || ''));
  if (!validation.valid || !validation.normalized) {
    return { ok: false, error: 'Publisher result failed NANOFIX publisher contract validation.', details: json, validation };
  }

  return { ok: true, result: validation.normalized, validation };
}

async function markFailed(row: VersionRow, reason: string, details?: unknown) {
  const supabase = createSupabaseAdminClient();
  if (!supabase) throw new Error('Supabase server client is not configured.');
  const snapshot = getSnapshot(row);
  const nextSnapshot = {
    ...snapshot,
    publish_worker_result: details || { error: reason },
    publish_worker_error: reason,
    platform_api_called: false,
    final_approval_completed_before_schedule: true,
    publish_ready_after_schedule: true,
    admin_review_required: true,
    ai_auto_publish_allowed: false
  };
  const { data, error } = await supabase
    .from('social_publish_versions')
    .update({ status: 'failed', snapshot_json: nextSnapshot })
    .eq('version_id', row.version_id)
    .select(versionColumns)
    .single();
  if (error) throw new Error(error.message);
  await auditLog({ action: 'social_scheduled_publisher_failed', actor_role: 'system_worker', object_type: 'social_publish_version', object_id: String(row.version_id), before_data: row, after_data: data });
  return { version_id: row.version_id, status: 'failed', reason };
}

async function publishVersion(row: VersionRow) {
  const supabase = createSupabaseAdminClient();
  if (!supabase) throw new Error('Supabase server client is not configured.');
  if (!isPublishReady(row)) {
    return markFailed(row, 'scheduled version is not publish-ready: final approval before schedule flags are missing');
  }

  await auditLog({ action: 'social_scheduled_publisher_started', actor_role: 'system_worker', object_type: 'social_publish_version', object_id: String(row.version_id), before_data: row });
  const result = await callPublisher(row);

  if (!result.ok) {
    return markFailed(row, result.error, result);
  }

  const publishedAt = text(result.result.published_at, new Date().toISOString());
  const snapshot = getSnapshot(row);
  const nextSnapshot = {
    ...snapshot,
    publisher_result: result.result,
    publisher_contract_valid: true,
    platform_api_called: true,
    external_post_id: result.result.external_post_id || null,
    external_post_url: result.result.external_post_url || null,
    final_approval_completed_before_schedule: true,
    publish_ready_after_schedule: true,
    admin_review_required: true,
    ai_auto_publish_allowed: false
  };

  const { data, error } = await supabase
    .from('social_publish_versions')
    .update({ status: 'published', published_at: publishedAt, snapshot_json: nextSnapshot })
    .eq('version_id', row.version_id)
    .select(versionColumns)
    .single();
  if (error) throw new Error(error.message);
  await auditLog({ action: 'social_scheduled_publisher_published', actor_role: 'system_worker', object_type: 'social_publish_version', object_id: String(row.version_id), before_data: row, after_data: data });
  return { version_id: row.version_id, status: 'published', publisher_contract_valid: true };
}

export async function POST(request: Request) {
  if (!authorized(request)) return fail('System worker authorization required', 401);
  const supabase = createSupabaseAdminClient();
  if (!supabase) return fail('Supabase is required for scheduled social publisher worker', 503);

  const body = await request.json().catch(() => ({}));
  const limit = safeLimit((body as Record<string, unknown>).limit);
  const now = new Date().toISOString();
  const { data: rows, error } = await supabase
    .from('social_publish_versions')
    .select(versionColumns)
    .eq('status', 'scheduled')
    .lte('scheduled_at', now)
    .order('scheduled_at', { ascending: true })
    .limit(limit);
  if (error) return fail('Failed to load scheduled publish-ready versions', 500, error.message);

  const results = [];
  for (const row of rows || []) {
    try {
      results.push(await publishVersion(row));
    } catch (error) {
      results.push({ version_id: row.version_id, status: 'worker_error', error: error instanceof Error ? error.message : String(error) });
    }
  }

  return ok({ processed: results.length, results, publisher_configured: Boolean(publisherEndpoint()) });
}

export const GET = POST;
