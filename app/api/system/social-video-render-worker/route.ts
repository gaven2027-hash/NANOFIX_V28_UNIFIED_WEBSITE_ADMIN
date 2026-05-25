import { createSupabaseAdminClient, auditLog } from '@/lib/supabase-server';
import { fail, ok } from '@/lib/nanofix/api';

export const dynamic = 'force-dynamic';

type RenderJob = Record<string, unknown>;

const columns = 'render_job_id,content_id,platform,render_status,render_type,title,material_pack,render_settings,output_json,error_message,admin_review_required,ai_auto_publish_allowed,requested_by,approved_by,scheduled_at,started_at,finished_at,created_at,updated_at';

function authorized(request: Request) {
  const expected = process.env.CRON_SECRET || process.env.NANOFIX_SYSTEM_WORKER_TOKEN;
  if (!expected) return process.env.NODE_ENV !== 'production';
  const auth = request.headers.get('authorization') || '';
  const bearer = auth.toLowerCase().startsWith('bearer ') ? auth.slice(7).trim() : null;
  return bearer === expected || request.headers.get('x-system-worker-token') === expected;
}

function safeLimit(value: unknown) {
  const n = Number(value || 1);
  if (!Number.isFinite(n)) return 1;
  return Math.max(1, Math.min(5, Math.floor(n)));
}

function getOutput(job: RenderJob) {
  return job.output_json && typeof job.output_json === 'object' ? job.output_json as Record<string, unknown> : {};
}

function hasRenderPlan(job: RenderJob) {
  const output = getOutput(job);
  return !!(output.render_plan && typeof output.render_plan === 'object');
}

function rendererEndpoint() {
  return (process.env.NANOFIX_VIDEO_RENDERER_ENDPOINT || '').trim();
}

function rendererToken() {
  return (process.env.NANOFIX_VIDEO_RENDERER_TOKEN || '').trim();
}

async function callRenderer(job: RenderJob) {
  const endpoint = rendererEndpoint();
  if (!endpoint) {
    return {
      ok: false,
      skipped: true,
      error: 'NANOFIX_VIDEO_RENDERER_ENDPOINT is not configured. Worker marked this job failed instead of fake-rendering a video.'
    };
  }

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(rendererToken() ? { Authorization: `Bearer ${rendererToken()}` } : {})
    },
    body: JSON.stringify({
      render_job_id: job.render_job_id,
      platform: job.platform,
      render_type: job.render_type,
      title: job.title,
      material_pack: job.material_pack,
      render_settings: job.render_settings,
      output_json: job.output_json,
      admin_review_required: true,
      ai_auto_publish_allowed: false
    })
  });

  const json = await response.json().catch(() => ({}));
  if (!response.ok || json.ok === false) {
    return { ok: false, error: json.error || `Renderer returned HTTP ${response.status}`, details: json };
  }
  return { ok: true, result: json };
}

async function processJob(job: RenderJob) {
  const supabase = createSupabaseAdminClient();
  if (!supabase) throw new Error('Supabase server client is not configured.');
  const id = String(job.render_job_id || '');
  const now = new Date().toISOString();

  if (!hasRenderPlan(job)) {
    const output = getOutput(job);
    const { data, error } = await supabase
      .from('social_video_render_jobs')
      .update({
        render_status: 'failed',
        error_message: 'Render plan is missing. Generate render_plan before running the worker.',
        output_json: { ...output, worker_error: 'missing_render_plan', ai_auto_publish_allowed: false, admin_review_required: true },
        finished_at: now,
        updated_at: now,
        admin_review_required: true,
        ai_auto_publish_allowed: false
      })
      .eq('render_job_id', id)
      .select(columns)
      .single();
    if (error) throw new Error(error.message);
    await auditLog({ action: 'social_video_render_worker_failed_missing_plan', actor_role: 'system_worker', object_type: 'social_video_render_job', object_id: id, before_data: job, after_data: data });
    return { render_job_id: id, status: 'failed', reason: 'missing_render_plan' };
  }

  const { data: processing, error: processingError } = await supabase
    .from('social_video_render_jobs')
    .update({ render_status: 'processing', started_at: now, updated_at: now, admin_review_required: true, ai_auto_publish_allowed: false })
    .eq('render_job_id', id)
    .eq('render_status', 'queued')
    .select(columns)
    .maybeSingle();
  if (processingError) throw new Error(processingError.message);
  if (!processing) return { render_job_id: id, status: 'skipped', reason: 'job_was_not_queued' };

  await auditLog({ action: 'social_video_render_worker_started', actor_role: 'system_worker', object_type: 'social_video_render_job', object_id: id, before_data: job, after_data: processing });

  const rendered = await callRenderer(processing);
  const finishedAt = new Date().toISOString();
  const previousOutput = getOutput(processing);

  if (!rendered.ok) {
    const { data, error } = await supabase
      .from('social_video_render_jobs')
      .update({
        render_status: 'failed',
        error_message: String(rendered.error || 'Renderer failed.'),
        output_json: {
          ...previousOutput,
          worker_result: rendered,
          renderer_configured: !rendered.skipped,
          ai_auto_publish_allowed: false,
          admin_review_required: true
        },
        finished_at: finishedAt,
        updated_at: finishedAt,
        admin_review_required: true,
        ai_auto_publish_allowed: false
      })
      .eq('render_job_id', id)
      .select(columns)
      .single();
    if (error) throw new Error(error.message);
    await auditLog({ action: 'social_video_render_worker_failed', actor_role: 'system_worker', object_type: 'social_video_render_job', object_id: id, before_data: processing, after_data: data });
    return { render_job_id: id, status: 'failed', reason: rendered.error, renderer_configured: !rendered.skipped };
  }

  const { data, error } = await supabase
    .from('social_video_render_jobs')
    .update({
      render_status: 'rendered',
      output_json: {
        ...previousOutput,
        renderer_result: rendered.result,
        rendered_at: finishedAt,
        ai_auto_publish_allowed: false,
        admin_review_required: true
      },
      error_message: null,
      finished_at: finishedAt,
      updated_at: finishedAt,
      admin_review_required: true,
      ai_auto_publish_allowed: false
    })
    .eq('render_job_id', id)
    .select(columns)
    .single();
  if (error) throw new Error(error.message);
  await auditLog({ action: 'social_video_render_worker_rendered', actor_role: 'system_worker', object_type: 'social_video_render_job', object_id: id, before_data: processing, after_data: data });
  return { render_job_id: id, status: 'rendered' };
}

export async function POST(request: Request) {
  if (!authorized(request)) return fail('System worker authorization required', 401);
  const supabase = createSupabaseAdminClient();
  if (!supabase) return fail('Supabase is required for social video render worker', 503);

  const body = await request.json().catch(() => ({}));
  const limit = safeLimit((body as Record<string, unknown>).limit);
  const { data: jobs, error } = await supabase
    .from('social_video_render_jobs')
    .select(columns)
    .eq('render_status', 'queued')
    .order('created_at', { ascending: true })
    .limit(limit);
  if (error) return fail('Failed to load queued render jobs', 500, error.message);

  const results = [];
  for (const job of jobs || []) {
    try {
      results.push(await processJob(job));
    } catch (error) {
      results.push({ render_job_id: job.render_job_id, status: 'worker_error', error: error instanceof Error ? error.message : String(error) });
    }
  }

  return ok({ processed: results.length, results, renderer_configured: Boolean(rendererEndpoint()) });
}

export const GET = POST;
