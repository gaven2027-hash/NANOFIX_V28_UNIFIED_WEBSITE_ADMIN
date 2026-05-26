'use client';

import { useEffect, useMemo, useState } from 'react';
import { Badge } from './Badge';
import { SectionCard } from './SectionCard';

type Row = Record<string, unknown>;
type ModuleFilter = 'all' | 'website' | 'social';

const inputClass = 'w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 outline-none transition focus:border-activeBlue focus:ring-2 focus:ring-blue-100';
const labelClass = 'mb-1 block text-xs font-black uppercase tracking-[0.12em] text-slate-500';
const modules = ['website', 'social'];
const statuses = ['ready_to_publish','scheduled','publishing','published','failed','pushed_back_to_review','cancelled'];
const sourceTypes = ['ai_generated','manual_upload','external_editor','canva','capcut','premiere','mobile_upload','website_cms','social_rendered_video'];
const websitePlatforms = ['website'];
const socialPlatforms = ['facebook','instagram','tiktok','youtube_shorts','xiaohongshu','google_business_profile','linkedin','x_twitter','telegram_channel','whatsapp_channel','forum','carousell_services','seedly_community'];

function formatValue(value: unknown) {
  if (value === null || value === undefined || value === '') return '—';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

function tone(status: unknown): 'blue' | 'green' | 'amber' | 'red' | 'gray' | 'cyan' {
  const s = String(status || '');
  if (/(published|ready_to_publish|approved|pass)/i.test(s)) return 'green';
  if (/(scheduled|publishing|review|pending)/i.test(s)) return 'amber';
  if (/(failed|cancelled|not_approved|pushed)/i.test(s)) return 'red';
  if (/(website)/i.test(s)) return 'blue';
  if (/(social)/i.test(s)) return 'cyan';
  return 'gray';
}

function safeJsonString(value: unknown, fallback: Record<string, unknown> = {}) {
  if (!value) return JSON.stringify(fallback, null, 2);
  if (typeof value === 'string') return value;
  return JSON.stringify(value, null, 2);
}

function parseJson(value: string) {
  try { return JSON.parse(value || '{}'); } catch { return null; }
}

function defaultGate(module: string) {
  return module === 'social'
    ? { ratio_ok: false, thumbnail_ok: false, caption_ok: false, hashtag_ok: false, video_rendered_ok: false, account_connected_ok: false }
    : { seo_ok: false, mobile_ok: false, cta_ok: false, alt_ok: false, broken_image_ok: false, cls_ok: false };
}

function gatePassed(row: Row | null) {
  const gate = row?.final_publish_gate && typeof row.final_publish_gate === 'object' ? row.final_publish_gate as Record<string, unknown> : {};
  const checks = Object.entries(gate).filter(([key, value]) => key.endsWith('_ok') && typeof value === 'boolean');
  return checks.length > 0 && checks.every(([, value]) => value === true);
}

function defaultForm(module: 'website' | 'social' = 'website'): Row {
  return {
    module,
    source_type: module === 'website' ? 'website_cms' : 'manual_upload',
    title: module === 'website' ? 'NANOFIX Website Publish Item' : 'NANOFIX Social Publish Item',
    platform: module === 'website' ? 'website' : 'facebook',
    route_path: module === 'website' ? '/' : '',
    content_url: '',
    thumbnail_url: '',
    caption: '',
    final_asset_url: '',
    final_asset_storage_path: '',
    status: 'ready_to_publish',
    approval_status: 'approved',
    final_publish_gate: defaultGate(module),
    snapshot_json: { ai_auto_publish_allowed: false, final_approval_completed_before_schedule: true },
    scheduled_at: ''
  };
}

export function PublishCenterWorkspace() {
  const [rows, setRows] = useState<Row[]>([]);
  const [moduleFilter, setModuleFilter] = useState<ModuleFilter>('all');
  const [statusFilter, setStatusFilter] = useState('');
  const [selected, setSelected] = useState<Row | null>(null);
  const [form, setForm] = useState<Row>(defaultForm('website'));
  const [gateJson, setGateJson] = useState(safeJsonString(defaultGate('website')));
  const [snapshotJson, setSnapshotJson] = useState(safeJsonString({ ai_auto_publish_allowed: false }));
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  async function loadRows() {
    setLoading(true);
    setMessage('');
    const params = new URLSearchParams();
    if (moduleFilter !== 'all') params.set('module', moduleFilter);
    if (statusFilter) params.set('status', statusFilter);
    const response = await fetch(`/api/admin/publish-center?${params.toString()}`, { cache: 'no-store' });
    const json = await response.json().catch(() => ({}));
    setLoading(false);
    if (!response.ok || !json.ok) {
      setMessage(json.error || 'Load failed. / 加载失败。');
      return;
    }
    setRows(json.rows || []);
  }

  useEffect(() => { void loadRows(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [moduleFilter, statusFilter]);

  function edit(row: Row | null, module: 'website' | 'social' = 'website') {
    const next = row || defaultForm(module);
    setSelected(row);
    setForm(next);
    setGateJson(safeJsonString(next.final_publish_gate || defaultGate(String(next.module || module))));
    setSnapshotJson(safeJsonString(next.snapshot_json || { ai_auto_publish_allowed: false }));
    setMessage('');
  }

  function updateModule(module: 'website' | 'social') {
    setForm((current) => ({ ...current, module, source_type: module === 'website' ? 'website_cms' : 'manual_upload', platform: module === 'website' ? 'website' : 'facebook', final_publish_gate: defaultGate(module) }));
    setGateJson(safeJsonString(defaultGate(module)));
  }

  async function save(statusOverride?: string) {
    const gate = parseJson(gateJson);
    const snapshot = parseJson(snapshotJson);
    if (gate === null) return setMessage('Final Publish Gate JSON is invalid. / 最终发布检查 JSON 格式错误。');
    if (snapshot === null) return setMessage('Snapshot JSON is invalid. / 快照 JSON 格式错误。');
    setSaving(true);
    setMessage('');
    const method = selected ? 'PATCH' : 'POST';
    const response = await fetch('/api/admin/publish-center', {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, publish_item_id: selected?.publish_item_id, status: statusOverride || form.status, final_publish_gate: gate, snapshot_json: snapshot })
    });
    const json = await response.json().catch(() => ({}));
    setSaving(false);
    if (!response.ok || !json.ok) return setMessage(json.error || 'Save failed. / 保存失败。');
    setMessage('Saved. / 已保存。');
    await loadRows();
    edit(json.row || null);
  }

  async function action(actionName: string, extra: Row = {}) {
    if (!selected?.publish_item_id) return setMessage('Open a publish item first. / 请先打开一个发布项目。');
    setSaving(true);
    setMessage('');
    const response = await fetch('/api/admin/publish-center', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ publish_item_id: selected.publish_item_id, action: actionName, ...extra })
    });
    const json = await response.json().catch(() => ({}));
    setSaving(false);
    if (!response.ok || !json.ok) return setMessage(json.error || 'Action failed. / 操作失败。');
    setMessage(`Action completed: ${actionName}. / 操作完成。`);
    await loadRows();
    edit(json.row || null);
  }

  const counts = useMemo(() => ({
    ready: rows.filter((row) => row.status === 'ready_to_publish').length,
    scheduled: rows.filter((row) => row.status === 'scheduled').length,
    published: rows.filter((row) => row.status === 'published').length,
    failed: rows.filter((row) => row.status === 'failed').length
  }), [rows]);
  const currentModule = String(form.module || 'website') as 'website' | 'social';
  const platforms = currentModule === 'website' ? websitePlatforms : socialPlatforms;

  return (
    <div className="space-y-5">
      <SectionCard title="Unified Publish Center / 统一发布中心" subtitle="Final human-controlled outlet for Website and Social publishing. AI auto-publish is disabled; approval must happen before scheduling. / 官网和社媒最终人工发布出口，AI 默认不能自动发布，审批必须先于排期。">
        <div className="grid gap-3 md:grid-cols-4">
          <div className="rounded-2xl bg-emerald-50 p-4 ring-1 ring-emerald-100"><div className="text-2xl font-black text-emerald-900">{counts.ready}</div><div className="text-xs font-bold text-emerald-700">Ready To Publish / 待发布</div></div>
          <div className="rounded-2xl bg-amber-50 p-4 ring-1 ring-amber-100"><div className="text-2xl font-black text-amber-900">{counts.scheduled}</div><div className="text-xs font-bold text-amber-700">Scheduled / 已排期</div></div>
          <div className="rounded-2xl bg-blue-50 p-4 ring-1 ring-blue-100"><div className="text-2xl font-black text-blue-900">{counts.published}</div><div className="text-xs font-bold text-blue-700">Published / 已发布</div></div>
          <div className="rounded-2xl bg-red-50 p-4 ring-1 ring-red-100"><div className="text-2xl font-black text-red-900">{counts.failed}</div><div className="text-xs font-bold text-red-700">Failed / 失败</div></div>
        </div>
      </SectionCard>

      {message ? <div className="rounded-2xl bg-blue-50 px-4 py-3 text-sm font-bold text-blue-800 ring-1 ring-blue-100">{message}</div> : null}

      <SectionCard title="Filters / 筛选" subtitle="Separate Website and Social publishing queues. / 区分官网和社媒发布队列。">
        <div className="grid gap-3 md:grid-cols-[220px_260px_auto_auto_auto]">
          <select className={inputClass} value={moduleFilter} onChange={(event) => setModuleFilter(event.target.value as ModuleFilter)}><option value="all">All Modules / 全部模块</option><option value="website">Website / 官网</option><option value="social">Social / 社媒</option></select>
          <select className={inputClass} value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}><option value="">All Statuses / 全部状态</option>{statuses.map((item) => <option key={item} value={item}>{item}</option>)}</select>
          <button type="button" onClick={loadRows} disabled={loading} className="rounded-2xl bg-slate-900 px-4 py-2 text-sm font-black text-white hover:bg-slate-700 disabled:opacity-60">Refresh / 刷新</button>
          <button type="button" onClick={() => edit(null, 'website')} className="rounded-2xl bg-activeBlue px-4 py-2 text-sm font-black text-white hover:bg-blue-700">New Website Item / 新增官网发布</button>
          <button type="button" onClick={() => edit(null, 'social')} className="rounded-2xl bg-cyan-600 px-4 py-2 text-sm font-black text-white hover:bg-cyan-700">New Social Item / 新增社媒发布</button>
        </div>
      </SectionCard>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_520px]">
        <SectionCard title="Publish Queue / 发布队列" subtitle="Ready, scheduled, published and failed items across Website and Social. / 官网和社媒的待发布、排期、已发布、失败列表。">
          <div className="overflow-x-auto rounded-2xl border border-slate-200">
            <table className="min-w-[1180px] w-full text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="p-3">Module</th><th className="p-3">Status</th><th className="p-3">Gate</th><th className="p-3">Title</th><th className="p-3">Platform</th><th className="p-3">Source</th><th className="p-3">Schedule</th><th className="p-3">Action</th></tr></thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((row) => <tr key={String(row.publish_item_id)} className="hover:bg-blue-50/50"><td className="p-3"><Badge tone={tone(row.module)}>{formatValue(row.module)}</Badge></td><td className="p-3"><Badge tone={tone(row.status)}>{formatValue(row.status)}</Badge></td><td className="p-3"><Badge tone={gatePassed(row) ? 'green' : 'amber'}>{gatePassed(row) ? 'passed' : 'needs checks'}</Badge></td><td className="max-w-80 truncate p-3 font-black text-slate-900">{formatValue(row.title)}</td><td className="p-3 font-semibold text-slate-700">{formatValue(row.platform)}</td><td className="p-3 text-slate-600">{formatValue(row.source_type)}</td><td className="p-3 text-slate-500">{formatValue(row.scheduled_at)}</td><td className="p-3"><button type="button" onClick={() => edit(row)} className="rounded-xl bg-white px-3 py-2 text-xs font-black text-activeBlue ring-1 ring-blue-100 hover:bg-blue-50">Open / 打开</button></td></tr>)}
                {!rows.length ? <tr><td colSpan={8} className="p-6 text-center text-sm font-bold text-slate-500">{loading ? 'Loading...' : 'No publish items yet. / 暂无发布项目。'}</td></tr> : null}
              </tbody></table>
          </div>
        </SectionCard>

        <SectionCard title={selected ? 'Edit Publish Item / 编辑发布项目' : 'Create Publish Item / 创建发布项目'} subtitle="This is the final manual publishing gate. / 这是最终人工发布门禁。">
          <div className="space-y-4">
            <div className="grid gap-3 md:grid-cols-2"><label><span className={labelClass}>Module / 模块</span><select className={inputClass} value={currentModule} onChange={(event) => updateModule(event.target.value as 'website' | 'social')}>{modules.map((item) => <option key={item} value={item}>{item}</option>)}</select></label><label><span className={labelClass}>Status / 状态</span><select className={inputClass} value={String(form.status || 'ready_to_publish')} onChange={(event) => setForm((current) => ({ ...current, status: event.target.value }))}>{statuses.map((item) => <option key={item} value={item}>{item}</option>)}</select></label></div>
            <label><span className={labelClass}>Title / 标题</span><input className={inputClass} value={String(form.title || '')} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} /></label>
            <div className="grid gap-3 md:grid-cols-2"><label><span className={labelClass}>Platform / 平台</span><select className={inputClass} value={String(form.platform || platforms[0])} onChange={(event) => setForm((current) => ({ ...current, platform: event.target.value }))}>{platforms.map((item) => <option key={item} value={item}>{item}</option>)}</select></label><label><span className={labelClass}>Source Type / 来源</span><select className={inputClass} value={String(form.source_type || 'manual_upload')} onChange={(event) => setForm((current) => ({ ...current, source_type: event.target.value }))}>{sourceTypes.map((item) => <option key={item} value={item}>{item}</option>)}</select></label></div>
            <label><span className={labelClass}>Route Path / Website URL Path / 官网路径</span><input className={inputClass} value={String(form.route_path || '')} onChange={(event) => setForm((current) => ({ ...current, route_path: event.target.value }))} /></label>
            <label><span className={labelClass}>Final Asset URL / 最终成品 URL</span><input className={inputClass} value={String(form.final_asset_url || '')} onChange={(event) => setForm((current) => ({ ...current, final_asset_url: event.target.value }))} /></label>
            <label><span className={labelClass}>Thumbnail URL / 封面 URL</span><input className={inputClass} value={String(form.thumbnail_url || '')} onChange={(event) => setForm((current) => ({ ...current, thumbnail_url: event.target.value }))} /></label>
            <label><span className={labelClass}>Caption / 文案</span><textarea className={`${inputClass} min-h-24`} value={String(form.caption || '')} onChange={(event) => setForm((current) => ({ ...current, caption: event.target.value }))} /></label>
            <label><span className={labelClass}>Scheduled At / 排期时间</span><input className={inputClass} type="datetime-local" value={String(form.scheduled_at || '').slice(0, 16)} onChange={(event) => setForm((current) => ({ ...current, scheduled_at: event.target.value }))} /></label>
            <div className="rounded-2xl bg-amber-50 p-3 text-xs font-bold text-amber-800 ring-1 ring-amber-100">Final Publish Gate must pass before Publish Now or Schedule. AI auto-publish remains disabled. / 发布或排期前必须通过最终发布检查，AI 默认不能自动发布。</div>
            <label><span className={labelClass}>Final Publish Gate JSON / 最终发布检查 JSON</span><textarea className={`${inputClass} min-h-36 font-mono text-xs`} value={gateJson} onChange={(event) => setGateJson(event.target.value)} /></label>
            <label><span className={labelClass}>Snapshot JSON / 发布快照 JSON</span><textarea className={`${inputClass} min-h-28 font-mono text-xs`} value={snapshotJson} onChange={(event) => setSnapshotJson(event.target.value)} /></label>
            <div className="flex flex-wrap gap-2"><button type="button" disabled={saving} onClick={() => void save()} className="rounded-2xl bg-activeBlue px-4 py-2 text-sm font-black text-white hover:bg-blue-700 disabled:opacity-60">Save / 保存</button><button type="button" disabled={saving || !selected} onClick={() => void action('publish_now')} className="rounded-2xl bg-emerald-600 px-4 py-2 text-sm font-black text-white hover:bg-emerald-700 disabled:opacity-60">Publish Now / 立即发布</button><button type="button" disabled={saving || !selected} onClick={() => void action('schedule_publish', { scheduled_at: form.scheduled_at })} className="rounded-2xl bg-amber-500 px-4 py-2 text-sm font-black text-white hover:bg-amber-600 disabled:opacity-60">Schedule / 排期</button><button type="button" disabled={saving || !selected} onClick={() => void action('push_back_to_review', { reason: 'Pushed back from Publish Center.' })} className="rounded-2xl bg-slate-700 px-4 py-2 text-sm font-black text-white hover:bg-slate-800 disabled:opacity-60">Push Back / 退回审核</button></div>
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
