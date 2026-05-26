'use client';

import { useEffect, useState } from 'react';
import { Badge } from './Badge';

type Row = Record<string, unknown>;
type SourceTab = 'local' | 'url' | 'library';

type Props = {
  moduleKey: string;
  usageContext: string;
  title?: string;
  helper?: string;
  onSelect: (asset: Row) => void;
  compact?: boolean;
};

const inputClass = 'w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 outline-none transition focus:border-activeBlue focus:ring-2 focus:ring-blue-100';
const labelClass = 'mb-1 block text-xs font-black uppercase tracking-[0.12em] text-slate-500';

function formatValue(value: unknown) {
  if (value === null || value === undefined || value === '') return '—';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

function tone(value: unknown): 'blue' | 'green' | 'amber' | 'red' | 'gray' | 'cyan' {
  const text = String(value || '').toLowerCase();
  if (/(local|active|image|gif|selected)/.test(text)) return 'green';
  if (/(url|draft|video)/.test(text)) return 'amber';
  if (/(blocked|deleted|failed)/.test(text)) return 'red';
  if (/(library|pdf)/.test(text)) return 'cyan';
  return 'blue';
}

function isImage(asset: Row) {
  const mime = String(asset.mime_type || '').toLowerCase();
  const url = String(asset.asset_url || '').toLowerCase();
  return mime.startsWith('image/') || /\.(png|jpe?g|webp|gif)(\?|$)/.test(url);
}

export function MediaSourcePicker({ moduleKey, usageContext, title = 'Media Source / 素材来源', helper = 'Upload from local computer, import by URL, or select from the backend media library. / 支持本地电脑上传、URL 链接导入、后台素材库选择。', onSelect, compact = false }: Props) {
  const [tab, setTab] = useState<SourceTab>('local');
  const [assets, setAssets] = useState<Row[]>([]);
  const [search, setSearch] = useState('');
  const [url, setUrl] = useState('');
  const [assetTitle, setAssetTitle] = useState('');
  const [altText, setAltText] = useState('');
  const [tags, setTags] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  async function loadAssets() {
    setLoading(true);
    const params = new URLSearchParams({ module_key: moduleKey, status: 'active' });
    if (search) params.set('search', search);
    const response = await fetch(`/api/admin/media-library?${params.toString()}`, { cache: 'no-store' });
    const json = await response.json().catch(() => ({}));
    setLoading(false);
    if (!response.ok || !json.ok) {
      setMessage(json.error || 'Media library load failed. / 素材库加载失败。');
      return;
    }
    setAssets(json.assets || []);
  }

  useEffect(() => { void loadAssets(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [moduleKey, usageContext]);

  function emit(asset: Row) {
    onSelect(asset);
    setMessage('Media selected and applied to the editor. / 素材已选择并填入当前编辑模块。');
  }

  async function uploadLocal() {
    if (!file) return setMessage('Please choose a local file first. / 请先选择本地文件。');
    setSaving(true);
    setMessage('');
    const form = new FormData();
    form.append('file', file);
    form.append('module_key', moduleKey);
    form.append('usage_context', usageContext);
    form.append('title', assetTitle || file.name);
    form.append('alt_text', altText);
    form.append('tags', tags);
    form.append('metadata_json', JSON.stringify({ uploaded_from: 'admin_media_source_picker', module_key: moduleKey, usage_context: usageContext }));
    const response = await fetch('/api/admin/media-library', { method: 'POST', body: form });
    const json = await response.json().catch(() => ({}));
    setSaving(false);
    if (!response.ok || !json.ok) return setMessage(json.error || 'Upload failed. / 上传失败。');
    setFile(null);
    setAssetTitle('');
    setAltText('');
    setTags('');
    emit(json.asset);
    await loadAssets();
  }

  async function importUrl() {
    if (!url) return setMessage('Please enter a URL first. / 请先输入 URL。');
    setSaving(true);
    setMessage('');
    const response = await fetch('/api/admin/media-library', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'create_url_asset',
        source_type: 'url_import',
        module_key: moduleKey,
        usage_context: usageContext,
        asset_url: url,
        title: assetTitle || url,
        alt_text: altText,
        tags,
        metadata_json: { imported_from: 'admin_media_source_picker', module_key: moduleKey, usage_context: usageContext }
      })
    });
    const json = await response.json().catch(() => ({}));
    setSaving(false);
    if (!response.ok || !json.ok) return setMessage(json.error || 'URL import failed. / URL 导入失败。');
    setUrl('');
    setAssetTitle('');
    setAltText('');
    setTags('');
    emit(json.asset);
    await loadAssets();
  }

  async function selectLibrary(asset: Row) {
    setSaving(true);
    setMessage('');
    const response = await fetch('/api/admin/media-library', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'select_library_asset',
        asset_id: asset.asset_id,
        module_key: moduleKey,
        usage_context: usageContext,
        title: asset.title,
        alt_text: asset.alt_text,
        tags: asset.tags,
        metadata_json: { selected_from: 'backend_media_library', selected_from_asset_id: asset.asset_id }
      })
    });
    const json = await response.json().catch(() => ({}));
    setSaving(false);
    if (!response.ok || !json.ok) return setMessage(json.error || 'Library selection failed. / 素材库选择失败。');
    emit(json.asset);
    await loadAssets();
  }

  return (
    <div className={`rounded-3xl bg-white ${compact ? 'p-4' : 'p-5'} shadow-soft ring-1 ring-slate-200`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-xs font-black uppercase tracking-[0.16em] text-activeBlue">{title}</div>
          <p className="mt-1 text-sm font-semibold leading-6 text-slate-600">{helper}</p>
        </div>
        <div className="flex flex-wrap gap-2"><Badge tone="green">Local Upload</Badge><Badge tone="amber">URL Import</Badge><Badge tone="cyan">Media Library</Badge></div>
      </div>
      {message ? <div className="mt-3 rounded-2xl bg-blue-50 px-4 py-3 text-sm font-bold text-blue-800 ring-1 ring-blue-100">{message}</div> : null}
      <div className="mt-4 grid gap-2 sm:grid-cols-3">
        {(['local', 'url', 'library'] as SourceTab[]).map((item) => <button key={item} type="button" onClick={() => setTab(item)} className={`rounded-2xl border px-4 py-3 text-left text-sm font-black transition ${tab === item ? 'border-activeBlue bg-blue-50 text-activeBlue shadow-sm' : 'border-slate-200 bg-white text-slate-700 hover:border-activeBlue hover:text-activeBlue'}`}>{item === 'local' ? 'Local Computer / 本地上传' : item === 'url' ? 'URL Link / 链接导入' : 'Media Library / 素材库'}</button>)}
      </div>

      {tab === 'local' ? <div className="mt-4 grid gap-3 md:grid-cols-2">
        <label className="md:col-span-2"><span className={labelClass}>Choose File / 选择本地文件</span><input className={inputClass} type="file" accept="image/*,video/mp4,video/webm,application/pdf" onChange={(event) => setFile(event.target.files?.[0] || null)} /></label>
        <label><span className={labelClass}>Title / 标题</span><input className={inputClass} value={assetTitle} onChange={(event) => setAssetTitle(event.target.value)} /></label>
        <label><span className={labelClass}>Alt Text / SEO 图片说明</span><input className={inputClass} value={altText} onChange={(event) => setAltText(event.target.value)} /></label>
        <label className="md:col-span-2"><span className={labelClass}>Tags / 标签</span><input className={inputClass} value={tags} onChange={(event) => setTags(event.target.value)} placeholder="hero, leak detection, hdb" /></label>
        <button type="button" disabled={saving} onClick={uploadLocal} className="rounded-2xl bg-activeBlue px-5 py-3 text-sm font-black text-white hover:bg-blue-700 disabled:opacity-60">Upload & Use / 上传并使用</button>
      </div> : null}

      {tab === 'url' ? <div className="mt-4 grid gap-3 md:grid-cols-2">
        <label className="md:col-span-2"><span className={labelClass}>Asset URL / 素材 URL</span><input className={inputClass} value={url} onChange={(event) => setUrl(event.target.value)} placeholder="https://..." /></label>
        <label><span className={labelClass}>Title / 标题</span><input className={inputClass} value={assetTitle} onChange={(event) => setAssetTitle(event.target.value)} /></label>
        <label><span className={labelClass}>Alt Text / SEO 图片说明</span><input className={inputClass} value={altText} onChange={(event) => setAltText(event.target.value)} /></label>
        <label className="md:col-span-2"><span className={labelClass}>Tags / 标签</span><input className={inputClass} value={tags} onChange={(event) => setTags(event.target.value)} placeholder="social, quotation, waterproofing" /></label>
        <button type="button" disabled={saving} onClick={importUrl} className="rounded-2xl bg-activeBlue px-5 py-3 text-sm font-black text-white hover:bg-blue-700 disabled:opacity-60">Import URL & Use / 导入链接并使用</button>
      </div> : null}

      {tab === 'library' ? <div className="mt-4">
        <div className="mb-3 grid gap-3 md:grid-cols-[minmax(0,1fr)_auto]"><input className={inputClass} value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search title, alt, URL, path... / 搜索素材" /><button type="button" onClick={loadAssets} className="rounded-2xl bg-slate-900 px-5 py-2 text-sm font-black text-white hover:bg-slate-700">Search / 搜索</button></div>
        <div className="grid max-h-[420px] gap-3 overflow-auto md:grid-cols-2">
          {assets.map((asset) => <button key={String(asset.asset_id)} type="button" disabled={saving} onClick={() => selectLibrary(asset)} className="rounded-2xl bg-slate-50 p-3 text-left ring-1 ring-slate-200 hover:bg-blue-50 hover:ring-blue-100 disabled:opacity-60">
            {isImage(asset) && asset.asset_url ? <img src={String(asset.asset_url)} alt={String(asset.alt_text || asset.title || 'Media asset')} className="mb-3 h-28 w-full rounded-xl object-cover" /> : <div className="mb-3 flex h-28 items-center justify-center rounded-xl bg-white text-xs font-black text-slate-500 ring-1 ring-slate-200">{formatValue(asset.mime_type || asset.source_type)}</div>}
            <div className="truncate text-sm font-black text-slate-900">{formatValue(asset.title || asset.original_filename || asset.asset_url)}</div>
            <div className="mt-1 truncate text-xs font-semibold text-slate-500">{formatValue(asset.asset_url || asset.storage_path)}</div>
            <div className="mt-2 flex flex-wrap gap-2"><Badge tone={tone(asset.source_type)}>{formatValue(asset.source_type)}</Badge><Badge tone={tone(asset.mime_type)}>{formatValue(asset.mime_type || 'media')}</Badge></div>
          </button>)}
          {!assets.length ? <div className="rounded-2xl bg-slate-50 p-5 text-center text-sm font-bold text-slate-500 ring-1 ring-slate-200">{loading ? 'Loading media...' : 'No media found. / 暂无素材。'}</div> : null}
        </div>
      </div> : null}
    </div>
  );
}
