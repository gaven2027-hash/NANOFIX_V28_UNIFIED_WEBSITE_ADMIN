import { createSupabaseAdminClient, auditLog } from '@/lib/supabase-server';
import { fail, ok } from '@/lib/nanofix/api';
import { validateSocialVideoRendererResult } from '@/lib/nanofix/socialVideoRendererContract';
import { getRendererEndpointForProvider } from '@/lib/nanofix/socialVideoRendererProviders';

export const dynamic = 'force-dynamic';

type RenderJob = Record<string, unknown>;

type RendererCallResult =
  | { ok: true; result: Record<string, unknown>; validation: ReturnType<typeof validateSocialVideoRendererResult> }
  | { ok: false; skipped?: boolean; error: string; details?: unknown; validation?: ReturnType<typeof validateSocialVideoRendererResult> };

const columns = 'render_job_id,content_id,platform,render_status,render_type,renderer_provider,renderer_template_id,renderer_model,renderer_endpoint_key,renderer_cost_estimate,title,material_pack,render_settings,output_json,error_message,admin_review_required,ai_auto_publish_allowed,requested_by,approved_by,scheduled_at,started_at,finished_at,created_at,updated_at';

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

function getRenderSettings(job: RenderJob) {
  return job.render_settings && typeof job.render_settings === 'object' ? job.render_settings as Record<string, unknown> : {};
}

async function callRenderer(job: RenderJob): Promise<RendererCallResult> {
  const providerMeta = getRendererEndpointForProvider(job.renderer_provider);
  const { provider, endpoint, token } = providerMeta;

  if (provider.key === 'manual_final_video_upload') {
    return {
      ok: false,
      skipped: true,
      error: 'Manual Final Video Upload was selected. Worker must not call an external renderer. Upload the final edited video and complete review manually.',
      details: { renderer_provider: provider.key, renderer_provider_note: provider.short_note, renderer_provider_note_zh: provider.short_note_zh }
    };
  }

  if (!endpoint) {
    return {
      ok: false,
      skipped: true,
      error: `${provider.endpoint_env || 'Selected renderer endpoint'} is not configured for ${provider.label}. Worker marked this job failed instead of fake-rendering a video.`,
      details: { renderer_provider: provider.key, renderer_provider_note: provider.short_note, renderer_provider_note_zh: provider.short_note_zh, endpoint_env: provider.endpoint_env }
    };
  }

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: JSON.stringify({
      contract_version: 'v28.1.3-renderer-contract-1',
      render_job_id: job.render_job_id,
      platform: job.platform,
      render_type: job.render_type,
      renderer_provider: provider.key,
      renderer_provider_label: provider.label,
      renderer_provider_note: provider.short_note,
      renderer_provider_note_zh: provider.short_note_zh,
      renderer_template_id: job.renderer_template_id || getRenderSettings(job).renderer_template_id || null,
      renderer_model: job.renderer_model || getRenderSettings(job).renderer_model || null,
      renderer_endpoint_key: job.renderer_endpoint_key || provider.endpoint_env || null,
      renderer_cost_estimate: job.renderer_cost_estimate || getRenderSettings(job).renderer_cost_estimate || null,
      title: job.title,
      material_pack: job.material_pack,
      render_settings: job.render_settings,
      output_json: job.output_json,
      required_result_fields: ['ok', 'renderer_name', 'render_job_id', 'output_mime_type', 'rendered_at'],
      required_output_reference: 'output_video_url or output_storage_path',
      admin_review_required: true,
      ai_auto_publish_allowed: false
    })
  });

  const json = await response.json().catch(() => ({}));
  if (!response.ok || json.ok === false) {
    return { ok: false, error: json.error || `Renderer returned HTTP ${response.status}`, details: json };
  }

  const validation = validateSocialVideoRendererResult(json, String(job.render_job_id || ''));
  if (!validation.valid || !validation.normalized) {
    return { ok: false, error: 'Renderer result failed NANOFIX renderer contract validation.', details: json, validation };
  }

  return { ok: true, result: { ...validation.normalized, renderer_provider: provider.key, renderer_provider_note: provider.short_note, renderer_provider_note_zh: provider.short_note_zh }, validation };
}

async function processJob(job: RenderJob) {
  const supabase = createSupabaseAdminClient();
  if (!supabase) throw new Error('Supabase server client is not configured.');
  const id = String(job.render_job_id || '');
  const now = new Date().toISOString();
  const provider = getRendererEndpointForProvider(job.renderer_provider).provider;

  if (!hasRenderPlan(job)) {
    const output = getOutput(job);
    const { data, error } = await supabase
      .from('social_video_render_jobs')
      .update({
        render_status: 'failed',
        error_message: 'Render plan is missing. Generate render_plan before running the worker.',
        output_json: { ...output, worker_error: 'missing_render_plan', renderer_provider: provider.key, renderer_provider_note: provider.short_note, renderer_provider_note_zh: provider.short_note_zh, ai_auto_publish_allowed: false, admin_review_required: true },
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
    return { render_job_id: id, status: 'failed', reason: 'missing_render_plan', renderer_provider: provider.key };
  }

  const { data: processing, error: processingError } = await supabase
    .from('social_video_render_jobs')
    .update({ render_status: 'processing', started_at: now, updated_at: now, admin_review_required: true, ai_auto_publish_allowed: false })
    .eq('render_job_id', id)
    .eq('render_status', 'queued')
    .select(columns)
    .maybeSingle();
  if (processingError) throw new Error(processingError.message);
  if (!processing) return { render_job_id: id, status: 'skipped', reason: 'job_was_not_queued', renderer_provider: provider.key };

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
          renderer_provider: provider.key,
          renderer_provider_note: provider.short_note,
          renderer_provider_note_zh: provider.short_note_zh,
          renderer_configured: !rendered.skipped,
          renderer_contract_valid: false,
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
    return { render_job_id: id, status: 'failed', reason: rendered.error, renderer_provider: provider.key, renderer_configured: !rendered.skipped, renderer_contract_valid: false };
  }

  const { data, error } = await supabase
    .from('social_video_render_jobs')
    .update({
      render_status: 'rendered',
      output_json: {
        ...previousOutput,
        renderer_result: rendered.result,
        renderer_provider: provider.key,
        renderer_provider_note: provider.short_note,
        renderer_provider_note_zh: provider.short_note_zh,
        renderer_contract_valid: true,
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
  return { render_job_id: id, status: 'rendered', renderer_provider: provider.key, renderer_contract_valid: true };
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

  return ok({ processed: results.length, results });
}

export const GET = POST;
