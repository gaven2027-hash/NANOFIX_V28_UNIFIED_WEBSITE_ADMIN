'use client';

import { useEffect, useState } from 'react';
import { Badge } from './Badge';
import { SectionCard } from './SectionCard';
import { defaultSocialMaterialPack } from './SocialMaterialPackBuilder';

type Row = Record<string, unknown>;

const inputClass = 'w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 outline-none transition focus:border-activeBlue focus:ring-2 focus:ring-blue-100';
const labelClass = 'mb-1 block text-xs font-black uppercase tracking-[0.12em] text-slate-500';
const statuses = ['draft', 'queued', 'processing', 'rendered', 'failed', 'cancelled', 'approved', 'scheduled'];
const renderTypes = ['short_video', 'long_video', 'story', 'reel', 'listing_video', 'blog_embed'];
const platforms = ['all', 'facebook', 'tiktok', 'youtube_shorts', 'instagram', 'xiaohongshu', 'forum', 'google_business_profile', 'linkedin', 'x_twitter', 'carousell_services', 'seedly_community', 'whatsapp_channel', 'telegram_channel', 'website_blog'];

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
  if (/(rendered|approved|scheduled)/i.test(s)) return 'green';
  if (/(queued|processing|draft)/i.test(s)) return 'amber';
  if (/(failed|cancelled)/i.test(s)) return 'red';
  return 'blue';
}

function defaultSettings() {
  return {
    output_format: 'mp4',
    aspect_ratio: '9:16',
    duration_seconds: 30,
    include_subtitles: true,
    include_logo_watermark: true,
    voiceover_required: false,
    background_music_note: '',
    admin_review_required: true,
    ai_auto_publish_allowed: false
  };
}

function countArray(value: unknown) {
  return Array.isArray(value) ? value.length : 0;
}

export function SocialVideoRenderJobsWorkspace() {
  const [rows, setRows] = useState<Row[]>([]);
  const [selected, setSelected] = useState<Row | null>(null);
  const [form, setForm] = useState<Row>({ platform: 'all', render_status: 'draft', render_type: 'short_video', title: 'NANOFIX AI video render job', material_pack: defaultSocialMaterialPack, render_settings: defaultSettings(), output_json: {} });
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
    const next = row || { platform: 'all', render_status: 'draft', render_type: 'short_video', title: 'NANOFIX AI video render job', material_pack: defaultSocialMaterialPack, render_settings: defaultSettings(), output_json: {} };
    setForm(next);
    setMaterialJson(safeJson(next.material_pack, defaultSocialMaterialPack));
    setSettingsJson(safeJson(next.render_settings, defaultSettings()));
    setOutputJson(safeJson(next.output_json, {}));
    setMessage('');
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

  return (
    <div className="space-y-5">
      <SectionCard title="Social Video Render Jobs / 社媒视频渲染任务" subtitle="Queue and audit foundation for future MP4 rendering, subtitles, watermark, voiceover and transcoding. It does not auto-publish. / 这是未来 MP4 渲染、字幕、水印、配音、转码的任务队列与审计基础，不自动发布。">
        <div className="grid gap-3 md:grid-cols-4">
          <div className="rounded-2xl bg-blue-50 p-4 ring-1 ring-blue-100"><div className="text-2xl font-black text-blue-900">{rows.length}</div><div className="text-xs font-bold text-blue-700">Render jobs / 渲染任务</div></div>
          <div className="rounded-2xl bg-amber-50 p-4 ring-1 ring-amber-100"><div className="text-2xl font-black text-amber-900">{rows.filter((row) => ['draft','queued','processing'].includes(String(row.render_status))).length}</div><div className="text-xs font-bold text-amber-700">Open queue / 待处理</div></div>
          <div className="rounded-2xl bg-emerald-50 p-4 ring-1 ring-emerald-100"><div className="text-2xl font-black text-emerald-900">{rows.filter((row) => row.render_status === 'rendered').length}</div><div className="text-xs font-bold text-emerald-700">Rendered / 已渲染</div></div>
          <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200"><div className="text-2xl font-black text-slate-900">0</div><div className="text-xs font-bold text-slate-700">Auto-published / 自动发布</div></div>
        </div>
      </SectionCard>

      {message ? <div className="rounded-2xl bg-blue-50 px-4 py-3 text-sm font-bold text-blue-800 ring-1 ring-blue-100">{message}</div> : null}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_440px]">
        <SectionCard title="Render Job Queue / 渲染任务队列" subtitle="Create, approve, queue and review rendering requests before future worker execution. / 在未来 worker 执行前，创建、批准、排队和审核渲染请求。">
          <div className="mb-4 flex flex-wrap gap-2">
            <button type="button" onClick={() => edit(null)} className="rounded-2xl bg-activeBlue px-4 py-2 text-sm font-black text-white hover:bg-blue-700">New Render Job / 新建任务</button>
            <button type="button" onClick={loadRows} disabled={loading} className="rounded-2xl bg-slate-900 px-4 py-2 text-sm font-black text-white hover:bg-slate-700 disabled:opacity-60">Refresh / 刷新</button>
          </div>
          <div className="overflow-x-auto rounded-2xl border border-slate-200">
            <table className="min-w-[980px] w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="p-3">Status</th><th className="p-3">Title</th><th className="p-3">Platform</th><th className="p-3">Type</th><th className="p-3">Materials</th><th className="p-3">Updated</th><th className="p-3">Action</th></tr></thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((row) => {
                  const material = typeof row.material_pack === 'object' && row.material_pack ? row.material_pack as Record<string, unknown> : {};
                  return (
                    <tr key={String(row.render_job_id)}>
                      <td className="p-3"><Badge tone={tone(row.render_status)}>{formatValue(row.render_status)}</Badge></td>
                      <td className="p-3 font-black text-slate-900">{formatValue(row.title)}</td>
                      <td className="p-3 font-semibold text-slate-700">{formatValue(row.platform)}</td>
                      <td className="p-3 font-semibold text-slate-700">{formatValue(row.render_type)}</td>
                      <td className="p-3 text-xs font-semibold text-slate-500">source {countArray(material.source_video_urls)} · ref {countArray(material.reference_video_urls)} · clips {countArray(material.video_clip_urls)}</td>
                      <td className="p-3 text-xs font-semibold text-slate-500">{formatValue(row.updated_at)}</td>
                      <td className="p-3"><button type="button" onClick={() => edit(row)} className="rounded-xl bg-white px-3 py-2 text-xs font-black text-activeBlue ring-1 ring-blue-100 hover:bg-blue-50">Open / 打开</button></td>
                    </tr>
                  );
                })}
                {!rows.length ? <tr><td colSpan={7} className="p-6 text-center text-sm font-bold text-slate-500">{loading ? 'Loading...' : 'No render jobs yet. / 暂无渲染任务。'}</td></tr> : null}
              </tbody>
            </table>
          </div>
        </SectionCard>

        <SectionCard title={selected ? 'Edit Render Job / 编辑渲染任务' : 'Create Render Job / 创建渲染任务'} subtitle="Render jobs are queue records only until a worker is connected. / 在 worker 接入前，渲染任务只是队列记录。">
          <div className="space-y-4">
            <label><span className={labelClass}>Title / 标题</span><input className={inputClass} value={String(form.title || '')} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} /></label>
            <div className="grid gap-3 md:grid-cols-2">
              <label><span className={labelClass}>Platform / 平台</span><select className={inputClass} value={String(form.platform || 'all')} onChange={(event) => setForm((current) => ({ ...current, platform: event.target.value }))}>{platforms.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
              <label><span className={labelClass}>Status / 状态</span><select className={inputClass} value={String(form.render_status || 'draft')} onChange={(event) => setForm((current) => ({ ...current, render_status: event.target.value }))}>{statuses.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
              <label><span className={labelClass}>Render Type / 渲染类型</span><select className={inputClass} value={String(form.render_type || 'short_video')} onChange={(event) => setForm((current) => ({ ...current, render_type: event.target.value }))}>{renderTypes.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
              <label><span className={labelClass}>Scheduled At / 排期时间</span><input className={inputClass} type="datetime-local" value={String(form.scheduled_at || '').slice(0, 16)} onChange={(event) => setForm((current) => ({ ...current, scheduled_at: event.target.value }))} /></label>
            </div>
            <label><span className={labelClass}>Material Pack JSON / 素材包 JSON</span><textarea className={`${inputClass} min-h-36 font-mono text-xs`} value={materialJson} onChange={(event) => setMaterialJson(event.target.value)} /></label>
            <label><span className={labelClass}>Render Settings JSON / 渲染设置 JSON</span><textarea className={`${inputClass} min-h-32 font-mono text-xs`} value={settingsJson} onChange={(event) => setSettingsJson(event.target.value)} /></label>
            <label><span className={labelClass}>Output JSON / 输出 JSON</span><textarea className={`${inputClass} min-h-24 font-mono text-xs`} value={outputJson} onChange={(event) => setOutputJson(event.target.value)} /></label>
            <div className="flex flex-wrap gap-2">
              <button type="button" disabled={saving} onClick={() => void save()} className="rounded-2xl bg-activeBlue px-4 py-2 text-sm font-black text-white hover:bg-blue-700 disabled:opacity-60">Save / 保存</button>
              <button type="button" disabled={saving} onClick={() => void save('queued')} className="rounded-2xl bg-amber-500 px-4 py-2 text-sm font-black text-white hover:bg-amber-600 disabled:opacity-60">Queue / 加入队列</button>
              <button type="button" disabled={saving} onClick={() => void save('approved')} className="rounded-2xl bg-emerald-600 px-4 py-2 text-sm font-black text-white hover:bg-emerald-700 disabled:opacity-60">Approve / 批准</button>
            </div>
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
