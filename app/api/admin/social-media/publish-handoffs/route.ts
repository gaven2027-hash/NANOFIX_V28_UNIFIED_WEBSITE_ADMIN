import { NextResponse } from 'next/server';
import { createSupabaseAdminClient, auditLog } from '@/lib/supabase-server';
import { requireAdmin } from '@/lib/nanofix/auth';

export const dynamic = 'force-dynamic';

type Payload = Record<string, unknown>;

const handoffColumns = 'handoff_id,version_id,render_job_id,content_id,platform,handoff_status,scheduled_at,platform_payload,snapshot_json,safety_json,final_review_notes,external_post_id,external_post_url,approved_by,created_by,created_at,updated_at';
const versionColumns = 'version_id,content_id,record_id,platform,version_no,status,snapshot_json,scheduled_at,published_at,published_by,created_at';
const renderColumns = 'render_job_id,content_id,platform,render_status,render_type,title,output_json,scheduled_at,updated_at';
const handoffStatuses = ['pending_final_approval','approved_for_manual_publish','manual_publish_required','published_recorded','rejected','cancelled','failed'];

function jsonError(message: string, status = 400) {
  return NextResponse.json({ ok: false, error: message }, { status });
}

function text(value: unknown, fallback = '', max = 4000) {
  return typeof value === 'string' ? value.trim().slice(0, max) : fallback;
}

function validUuid(value: unknown) {
  return typeof value === 'string' && /^[0-9a-f-]{36}$/i.test(value);
}

function safeJson(value: unknown, fallback: Payload = {}) {
  if (!value) return fallback;
  if (typeof value === 'object') return value as Payload;
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return parsed && typeof parsed === 'object' ? parsed as Payload : fallback;
    } catch {
      return fallback;
    }
  }
  return fallback;
}

function cleanPlatform(value: unknown) {
  return text(value, 'general', 80).toLowerCase().replace(/[^a-z0-9_ -]/g, '').replace(/\s+/g, '_').replace(/-/g, '_') || 'general';
}

function safetyJson(extra: Payload = {}) {
  return {
    ...extra,
    admin_review_required: true,
    ai_auto_publish_allowed: false,
    platform_api_called: false,
    publish_requires_separate_admin_action: true
  };
}

function getSnapshot(version: Payload) {
  return safeJson(version.snapshot_json, {});
}

function hasApprovedRenderedVideoSnapshot(version: Payload) {
  const snapshot = getSnapshot(version);
  const rendererResult = safeJson(snapshot.renderer_result, {});
  const review = safeJson(snapshot.rendered_output_review, {});
  const outputRef = text(rendererResult.output_video_url, '', 2000) || text(rendererResult.output_storage_path, '', 2000);
  return version.status === 'scheduled'
    && snapshot.source === 'approved_rendered_social_video_output'
    && snapshot.publish_requires_separate_admin_action === true
    && snapshot.ai_auto_publish_allowed === false
    && snapshot.admin_review_required === true
    && review.status === 'approved'
    && !!outputRef;
}

function platformPayloadFromSnapshot(version: Payload) {
  const snapshot = getSnapshot(version);
  const rendererResult = safeJson(snapshot.renderer_result, {});
  return {
    platform: cleanPlatform(version.platform || snapshot.platform),
    title: text(snapshot.title, 'NANOFIX rendered social video', 500),
    render_type: text(snapshot.render_type, 'short_video', 80),
    output_video_url: text(rendererResult.output_video_url, '', 2000) || null,
    output_storage_path: text(rendererResult.output_storage_path, '', 2000) || null,
    output_mime_type: text(rendererResult.output_mime_type, 'video/mp4', 120),
    thumbnail_url: text(rendererResult.thumbnail_url, '', 2000) || null,
    thumbnail_storage_path: text(rendererResult.thumbnail_storage_path, '', 2000) || null,
    checksum_sha256: text(rendererResult.checksum_sha256, '', 200) || null,
    caption_source: 'approved_rendered_video_snapshot',
    admin_review_required: true,
    ai_auto_publish_allowed: false,
    platform_api_called: false
  };
}

async function readVersion(versionId: string) {
  const supabase = createSupabaseAdminClient();
  if (!supabase) return { data: null, error: 'Supabase server client is not configured.' };
  const { data, error } = await supabase.from('social_publish_versions').select(versionColumns).eq('version_id', versionId).maybeSingle();
  return { data, error: error?.message || null };
}

export async function GET(request: Request) {
  const { response } = requireAdmin(request, 'read:content');
  if (response) return response;
  const supabase = createSupabaseAdminClient();
  if (!supabase) return jsonError('Supabase server client is not configured.', 503);

  const url = new URL(request.url);
  const id = url.searchParams.get('id');
  const versionId = url.searchParams.get('version_id');
  const status = url.searchParams.get('status');
  const platform = url.searchParams.get('platform');

  let query = supabase.from('social_platform_publish_handoffs').select(handoffColumns).order('created_at', { ascending: false }).limit(100);
  if (validUuid(id)) query = query.eq('handoff_id', id);
  if (validUuid(versionId)) query = query.eq('version_id', versionId);
  if (status && handoffStatuses.includes(status)) query = query.eq('handoff_status', status);
  if (platform && platform !== 'all') query = query.eq('platform', cleanPlatform(platform));

  const { data, error } = await query;
  if (error) return jsonError(error.message, 500);
  return NextResponse.json({ ok: true, rows: data || [], handoffStatuses });
}

export async function POST(request: Request) {
  const { context, response } = requireAdmin(request, 'write:content');
  if (response) return response;
  const supabase = createSupabaseAdminClient();
  if (!supabase) return jsonError('Supabase server client is not configured.', 503);

  const body = (await request.json().catch(() => ({}))) as Payload;
  const action = String(body.action || '');

  if (action === 'create_from_schedule_snapshot') {
    const versionId = String(body.version_id || '');
    if (!validUuid(versionId)) return jsonError('A valid version_id is required.');
    const { data: version, error: versionError } = await readVersion(versionId);
    if (versionError) return jsonError(versionError, 500);
    if (!version) return jsonError('Scheduled snapshot not found.', 404);
    if (!hasApprovedRenderedVideoSnapshot(version)) return jsonError('Only approved rendered video scheduled snapshots can create final publish handoffs.', 409);

    const snapshot = getSnapshot(version);
    const renderJobId = String(snapshot.render_job_id || '');

    const { data: existing, error: existingError } = await supabase
      .from('social_platform_publish_handoffs')
      .select(handoffColumns)
      .eq('version_id', versionId)
      .maybeSingle();
    if (existingError) return jsonError(existingError.message, 500);
    if (existing) return NextResponse.json({ ok: true, row: existing, deduped: true });

    const payload = {
      version_id: versionId,
      render_job_id: validUuid(renderJobId) ? renderJobId : null,
      content_id: validUuid(version.content_id) ? version.content_id : null,
      platform: cleanPlatform(version.platform || snapshot.platform),
      handoff_status: 'pending_final_approval',
      scheduled_at: version.scheduled_at || null,
      platform_payload: platformPayloadFromSnapshot(version),
      snapshot_json: snapshot,
      safety_json: safetyJson({ source: 'approved_rendered_social_video_schedule_snapshot' }),
      final_review_notes: text(body.final_review_notes, '', 2000) || null,
      created_by: validUuid(context?.actorId) ? context?.actorId : null,
      updated_at: new Date().toISOString()
    };
    const { data, error } = await supabase.from('social_platform_publish_handoffs').insert(payload).select(handoffColumns).single();
    if (error) return jsonError(error.message, 500);
    await auditLog({ actor_id: context?.actorId, actor_role: context?.role, action: 'create_social_platform_publish_handoff', object_type: 'social_platform_publish_handoff', object_id: data.handoff_id, after_data: data });
    return NextResponse.json({ ok: true, row: data });
  }

  return jsonError('Unsupported action.', 400);
}

export async function PATCH(request: Request) {
  const { context, response } = requireAdmin(request, 'write:content');
  if (response) return response;
  const supabase = createSupabaseAdminClient();
  if (!supabase) return jsonError('Supabase server client is not configured.', 503);

  const body = (await request.json().catch(() => ({}))) as Payload;
  const id = String(body.handoff_id || body.id || '');
  if (!validUuid(id)) return jsonError('A valid handoff_id is required.');

  const { data: before, error: beforeError } = await supabase.from('social_platform_publish_handoffs').select(handoffColumns).eq('handoff_id', id).maybeSingle();
  if (beforeError) return jsonError(beforeError.message, 500);
  if (!before) return jsonError('Publish handoff not found.', 404);

  const action = String(body.action || '');
  const now = new Date().toISOString();

  if (action === 'approve_for_manual_publish') {
    if (before.handoff_status !== 'pending_final_approval') return jsonError('Only pending_final_approval handoffs can be approved for manual publishing.', 409);
    const { data, error } = await supabase
      .from('social_platform_publish_handoffs')
      .update({
        handoff_status: 'approved_for_manual_publish',
        approved_by: validUuid(context?.actorId) ? context?.actorId : null,
        final_review_notes: text(body.final_review_notes, '', 2000) || before.final_review_notes || null,
        safety_json: safetyJson({ ...(safeJson(before.safety_json, {})), final_admin_approved_at: now, platform_api_called: false }),
        updated_at: now
      })
      .eq('handoff_id', id)
      .select(handoffColumns)
      .single();
    if (error) return jsonError(error.message, 500);
    await auditLog({ actor_id: context?.actorId, actor_role: context?.role, action: 'approve_social_platform_publish_handoff', object_type: 'social_platform_publish_handoff', object_id: id, before_data: before, after_data: data });
    return NextResponse.json({ ok: true, row: data });
  }

  if (action === 'mark_manual_publish_required') {
    if (!['pending_final_approval','approved_for_manual_publish'].includes(String(before.handoff_status))) return jsonError('Only pending or approved handoffs can be marked manual_publish_required.', 409);
    const { data, error } = await supabase
      .from('social_platform_publish_handoffs')
      .update({
        handoff_status: 'manual_publish_required',
        final_review_notes: text(body.final_review_notes, 'Manual publishing required by admin.', 2000),
        safety_json: safetyJson({ ...(safeJson(before.safety_json, {})), manual_publish_required_at: now, platform_api_called: false }),
        updated_at: now
      })
      .eq('handoff_id', id)
      .select(handoffColumns)
      .single();
    if (error) return jsonError(error.message, 500);
    await auditLog({ actor_id: context?.actorId, actor_role: context?.role, action: 'mark_social_platform_manual_publish_required', object_type: 'social_platform_publish_handoff', object_id: id, before_data: before, after_data: data });
    return NextResponse.json({ ok: true, row: data });
  }

  if (action === 'record_manual_publish') {
    if (!['approved_for_manual_publish','manual_publish_required'].includes(String(before.handoff_status))) return jsonError('Manual publish can only be recorded after final approval/manual-publish handoff.', 409);
    const externalPostId = text(body.external_post_id, '', 500);
    const externalPostUrl = text(body.external_post_url, '', 2000);
    if (!externalPostId && !externalPostUrl) return jsonError('Provide external_post_id or external_post_url to record manual publish.', 400);
    const { data, error } = await supabase
      .from('social_platform_publish_handoffs')
      .update({
        handoff_status: 'published_recorded',
        external_post_id: externalPostId || null,
        external_post_url: externalPostUrl || null,
        final_review_notes: text(body.final_review_notes, before.final_review_notes || '', 2000) || null,
        safety_json: safetyJson({ ...(safeJson(before.safety_json, {})), manual_publish_recorded_at: now, platform_api_called: false, external_post_recorded: true }),
        updated_at: now
      })
      .eq('handoff_id', id)
      .select(handoffColumns)
      .single();
    if (error) return jsonError(error.message, 500);
    await auditLog({ actor_id: context?.actorId, actor_role: context?.role, action: 'record_social_platform_manual_publish', object_type: 'social_platform_publish_handoff', object_id: id, before_data: before, after_data: data });
    return NextResponse.json({ ok: true, row: data });
  }

  if (action === 'reject' || action === 'cancel') {
    const nextStatus = action === 'reject' ? 'rejected' : 'cancelled';
    const { data, error } = await supabase
      .from('social_platform_publish_handoffs')
      .update({
        handoff_status: nextStatus,
        final_review_notes: text(body.final_review_notes, `${nextStatus} by admin.`, 2000),
        safety_json: safetyJson({ ...(safeJson(before.safety_json, {})), final_status_at: now, platform_api_called: false }),
        updated_at: now
      })
      .eq('handoff_id', id)
      .select(handoffColumns)
      .single();
    if (error) return jsonError(error.message, 500);
    await auditLog({ actor_id: context?.actorId, actor_role: context?.role, action: `${nextStatus}_social_platform_publish_handoff`, object_type: 'social_platform_publish_handoff', object_id: id, before_data: before, after_data: data });
    return NextResponse.json({ ok: true, row: data });
  }

  return jsonError('Unsupported action.', 400);
}
