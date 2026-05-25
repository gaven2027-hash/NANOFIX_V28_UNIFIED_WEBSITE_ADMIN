'use client';

import { useEffect, useState } from 'react';
import { Badge } from './Badge';
import { SectionCard } from './SectionCard';
import { defaultSocialMaterialPack } from './SocialMaterialPackBuilder';
import { SocialRenderedOutputReviewPanel } from './SocialRenderedOutputReviewPanel';
import { rendererProviderOptionsForClient } from '@/lib/nanofix/socialVideoRendererProviders';

type Row = Record<string, unknown>;

const inputClass = 'w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 outline-none transition focus:border-activeBlue focus:ring-2 focus:ring-blue-100';
const labelClass = 'mb-1 block text-xs font-black uppercase tracking-[0.12em] text-slate-500';
const statuses = ['draft', 'queued', 'processing', 'rendered', 'failed', 'cancelled', 'approved', 'scheduled'];
const renderTypes = ['short_video', 'long_video', 'story', 'reel', 'listing_video', 'blog_embed'];
const platforms = ['all', 'facebook', 'tiktok', 'youtube_shorts', 'instagram', 'xiaohongshu', 'forum', 'google_business_profile', 'linkedin', 'x_twitter', 'carousell_services', 'seedly_community', 'whatsapp_channel', 'telegram_channel', 'website_blog'];
const rendererProviders = rendererProviderOptionsForClient();
const defaultRendererProvider = 'nanofix_internal_remotion_ffmpeg';

function formatValue(value: unknown) {
  if (value === null || value === undefined || value === '') return '—';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

function safeJson(value: unknown, fallback: unknown) {
  if (!value) return JSON.stringify(fallback, null, 2);
  if (typeof value === 'string') return value;
  return JSON.stringify(value, null, 2);
}

function parseJson(value: string) {
  try {
    return JSON.parse(value || '{}');
  } catch {
    return null;
  }
}

function tone(status: unknown): 'blue' | 'green' | 'amber' | 'red' | 'gray' | 'cyan' {
  const s = String(status || '');
  if (/(rendered|approved|scheduled|ready_for_worker|valid|internal|creatomate|runway)/i.test(s)) return 'green';
  if (/(queued|processing|draft|needs_material_review|review|manual)/i.test(s)) return 'amber';
  if (/(failed|cancelled|invalid|revision)/i.test(s)) return 'red';
  return 'blue';
}

function selectedRendererProvider(key: unknown) {
  return rendererProviders.find((provider) => provider.key === String(key || defaultRendererProvider)) || rendererProviders[0];
}

function defaultSettings(providerKey = defaultRendererProvider) {
  const provider = selectedRendererProvider(providerKey);
  return {
    output_format: 'mp4',
    aspect_ratio: '9:16',
    duration_seconds: 30,
    include_subtitles: true,
    include_logo_watermark: true,
    voiceover_required: false,
    background_music_note: '',
    renderer_provider: provider.key,
    renderer_provider_label: provider.label,
    renderer_provider_label_zh: provider.label_zh,
    renderer_provider_note: provider.short_note,
    renderer_provider_note_zh: provider.short_note_zh,
    admin_review_required: true,
    ai_auto_publish_allowed: false
  };
}

function defaultForm(): Row {
  return {
    platform: 'all',
    render_status: 'draft',
    render_type: 'short_video',
    renderer_provider: defaultRendererProvider,
    renderer_template_id: '',
    renderer_model: '',
    renderer_endpoint_key: 'NANOFIX_INTERNAL_VIDEO_RENDERER_ENDPOINT',
    renderer_cost_estimate: '',
    title: 'NANOFIX AI video render job',
    material_pack: defaultSocialMaterialPack,
    render_settings: defaultSettings(defaultRendererProvider),
    output_json: {}
  };
}

function countArray(value: unknown) {
  return Array.isArray(value) ? value.length : 0;
}

function getOutput(row: Row | null) {
  return row?.output_json && typeof row.output_json === 'object' ? row.output_json as Row : {};
}

function getRenderPlan(row: Row | null) {
  const output = getOutput(row);
  return output.render_plan && typeof output.render_plan === 'object' ? output.render_plan as Record<string, unknown> : null;
}

function getRendererContractStatus(row: Row | null) {
  const output = getOutput(row);
  if (output.renderer_contract_valid === true) return 'valid';
  if (output.renderer_contract_valid === false) return 'invalid';
  return 'not checked';
}

function getWarnings(plan: Record<string, unknown> | null) {
  return Array.isArray(plan?.warnings) ? plan.warnings.map((item) => String(item)) : [];
}

function getTimeline(plan: Record<string, unknown> | null) {
  return Array.isArray(plan?.timeline) ? plan.timeline as Array<Record<string, unknown>> : [];
}

function updateSettingsForProvider(currentSettingsJson: string, providerKey: string) {
  const provider = selectedRendererProvider(providerKey);
  const parsed = parseJson(currentSettingsJson) || {};
  return safeJson({
    ...parsed,
    renderer_provider: provider.key,
    renderer_provider_label: provider.label,
    renderer_provider_label_zh: provider.label_zh,
    renderer_provider_note: provider.short_note,
    renderer_provider_note_zh: provider.short_note_zh,
    renderer_endpoint_key: provider.key === 'manual_final_video_upload' ? null : (parsed as Row).renderer_endpoint_key || undefined,
    admin_review_required: true,
    ai_auto_publish_allowed: false
  }, {});
}

export function SocialVideoRenderJobsWorkspace() {
  const [rows, setRows] = useState<Row[]>([]);
  const [selected, setSelected] = useState<Row | null>(null);
  const [form, setForm] = useState<Row>(defaultForm());
  const [materialJson, setMaterialJson] = useState(safeJson(defaultSocialMaterialPack, {}));
  const [settingsJson, setSettingsJson] = useState(safeJson(defaultSettings(), {}));
  const [outputJson, setOutputJson] = useState(safeJson({}, {}));
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);

  async function loadRows() {
    setLoading(true);
    setMessage('');
    const response = await fetch('/api/admin/social-media/render-jobs', { cache: 'no-store' });
    const json = await response.json().catch(() => ({}));
    setLoading(false);
    if (!response.ok || !json.ok) {
      setMessage(json.error || 'Load failed. / 加载失败。');
      return;
    }
    setRows(json.rows || []);
  }

  useEffect(() => {
    void loadRows();
  }, []);

  function edit(row: Row | null) {
    setSelected(row);
    const next = row || defaultForm();
    const provider = selectedRendererProvider(next.renderer_provider || defaultRendererProvider);
    setForm({ ...next, renderer_provider: provider.key });
    setMaterialJson(safeJson(next.material_pack, defaultSocialMaterialPack));
    setSettingsJson(safeJson(next.render_settings || defaultSettings(provider.key), defaultSettings(provider.key)));
    setOutputJson(safeJson(next.output_json, {}));
    setMessage('');
  }

  function setRendererProvider(providerKey: string) {
    const provider = selectedRendererProvider(providerKey);
    setForm((current) => ({
      ...current,
      renderer_provider: provider.key,
      renderer_endpoint_key: provider.key === 'manual_final_video_upload' ? '' : (provider as Row).endpoint_env || current.renderer_endpoint_key || '',
      render_type: current.render_type || provider.default_render_type
    }));
    setSettingsJson((current) => updateSettingsForProvider(current, provider.key));
  }

  async function handleReviewedOutput(row: Row, nextMessage: string) {
    setMessage(nextMessage);
    await loadRows();
    edit(row);
  }

  async function save(statusOverride?: string) {
    const material = parseJson(materialJson);
    const settings = parseJson(settingsJson);
    const output = parseJson(outputJson);
    if (material === null) return setMessage('Material Pack JSON is invalid. / 素材包 JSON 格式错误。');
    if (settings === null) return setMessage('Render Settings JSON is invalid. / 渲染设置 JSON 格式错误。');
    if (output === null) return setMessage('Output JSON is invalid. / 输出 JSON 格式错误。');
    setSaving(true);
    setMessage('');
    const response = await fetch('/api/admin/social-media/render-jobs', {
      method: selected ? 'PATCH' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...form,
        render_job_id: selected?.render_job_id,
        render_status: statusOverride || form.render_status || 'draft',
        material_pack: material,
        render_settings: settings,
        output_json: output
      })
    });
    const json = await response.json().catch(() => ({}));
    setSaving(false);
    if (!response.ok || !json.ok) {
      setMessage(json.error || 'Save failed. / 保存失败。');
      return;
    }
    setMessage('Saved. / 已保存。');
    await loadRows();
    edit(json.row || null);
  }

  async function generateRenderPlan() {
    if (!selected?.render_job_id) {
      setMessage('Save the render job before generating a render plan. / 请先保存渲染任务，再生成渲染方案。');
      return;
    }
    setSaving(true);
    setMessage('');
    const response = await fetch('/api/admin/social-media/render-jobs', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ render_job_id: selected.render_job_id, action: 'generate_render_plan' })
    });
    const json = await response.json().catch(() => ({}));
    setSaving(false);
    if (!response.ok || !json.ok) {
      setMessage(json.error || 'Render plan generation failed. / 生成渲染方案失败。');
      return;
    }
    setMessage(`Render plan generated: ${json.render_plan?.plan_status || '—'} / 已生成渲染方案。`);
    await loadRows();
    edit(json.row || null);
  }

  const selectedPlan = getRenderPlan(selected);
  const warnings = getWarnings(selectedPlan);
  const timeline = getTimeline(selectedPlan);
  const provider = selectedRendererProvider(form.renderer_provider);

  return (
    <div className="space-y-5">
      <SectionCard title="Social Video Render Jobs / 社媒视频渲染任务" subtitle="Choose a renderer platform, generate a render plan, review output, then final-approve before scheduling. / 选择视频编辑平台，生成渲染方案，审核输出，再排期前最终审批。">
        <div className="grid gap-3 md:grid-cols-5">
          <div className="rounded-2xl bg-blue-50 p-4 ring-1 ring-blue-100"><div className="text-2xl font-black text-blue-900">{rows.length}</div><div className="text-xs font-bold text-blue-700">Render jobs / 渲染任务</div></div>
          <div className="rounded-2xl bg-amber-50 p-4 ring-1 ring-amber-100"><div className="text-2xl font-black text-amber-900">{rows.filter((row) => ['draft','queued','processing'].includes(String(row.render_status))).length}</div><div className="text-xs font-bold text-amber-700">Open queue / 待处理</div></div>
          <div className="rounded-2xl bg-emerald-50 p-4 ring-1 ring-emerald-100"><div className="text-2xl font-black text-emerald-900">{rows.filter((row) => row.render_status === 'rendered').length}</div><div className="text-xs font-bold text-emerald-700">Need review / 待审核结果</div></div>
          <div className="rounded-2xl bg-purple-50 p-4 ring-1 ring-purple-100"><div className="text-2xl font-black text-purple-900">{rendererProviders.length}</div><div className="text-xs font-bold text-purple-700">Renderer options / 编辑平台</div></div>
          <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200"><div className="text-2xl font-black text-slate-900">0</div><div className="text-xs font-bold text-slate-700">Auto-published / 自动发布</div></div>
        </div>
      </SectionCard>

      {message ? <div className="rounded-2xl bg-blue-50 px-4 py-3 text-sm font-bold text-blue-800 ring-1 ring-blue-100">{message}</div> : null}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_500px]">
        <SectionCard title="Render Job Queue / 渲染任务队列" subtitle="Renderer provider is saved per job and used by the internal worker. / 每个任务保存独立编辑平台，并由 Worker 按平台路由。">
          <div className="mb-4 flex flex-wrap gap-2"><button type="button" onClick={() => edit(null)} className="rounded-2xl bg-activeBlue px-4 py-2 text-sm font-black text-white hover:bg-blue-700">New Render Job / 新建任务</button><button type="button" onClick={loadRows} disabled={loading} className="rounded-2xl bg-slate-900 px-4 py-2 text-sm font-black text-white hover:bg-slate-700 disabled:opacity-60">Refresh / 刷新</button></div>
          <div className="overflow-x-auto rounded-2xl border border-slate-200">
            <table className="min-w-[1240px] w-full text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="p-3">Status</th><th className="p-3">Title</th><th className="p-3">Platform</th><th className="p-3">Renderer</th><th className="p-3">Type</th><th className="p-3">Materials</th><th className="p-3">Plan</th><th className="p-3">Contract</th><th className="p-3">Action</th></tr></thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((row) => {
                  const material = typeof row.material_pack === 'object' && row.material_pack ? row.material_pack as Record<string, unknown> : {};
                  const plan = getRenderPlan(row);
                  const rowProvider = selectedRendererProvider(row.renderer_provider);
                  return <tr key={String(row.render_job_id)}><td className="p-3"><Badge tone={tone(row.render_status)}>{formatValue(row.render_status)}</Badge></td><td className="p-3 font-black text-slate-900">{formatValue(row.title)}</td><td className="p-3 font-semibold text-slate-700">{formatValue(row.platform)}</td><td className="p-3"><div className="text-xs font-black text-slate-900">{rowProvider.label}</div><div className="mt-1 text-[11px] font-semibold text-slate-500">{rowProvider.short_note_zh}</div></td><td className="p-3 font-semibold text-slate-700">{formatValue(row.render_type)}</td><td className="p-3 text-xs font-semibold text-slate-500">source {countArray(material.source_video_urls)} · ref {countArray(material.reference_video_urls)} · clips {countArray(material.video_clip_urls)}</td><td className="p-3"><Badge tone={tone(plan?.plan_status)}>{plan ? formatValue(plan.plan_status) : 'no plan'}</Badge></td><td className="p-3"><Badge tone={tone(getRendererContractStatus(row))}>{getRendererContractStatus(row)}</Badge></td><td className="p-3"><button type="button" onClick={() => edit(row)} className="rounded-xl bg-white px-3 py-2 text-xs font-black text-activeBlue ring-1 ring-blue-100 hover:bg-blue-50">Open / 打开</button></td></tr>;
                })}
                {!rows.length ? <tr><td colSpan={9} className="p-6 text-center text-sm font-bold text-slate-500">{loading ? 'Loading...' : 'No render jobs yet. / 暂无渲染任务。'}</td></tr> : null}
              </tbody></table>
          </div>
        </SectionCard>

        <SectionCard title={selected ? 'Edit Render Job / 编辑渲染任务' : 'Create Render Job / 创建渲染任务'} subtitle="Select where the material should be edited/rendered. Platform notes are shown next to each option. / 选择素材通过哪个平台编辑/渲染，选项后已标注平台特点。">
          <div className="space-y-4">
            <label><span className={labelClass}>Title / 标题</span><input className={inputClass} value={String(form.title || '')} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} /></label>
            <label><span className={labelClass}>Video Editor / Renderer Platform / 视频编辑平台</span><select className={inputClass} value={String(form.renderer_provider || defaultRendererProvider)} onChange={(event) => setRendererProvider(event.target.value)}>{rendererProviders.map((item) => <option key={item.key} value={item.key}>{item.display_label_zh}</option>)}</select></label>
            <div className="rounded-2xl bg-purple-50 p-3 ring-1 ring-purple-100"><div className="text-sm font-black text-purple-950">{provider.label_zh}</div><div className="mt-1 text-sm font-bold text-purple-800">{provider.short_note_zh}</div><div className="mt-1 text-xs font-semibold text-purple-700">{provider.description}</div><div className="mt-2 flex flex-wrap gap-2"><Badge tone="blue">Priority {provider.priority}</Badge><Badge tone={tone(provider.category)}>{provider.category}</Badge><Badge tone={provider.supports_worker ? 'green' : 'amber'}>{provider.supports_worker ? 'Worker automation / 可自动化' : 'Manual upload / 人工上传'}</Badge></div></div>
            <div className="grid gap-3 md:grid-cols-2"><label><span className={labelClass}>Platform / 发布平台</span><select className={inputClass} value={String(form.platform || 'all')} onChange={(event) => setForm((current) => ({ ...current, platform: event.target.value }))}>{platforms.map((item) => <option key={item} value={item}>{item}</option>)}</select></label><label><span className={labelClass}>Status / 状态</span><select className={inputClass} value={String(form.render_status || 'draft')} onChange={(event) => setForm((current) => ({ ...current, render_status: event.target.value }))}>{statuses.map((item) => <option key={item} value={item}>{item}</option>)}</select></label><label><span className={labelClass}>Render Type / 渲染类型</span><select className={inputClass} value={String(form.render_type || 'short_video')} onChange={(event) => setForm((current) => ({ ...current, render_type: event.target.value }))}>{renderTypes.map((item) => <option key={item} value={item}>{item}</option>)}</select></label><label><span className={labelClass}>Scheduled At / 排期时间</span><input className={inputClass} type="datetime-local" value={String(form.scheduled_at || '').slice(0, 16)} onChange={(event) => setForm((current) => ({ ...current, scheduled_at: event.target.value }))} /></label><label><span className={labelClass}>Renderer Template ID / 模板 ID</span><input className={inputClass} value={String(form.renderer_template_id || '')} onChange={(event) => setForm((current) => ({ ...current, renderer_template_id: event.target.value }))} placeholder="optional template id" /></label><label><span className={labelClass}>Renderer Model / 模型</span><input className={inputClass} value={String(form.renderer_model || '')} onChange={(event) => setForm((current) => ({ ...current, renderer_model: event.target.value }))} placeholder="optional model/version" /></label><label><span className={labelClass}>Endpoint Key / 接口环境变量</span><input className={inputClass} value={String(form.renderer_endpoint_key || '')} onChange={(event) => setForm((current) => ({ ...current, renderer_endpoint_key: event.target.value }))} placeholder="NANOFIX_INTERNAL_VIDEO_RENDERER_ENDPOINT" /></label><label><span className={labelClass}>Cost Estimate / 预计成本</span><input className={inputClass} type="number" min="0" step="0.01" value={String(form.renderer_cost_estimate || '')} onChange={(event) => setForm((current) => ({ ...current, renderer_cost_estimate: event.target.value }))} /></label></div>
            <label><span className={labelClass}>Material Pack JSON / 素材包 JSON</span><textarea className={`${inputClass} min-h-36 font-mono text-xs`} value={materialJson} onChange={(event) => setMaterialJson(event.target.value)} /></label>
            <label><span className={labelClass}>Render Settings JSON / 渲染设置 JSON</span><textarea className={`${inputClass} min-h-32 font-mono text-xs`} value={settingsJson} onChange={(event) => setSettingsJson(event.target.value)} /></label>
            <label><span className={labelClass}>Output JSON / 输出 JSON</span><textarea className={`${inputClass} min-h-24 font-mono text-xs`} value={outputJson} onChange={(event) => setOutputJson(event.target.value)} /></label>
            {selectedPlan ? <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200"><div className="flex flex-wrap items-center gap-2"><Badge tone={tone(selectedPlan.plan_status)}>{formatValue(selectedPlan.plan_status)}</Badge><Badge tone="blue">{formatValue((selectedPlan.output as Record<string, unknown> | undefined)?.aspect_ratio)}</Badge><Badge tone="cyan">{formatValue((selectedPlan.output as Record<string, unknown> | undefined)?.duration_seconds)}s</Badge><Badge tone="purple">{provider.short_note_zh}</Badge></div>{warnings.length ? <div className="mt-3 space-y-1">{warnings.map((warning) => <div key={warning} className="rounded-xl bg-amber-50 px-3 py-2 text-xs font-bold text-amber-800 ring-1 ring-amber-100">{warning}</div>)}</div> : null}<div className="mt-3 space-y-2">{timeline.map((item) => <div key={String(item.segment)} className="rounded-xl bg-white px-3 py-2 text-xs font-semibold text-slate-600 ring-1 ring-slate-200"><span className="font-black text-slate-900">{formatValue(item.segment)}</span> · {formatValue(item.start_second)}s–{formatValue(item.end_second)}s · {formatValue(item.overlay)}</div>)}</div></div> : null}
            <SocialRenderedOutputReviewPanel row={selected} onUpdated={handleReviewedOutput} />
            <div className="flex flex-wrap gap-2"><button type="button" disabled={saving} onClick={() => void save()} className="rounded-2xl bg-activeBlue px-4 py-2 text-sm font-black text-white hover:bg-blue-700 disabled:opacity-60">Save / 保存</button><button type="button" disabled={saving || !selected} onClick={generateRenderPlan} className="rounded-2xl bg-purple-600 px-4 py-2 text-sm font-black text-white hover:bg-purple-700 disabled:opacity-60">Generate Render Plan / 生成渲染方案</button><button type="button" disabled={saving || provider.key === 'manual_final_video_upload'} onClick={() => void save('queued')} className="rounded-2xl bg-amber-500 px-4 py-2 text-sm font-black text-white hover:bg-amber-600 disabled:opacity-60">Queue / 加入队列</button></div>
            {provider.key === 'manual_final_video_upload' ? <div className="rounded-xl bg-amber-50 px-3 py-2 text-xs font-bold text-amber-800 ring-1 ring-amber-100">Manual Final Video Upload is for self-editing with CapCut, Canva or agency videos. Do not queue it for automatic rendering; upload the final video result and continue review/scheduling. / 人工上传最终视频适合自己用剪映、Canva 或外包剪辑，不进入自动渲染队列。</div> : null}
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
