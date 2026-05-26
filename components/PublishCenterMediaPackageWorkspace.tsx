'use client';

import { useEffect, useMemo, useState } from 'react';
import { Badge } from './Badge';
import { SectionCard } from './SectionCard';
import { PublishCenterMediaPanel } from './PublishCenterMediaPanel';

type Row = Record<string, unknown>;

const inputClass = 'w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 outline-none transition focus:border-activeBlue focus:ring-2 focus:ring-blue-100';
const labelClass = 'mb-1 block text-xs font-black uppercase tracking-[0.12em] text-slate-500';
const modules = ['all', 'website', 'social'];
const statuses = ['all', 'ready_to_publish', 'scheduled', 'publishing', 'published', 'failed', 'pushed_back_to_review', 'cancelled'];

function formatValue(value: unknown) {
  if (value === null || value === undefined || value === '') return '—';
  if (Array.isArray(value)) return value.join(', ');
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

function tone(status: unknown): 'blue' | 'green' | 'amber' | 'red' | 'gray' | 'cyan' {
  const text = String(status || '').toLowerCase();
  if (/(published|ready|approved|website)/.test(text)) return 'green';
  if (/(scheduled|publishing|review|pending)/.test(text)) return 'amber';
  if (/(failed|cancelled|pushed)/.test(text)) return 'red';
  if (/(social|media)/.test(text)) return 'cyan';
  return 'blue';
}

function safeJsonString(value: unknown, fallback: Row | Row[] = {}) {
  if (!value) return JSON.stringify(fallback, null, 2);
  if (typeof value === 'string') return value;
  return JSON.stringify(value, null, 2);
}

function parseJson(value: string) {
  try { return JSON.parse(value || '{}'); } catch { return null; }
}

function defaultGate(module: string) {
  return module === 'social'
    ? { ratio_ok: false, thumbnail_ok: false, caption_ok: false, hashtag_ok: false, video_rendered_ok: false, account_connected_ok: false, media_package_ok: false }
    : { seo_ok: false, mobile_ok: false, cta_ok: false, alt_ok: false, broken_image_ok: false, cls_ok: false, media_package_ok: false };
}

export function PublishCenterMediaPackageWorkspace() {
  const [rows, setRows] = useState<Row[]>([]);
  const [moduleFilter, setModuleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selected, setSelected] = useState<Row | null>(null);
  const [mediaAssets, setMediaAssets] = useState<Row[]>([]);
  const [gateJson, setGateJson] = useState(safeJsonString(defaultGate('website')));
  const [snapshotJson, setSnapshotJson] = useState(safeJsonString({ ai_auto_publish_allowed: false, media_source_picker_required: true }));
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  async function loadRows() {
    setLoading(true);
    setMessage('');
    const params = new URLSearchParams();
    if (moduleFilter !== 'all') params.set('module', moduleFilter);
    if (statusFilter !== 'all') params.set('status', statusFilter);
    const response = await fetch(`/api/admin/publish-center?${params.toString()}`, { cache: 'no-store' });
    const json = await response.json().catch(() => ({}));
    setLoading(false);
    if (!response.ok || !json.ok) return setMessage(json.error || 'Load failed. / 加载失败。');
    setRows(json.rows || []);
  }

  useEffect(() => { void loadRows(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [moduleFilter, statusFilter]);

  function open(row: Row) {
    setSelected(row);
    setMediaAssets(Array.isArray(row.media_assets_json) ? row.media_assets_json as Row[] : []);
    setGateJson(safeJsonString(row.final_publish_gate || defaultGate(String(row.module || 'website'))));
    setSnapshotJson(safeJsonString(row.snapshot_json || { ai_auto_publish_allowed: false, media_source_picker_required: true }));
    setMessage('');
  }

  function applyAssetToGateAndSnapshot(assets: Row[]) {
    const gate = parseJson(gateJson);
    if (gate && typeof gate === 'object') setGateJson(safeJsonString({ ...gate, media_package_ok: assets.length > 0 }));
    const snapshot = parseJson(snapshotJson);
    if (snapshot && typeof snapshot === 'object') setSnapshotJson(safeJsonString({ ...snapshot, media_assets_count: assets.length, media_source_picker_required: true }));
  }

  function updateAssets(assets: Row[]) {
    setMediaAssets(assets);
    applyAssetToGateAndSnapshot(assets);
  }

  async function save() {
    if (!selected?.publish_item_id) return setMessage('Open a publish item first. / 请先打开一个发布项目。');
    const gate = parseJson(gateJson);
    const snapshot = parseJson(snapshotJson);
    if (gate === null) return setMessage('Final Publish Gate JSON is invalid. / 最终发布检查 JSON 格式错误。');
    if (snapshot === null) return setMessage('Snapshot JSON is invalid. / 快照 JSON 格式错误。');
    setSaving(true);
    setMessage('');
    const response = await fetch('/api/admin/publish-center', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...selected,
        publish_item_id: selected.publish_item_id,
        final_publish_gate: gate,
        snapshot_json: snapshot,
        media_assets_json: mediaAssets,
        source_type: mediaAssets.length ? 'media_library_package' : selected.source_type,
        final_asset_url: selected.final_asset_url || mediaAssets[0]?.asset_url || '',
        final_asset_storage_path: selected.final_asset_storage_path || mediaAssets[0]?.storage_path || '',
        thumbnail_url: selected.thumbnail_url || mediaAssets[0]?.asset_url || '',
        publish_package_json: {
          media_assets_json: mediaAssets,
          media_assets_count: mediaAssets.length,
          media_source_picker_required: true,
          admin_review_required: true,
          ai_auto_publish_allowed: false
        }
      })
    });
    const json = await response.json().catch(() => ({}));
    setSaving(false);
    if (!response.ok || !json.ok) return setMessage(json.error || 'Save failed. / 保存失败。');
    setMessage('Publish media package saved. / 发布素材包已保存。');
    await loadRows();
    open(json.row);
  }

  const stats = useMemo(() => {
    const withMedia = rows.filter((row) => Array.isArray(row.media_assets_json) && (row.media_assets_json as Row[]).length > 0).length;
    return { total: rows.length, withMedia, withoutMedia: rows.length - withMedia };
  }, [rows]);

  return (
    <div className="space-y-5">
      <SectionCard title="Publish Media Package Control / 发布素材包控制" subtitle="Bind final publish assets to Website or Social publish items using local upload, URL import or backend media library. / 使用本地上传、URL 导入或后台素材库，为官网或社媒发布项绑定最终素材包。">
        <div className="grid gap-3 md:grid-cols-3">
          <div className="rounded-2xl bg-blue-50 p-4 ring-1 ring-blue-100"><div className="text-2xl font-black text-blue-900">{stats.total}</div><div className="text-xs font-bold text-blue-700">Publish items / 发布项</div></div>
          <div className="rounded-2xl bg-emerald-50 p-4 ring-1 ring-emerald-100"><div className="text-2xl font-black text-emerald-900">{stats.withMedia}</div><div className="text-xs font-bold text-emerald-700">With media / 已绑定素材</div></div>
          <div className="rounded-2xl bg-amber-50 p-4 ring-1 ring-amber-100"><div className="text-2xl font-black text-amber-900">{stats.withoutMedia}</div><div className="text-xs font-bold text-amber-700">Need media check / 待素材确认</div></div>
        </div>
      </SectionCard>

      {message ? <div className="rounded-2xl bg-blue-50 px-4 py-3 text-sm font-bold text-blue-800 ring-1 ring-blue-100">{message}</div> : null}

      <SectionCard title="Filters / 筛选" subtitle="Choose a Website or Social publish item, then bind its final media package. / 选择官网或社媒发布项，再绑定最终素材包。">
        <div className="grid gap-3 md:grid-cols-[220px_260px_auto]">
          <select className={inputClass} value={moduleFilter} onChange={(event) => setModuleFilter(event.target.value)}>{modules.map((item) => <option key={item} value={item}>{item}</option>)}</select>
          <select className={inputClass} value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>{statuses.map((item) => <option key={item} value={item}>{item}</option>)}</select>
          <button type="button" disabled={loading} onClick={loadRows} className="rounded-2xl bg-slate-900 px-4 py-2 text-sm font-black text-white hover:bg-slate-700 disabled:opacity-60">Refresh / 刷新</button>
        </div>
      </SectionCard>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_560px]">
        <SectionCard title="Publish Items / 发布项" subtitle="Open an item to attach or update its final media package. / 打开发布项后可绑定或更新最终素材包。">
          <div className="overflow-x-auto rounded-2xl border border-slate-200">
            <table className="min-w-[980px] w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="p-3">Module</th><th className="p-3">Status</th><th className="p-3">Media</th><th className="p-3">Title</th><th className="p-3">Platform</th><th className="p-3">Action</th></tr></thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((row) => {
                  const assets = Array.isArray(row.media_assets_json) ? row.media_assets_json as Row[] : [];
                  return <tr key={String(row.publish_item_id)} className="hover:bg-blue-50/50"><td className="p-3"><Badge tone={tone(row.module)}>{formatValue(row.module)}</Badge></td><td className="p-3"><Badge tone={tone(row.status)}>{formatValue(row.status)}</Badge></td><td className="p-3"><Badge tone={assets.length ? 'cyan' : 'amber'}>{assets.length} media</Badge></td><td className="max-w-96 truncate p-3 font-black text-slate-900">{formatValue(row.title)}</td><td className="p-3 font-semibold text-slate-700">{formatValue(row.platform)}</td><td className="p-3"><button type="button" onClick={() => open(row)} className="rounded-xl bg-white px-3 py-2 text-xs font-black text-activeBlue ring-1 ring-blue-100 hover:bg-blue-50">Open / 打开</button></td></tr>;
                })}
                {!rows.length ? <tr><td colSpan={6} className="p-6 text-center text-sm font-bold text-slate-500">{loading ? 'Loading...' : 'No publish items yet. / 暂无发布项。'}</td></tr> : null}
              </tbody>
            </table>
          </div>
        </SectionCard>

        <SectionCard title="Final Media Package / 最终发布素材包" subtitle="Media Package OK will be written into the final publish gate. / Media Package OK 会写入最终发布检查门禁。">
          {selected ? <div className="space-y-4">
            <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200"><div className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">Selected Item / 当前发布项</div><div className="mt-1 text-lg font-black text-slate-950">{formatValue(selected.title)}</div><div className="mt-2 flex flex-wrap gap-2"><Badge tone={tone(selected.module)}>{formatValue(selected.module)}</Badge><Badge tone={tone(selected.status)}>{formatValue(selected.status)}</Badge><Badge tone="blue">{formatValue(selected.platform)}</Badge></div></div>
            <PublishCenterMediaPanel mediaAssets={mediaAssets} onChange={updateAssets} onAssetApplied={() => {}} />
            <label><span className={labelClass}>Final Publish Gate JSON / 最终发布检查 JSON</span><textarea className={`${inputClass} min-h-36 font-mono text-xs`} value={gateJson} onChange={(event) => setGateJson(event.target.value)} /></label>
            <label><span className={labelClass}>Snapshot JSON / 发布快照 JSON</span><textarea className={`${inputClass} min-h-28 font-mono text-xs`} value={snapshotJson} onChange={(event) => setSnapshotJson(event.target.value)} /></label>
            <button type="button" disabled={saving} onClick={save} className="rounded-2xl bg-activeBlue px-5 py-3 text-sm font-black text-white hover:bg-blue-700 disabled:opacity-60">Save Media Package / 保存素材包</button>
          </div> : <div className="rounded-2xl bg-slate-50 p-5 text-sm font-bold text-slate-500 ring-1 ring-slate-200">Open a publish item to bind media. / 请先打开一个发布项再绑定素材。</div>}
        </SectionCard>
      </div>
    </div>
  );
}
