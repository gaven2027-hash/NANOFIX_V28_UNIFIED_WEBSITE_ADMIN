import { NextResponse } from 'next/server';
import { createSupabaseAdminClient, auditLog } from '@/lib/supabase-server';
import { requireAdmin } from '@/lib/nanofix/auth';
import { buildSocialVideoRenderPlan } from '@/lib/nanofix/socialVideoRenderPlan';

export const dynamic = 'force-dynamic';

type Payload = Record<string, unknown>;

const columns = 'render_job_id,content_id,platform,render_status,render_type,title,material_pack,render_settings,output_json,error_message,admin_review_required,ai_auto_publish_allowed,requested_by,approved_by,scheduled_at,started_at,finished_at,created_at,updated_at';
const statuses = ['draft', 'queued', 'processing', 'rendered', 'failed', 'cancelled', 'approved', 'scheduled'];
const renderTypes = ['short_video', 'long_video', 'story', 'reel', 'listing_video', 'blog_embed'];

function jsonError(message: string, status = 400) {
  return NextResponse.json({ ok: false, error: message }, { status });
}

function cleanText(value: unknown, fallback = '', max = 4000) {
  return typeof value === 'string' ? value.trim().slice(0, max) : fallback;
}

function safeJson(value: unknown, fallback: Payload | unknown[] = {}) {
  if (!value) return fallback;
  if (typeof value === 'object') return value;
  if (typeof value === 'string') {
    try {
      return JSON.parse(value);
    } catch {
      return fallback;
    }
  }
  return fallback;
}

function validUuid(value: unknown) {
  return typeof value === 'string' && /^[0-9a-f-]{36}$/i.test(value);
}

function platform(value: unknown) {
  return cleanText(value, 'all', 80).toLowerCase().replace(/[^a-z0-9_ -]/g, '').replace(/\s+/g, '_').replace(/-/g, '_') || 'all';
}

function payload(body: Payload, actorId?: string) {
  const renderStatus = statuses.includes(String(body.render_status)) ? String(body.render_status) : 'draft';
  const renderType = renderTypes.includes(String(body.render_type)) ? String(body.render_type) : 'short_video';
  return {
    content_id: validUuid(body.content_id) ? body.content_id : null,
    platform: platform(body.platform),
    render_status: renderStatus,
    render_type: renderType,
    title: cleanText(body.title, 'NANOFIX Video Render Job', 500),
    material_pack: safeJson(body.material_pack, {}),
    render_settings: {
      ...(safeJson(body.render_settings, {}) as Record<string, unknown>),
      admin_review_required: true,
      ai_auto_publish_allowed: false
    },
    output_json: safeJson(body.output_json, {}),
    error_message: cleanText(body.error_message, '', 2000) || null,
    admin_review_required: true,
    ai_auto_publish_allowed: false,
    requested_by: validUuid(body.requested_by) ? body.requested_by : validUuid(actorId) ? actorId : null,
    approved_by: validUuid(body.approved_by) ? body.approved_by : null,
    scheduled_at: cleanText(body.scheduled_at, '', 80) || null,
    started_at: cleanText(body.started_at, '', 80) || null,
    finished_at: cleanText(body.finished_at, '', 80) || null,
    updated_at: new Date().toISOString()
  };
}

export async function GET(request: Request) {
  const { response } = requireAdmin(request, 'read:content');
  if (response) return response;
  const supabase = createSupabaseAdminClient();
  if (!supabase) return jsonError('Supabase server client is not configured.', 503);

  const url = new URL(request.url);
  const id = url.searchParams.get('id');
  const status = url.searchParams.get('status');
  const p = url.searchParams.get('platform');

  let query = supabase.from('social_video_render_jobs').select(columns).order('created_at', { ascending: false }).limit(100);
  if (validUuid(id)) query = query.eq('render_job_id', id);
  if (status && statuses.includes(status)) query = query.eq('render_status', status);
  if (p && p !== 'all') query = query.eq('platform', platform(p));

  const { data, error } = await query;
  if (error) return jsonError(error.message, 500);
  return NextResponse.json({ ok: true, rows: data || [], statuses, renderTypes });
}

export async function POST(request: Request) {
  const { context, response } = requireAdmin(request, 'write:content');
  if (response) return response;
  const supabase = createSupabaseAdminClient();
  if (!supabase) return jsonError('Supabase server client is not configured.', 503);

  const body = (await request.json().catch(() => ({}))) as Payload;
  const job = payload(body, context?.actorId);
  const { data, error } = await supabase.from('social_video_render_jobs').insert({ ...job, created_at: new Date().toISOString() }).select(columns).single();
  if (error) return jsonError(error.message, 500);
  await auditLog({ actor_id: context?.actorId, actor_role: context?.role, action: 'create_social_video_render_job', object_type: 'social_video_render_job', object_id: data.render_job_id, after_data: data });
  return NextResponse.json({ ok: true, row: data });
}

export async function PATCH(request: Request) {
  const { context, response } = requireAdmin(request, 'write:content');
  if (response) return response;
  const supabase = createSupabaseAdminClient();
  if (!supabase) return jsonError('Supabase server client is not configured.', 503);

  const body = (await request.json().catch(() => ({}))) as Payload;
  const id = String(body.render_job_id || body.id || '');
  if (!validUuid(id)) return jsonError('A valid render_job_id is required.');

  const { data: before, error: beforeError } = await supabase.from('social_video_render_jobs').select(columns).eq('render_job_id', id).maybeSingle();
  if (beforeError) return jsonError(beforeError.message, 500);
  if (!before) return jsonError('Render job not found.', 404);

  if (String(body.action || '') === 'generate_render_plan') {
    const plan = buildSocialVideoRenderPlan({
      platform: String(before.platform || 'all'),
      title: String(before.title || 'NANOFIX video render plan'),
      material_pack: before.material_pack,
      render_settings: before.render_settings
    });
    const nextOutput = {
      ...(before.output_json && typeof before.output_json === 'object' ? before.output_json as Record<string, unknown> : {}),
      render_plan: plan,
      render_plan_generated_at: new Date().toISOString(),
      admin_review_required: true,
      ai_auto_publish_allowed: false
    };
    const nextStatus = plan.plan_status === 'ready_for_worker' ? 'queued' : 'draft';
    const { data, error } = await supabase
      .from('social_video_render_jobs')
      .update({ output_json: nextOutput, render_status: nextStatus, updated_at: new Date().toISOString(), admin_review_required: true, ai_auto_publish_allowed: false })
      .eq('render_job_id', id)
      .select(columns)
      .single();
    if (error) return jsonError(error.message, 500);
    await auditLog({ actor_id: context?.actorId, actor_role: context?.role, action: 'generate_social_video_render_plan', object_type: 'social_video_render_job', object_id: id, before_data: before, after_data: data });
    return NextResponse.json({ ok: true, row: data, render_plan: plan });
  }

  const job = payload({ ...before, ...body }, context?.actorId);
  const { data, error } = await supabase.from('social_video_render_jobs').update(job).eq('render_job_id', id).select(columns).single();
  if (error) return jsonError(error.message, 500);
  await auditLog({ actor_id: context?.actorId, actor_role: context?.role, action: 'update_social_video_render_job', object_type: 'social_video_render_job', object_id: id, before_data: before, after_data: data });
  return NextResponse.json({ ok: true, row: data });
}
