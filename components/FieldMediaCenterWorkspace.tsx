'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Badge } from './Badge';
import { SectionCard } from './SectionCard';
import { MediaSourcePicker } from './MediaSourcePicker';

type Row = Record<string, unknown>;

const inputClass = 'w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 outline-none transition focus:border-activeBlue focus:ring-2 focus:ring-blue-100';
const labelClass = 'mb-1 block text-xs font-black uppercase tracking-[0.12em] text-slate-500';
const objectTypes = ['customer','lead','service_request','job','engineer_inspection','quotation','invoice','payment','warranty','material','supplier','other'];
const uploadStages = ['customer_before_submit','intake_review','engineer_before','engineer_during','engineer_after','quotation_support','invoice_support','warranty_proof','payment_proof','general'];
const visibilities = ['admin_internal','customer_visible','engineer_visible','public_approved'];
const statuses = ['active','review_required','approved','rejected','archived','deleted'];

function formatValue(value: unknown) {
  if (value === null || value === undefined || value === '') return '—';
  if (Array.isArray(value)) return value.join(', ');
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

function tone(value: unknown): 'blue' | 'green' | 'amber' | 'red' | 'gray' | 'cyan' {
  const text = String(value || '').toLowerCase();
  if (/(active|approved|customer_visible|engineer_after|warranty|job)/.test(text)) return 'green';
  if (/(review|intake|during|quotation|invoice|payment|engineer)/.test(text)) return 'amber';
  if (/(rejected|deleted|archived)/.test(text)) return 'red';
  if (/(customer|service|lead|media|public)/.test(text)) return 'cyan';
  return 'blue';
}

function safeJsonString(value: unknown, fallback: Row = {}) {
  if (!value) return JSON.stringify(fallback, null, 2);
  if (typeof value === 'string') return value;
  return JSON.stringify(value, null, 2);
}

function parseJson(value: string) {
  try { return JSON.parse(value || '{}'); } catch { return null; }
}

function assetFromLink(link: Row) {
  return link.media_assets && typeof link.media_assets === 'object' ? link.media_assets as Row : {};
}

export function FieldMediaCenterWorkspace() {
  const [links, setLinks] = useState<Row[]>([]);
  const [search, setSearch] = useState('');
  const [objectType, setObjectType] = useState('service_request');
  const [objectId, setObjectId] = useState('');
  const [uploadStage, setUploadStage] = useState('general');
  const [visibility, setVisibility] = useState('admin_internal');
  const [status, setStatus] = useState('active');
  const [referenceLabel, setReferenceLabel] = useState('');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState('');
  const [metadataJson, setMetadataJson] = useState(safeJsonString({ source: 'field_media_center', admin_review_required: true }));
  const [selectedLink, setSelectedLink] = useState<Row | null>(null);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  async function loadLinks() {
    setLoading(true);
    setMessage('');
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (objectType) params.set('object_type', objectType);
    if (objectId) params.set('object_id', objectId);
    if (uploadStage) params.set('upload_stage', uploadStage);
    if (visibility) params.set('visibility', visibility);
    if (status) params.set('status', status);
    const response = await fetch(`/api/admin/field-media?${params.toString()}`, { cache: 'no-store' });
    const json = await response.json().catch(() => ({}));
    setLoading(false);
    if (!response.ok || !json.ok) return setMessage(json.error || 'Load failed. / 加载失败。');
    setLinks(json.links || []);
  }

  useEffect(() => { void loadLinks(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  function resetForm() {
    setSelectedLink(null);
    setReferenceLabel('');
    setDescription('');
    setTags('');
    setMetadataJson(safeJsonString({ source: 'field_media_center', admin_review_required: true }));
    setStatus('active');
  }

  function open(link: Row) {
    setSelectedLink(link);
    setObjectType(String(link.object_type || 'service_request'));
    setObjectId(String(link.object_id || ''));
    setUploadStage(String(link.upload_stage || 'general'));
    setVisibility(String(link.visibility || 'admin_internal'));
    setStatus(String(link.status || 'active'));
    setReferenceLabel(String(link.reference_label || ''));
    setDescription(String(link.description || ''));
    setTags(Array.isArray(link.tags) ? (link.tags as string[]).join(', ') : '');
    setMetadataJson(safeJsonString(link.metadata_json || { source: 'field_media_center' }));
  }

  async function createLink(asset: Row) {
    const metadata = parseJson(metadataJson);
    if (metadata === null) return setMessage('Metadata JSON is invalid. / Metadata JSON 格式错误。');
    setSaving(true);
    setMessage('');
    const response = await fetch('/api/admin/field-media', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        asset_id: asset.asset_id,
        object_type: objectType,
        object_id: objectId || null,
        upload_stage: uploadStage,
        visibility,
        status,
        reference_label: referenceLabel || asset.title || asset.original_filename || 'Field media attachment',
        description,
        tags,
        module_key: 'field_operations',
        usage_context: `${objectType}_${uploadStage}`,
        metadata_json: { ...metadata, selected_asset: { asset_id: asset.asset_id, asset_url: asset.asset_url, storage_path: asset.storage_path, source_type: asset.source_type }, object_type: objectType, upload_stage: uploadStage, visibility }
      })
    });
    const json = await response.json().catch(() => ({}));
    setSaving(false);
    if (!response.ok || !json.ok) return setMessage(json.error || 'Create field media link failed. / 现场素材关联失败。');
    setMessage('Field media linked. / 现场素材已关联。');
    await loadLinks();
    open(json.link);
  }

  async function updateLink(nextStatus?: string) {
    if (!selectedLink?.link_id) return setMessage('Open a media link first. / 请先打开一条素材关联。');
    const metadata = parseJson(metadataJson);
    if (metadata === null) return setMessage('Metadata JSON is invalid. / Metadata JSON 格式错误。');
    setSaving(true);
    setMessage('');
    const response = await fetch('/api/admin/field-media', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        link_id: selectedLink.link_id,
        object_type: objectType,
        object_id: objectId || null,
        upload_stage: uploadStage,
        visibility,
        status: nextStatus || status,
        reference_label: referenceLabel,
        description,
        tags,
        module_key: 'field_operations',
        usage_context: `${objectType}_${uploadStage}`,
        metadata_json: metadata
      })
    });
    const json = await response.json().catch(() => ({}));
    setSaving(false);
    if (!response.ok || !json.ok) return setMessage(json.error || 'Update failed. / 更新失败。');
    setMessage('Field media link updated. / 现场素材关联已更新。');
    await loadLinks();
    open(json.link);
  }

  const stats = useMemo(() => ({ total: links.length, customerVisible: links.filter((link) => link.visibility === 'customer_visible').length, engineerVisible: links.filter((link) => link.visibility === 'engineer_visible').length, review: links.filter((link) => link.status === 'review_required').length }), [links]);

  return (
    <div className="space-y-5">
      <SectionCard title="Field Media Center / 现场素材中心" subtitle="Central media intake for customer repair photos, service request attachments, engineer inspection images/videos, job progress, invoices, payments and warranty proof. / 统一管理客户报修照片、报修附件、工程师查验图片/视频、工单进度、发票、付款和保修证明素材。">
        <div className="grid gap-3 md:grid-cols-4">
          <div className="rounded-2xl bg-blue-50 p-4 ring-1 ring-blue-100"><div className="text-2xl font-black text-blue-900">{stats.total}</div><div className="text-xs font-bold text-blue-700">Total media links / 素材关联</div></div>
          <div className="rounded-2xl bg-emerald-50 p-4 ring-1 ring-emerald-100"><div className="text-2xl font-black text-emerald-900">{stats.customerVisible}</div><div className="text-xs font-bold text-emerald-700">Customer visible / 客户可见</div></div>
          <div className="rounded-2xl bg-cyan-50 p-4 ring-1 ring-cyan-100"><div className="text-2xl font-black text-cyan-900">{stats.engineerVisible}</div><div className="text-xs font-bold text-cyan-700">Engineer visible / 工程师可见</div></div>
          <div className="rounded-2xl bg-amber-50 p-4 ring-1 ring-amber-100"><div className="text-2xl font-black text-amber-900">{stats.review}</div><div className="text-xs font-bold text-amber-700">Review required / 待审核</div></div>
        </div>
      </SectionCard>

      {message ? <div className="rounded-2xl bg-blue-50 px-4 py-3 text-sm font-bold text-blue-800 ring-1 ring-blue-100">{message}</div> : null}

      <SectionCard title="Filters & Target Object / 筛选与关联对象" subtitle="Set the target object before uploading/selecting media. Object ID can be left empty for unassigned intake media. / 上传或选择素材前设置关联对象；未分配素材可暂时不填 Object ID。">
        <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
          <input className={inputClass} value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search / 搜索" />
          <select className={inputClass} value={objectType} onChange={(event) => setObjectType(event.target.value)}>{objectTypes.map((item) => <option key={item} value={item}>{item}</option>)}</select>
          <input className={inputClass} value={objectId} onChange={(event) => setObjectId(event.target.value)} placeholder="Object UUID / 对象ID" />
          <select className={inputClass} value={uploadStage} onChange={(event) => setUploadStage(event.target.value)}>{uploadStages.map((item) => <option key={item} value={item}>{item}</option>)}</select>
          <select className={inputClass} value={visibility} onChange={(event) => setVisibility(event.target.value)}>{visibilities.map((item) => <option key={item} value={item}>{item}</option>)}</select>
          <button type="button" onClick={loadLinks} disabled={loading} className="rounded-2xl bg-slate-900 px-4 py-2 text-sm font-black text-white hover:bg-slate-700 disabled:opacity-60">Search / 搜索</button>
        </div>
      </SectionCard>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_560px]">
        <SectionCard title="Linked Field Media / 已关联现场素材" subtitle="Open records to approve, archive or change visibility. / 打开记录可审批、归档或调整可见范围。">
          <div className="overflow-x-auto rounded-2xl border border-slate-200">
            <table className="min-w-[1120px] w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="p-3">Status</th><th className="p-3">Object</th><th className="p-3">Stage</th><th className="p-3">Visibility</th><th className="p-3">Label</th><th className="p-3">Media</th><th className="p-3">Created</th><th className="p-3">Action</th></tr></thead>
              <tbody className="divide-y divide-slate-100">
                {links.map((link) => {
                  const asset = assetFromLink(link);
                  return <tr key={String(link.link_id)} className="hover:bg-blue-50/50"><td className="p-3"><Badge tone={tone(link.status)}>{formatValue(link.status)}</Badge></td><td className="p-3"><div className="font-black text-slate-800">{formatValue(link.object_type)}</div><div className="font-mono text-xs text-slate-500">{formatValue(link.object_id)}</div></td><td className="p-3"><Badge tone={tone(link.upload_stage)}>{formatValue(link.upload_stage)}</Badge></td><td className="p-3"><Badge tone={tone(link.visibility)}>{formatValue(link.visibility)}</Badge></td><td className="max-w-60 truncate p-3 font-semibold text-slate-700">{formatValue(link.reference_label)}</td><td className="max-w-72 truncate p-3 text-xs font-semibold text-blue-700">{formatValue(asset.title || asset.asset_url || asset.storage_path)}</td><td className="p-3 text-slate-500">{formatValue(link.created_at)}</td><td className="p-3"><button type="button" onClick={() => open(link)} className="rounded-xl bg-white px-3 py-2 text-xs font-black text-activeBlue ring-1 ring-blue-100 hover:bg-blue-50">Open / 打开</button></td></tr>;
                })}
                {!links.length ? <tr><td colSpan={8} className="p-6 text-center text-sm font-bold text-slate-500">{loading ? 'Loading...' : 'No field media links. / 暂无现场素材关联。'}</td></tr> : null}
              </tbody>
            </table>
          </div>
        </SectionCard>

        <SectionCard title="Upload / Select Field Media / 上传或选择现场素材" subtitle="Use local upload, URL import, or backend media library. / 支持本地上传、URL 导入或后台素材库。">
          <div className="space-y-4">
            <div className="grid gap-3 md:grid-cols-2">
              <label><span className={labelClass}>Reference Label / 标签</span><input className={inputClass} value={referenceLabel} onChange={(event) => setReferenceLabel(event.target.value)} placeholder="Toilet leak before repair" /></label>
              <label><span className={labelClass}>Status / 状态</span><select className={inputClass} value={status} onChange={(event) => setStatus(event.target.value)}>{statuses.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
              <label className="md:col-span-2"><span className={labelClass}>Description / 描述</span><textarea className={`${inputClass} min-h-20`} value={description} onChange={(event) => setDescription(event.target.value)} /></label>
              <label className="md:col-span-2"><span className={labelClass}>Tags / 标签</span><input className={inputClass} value={tags} onChange={(event) => setTags(event.target.value)} placeholder="leak, hdb, before, inspection" /></label>
              <label className="md:col-span-2"><span className={labelClass}>Metadata JSON / 元数据</span><textarea className={`${inputClass} min-h-28 font-mono text-xs`} value={metadataJson} onChange={(event) => setMetadataJson(event.target.value)} /></label>
            </div>

            {selectedLink ? <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200"><div className="mb-2 text-xs font-black uppercase tracking-[0.12em] text-slate-500">Selected Link / 当前关联</div><div className="text-sm font-black text-slate-900">{formatValue(selectedLink.reference_label)}</div><div className="mt-2 flex flex-wrap gap-2"><button type="button" disabled={saving} onClick={() => updateLink('approved')} className="rounded-xl bg-emerald-50 px-3 py-2 text-xs font-black text-emerald-700 ring-1 ring-emerald-100">Approve / 批准</button><button type="button" disabled={saving} onClick={() => updateLink('review_required')} className="rounded-xl bg-amber-50 px-3 py-2 text-xs font-black text-amber-700 ring-1 ring-amber-100">Review / 待审核</button><button type="button" disabled={saving} onClick={() => updateLink('archived')} className="rounded-xl bg-slate-100 px-3 py-2 text-xs font-black text-slate-700 ring-1 ring-slate-200">Archive / 归档</button><button type="button" disabled={saving} onClick={() => updateLink()} className="rounded-xl bg-activeBlue px-3 py-2 text-xs font-black text-white">Save / 保存</button><button type="button" onClick={resetForm} className="rounded-xl bg-white px-3 py-2 text-xs font-black text-slate-700 ring-1 ring-slate-200">New / 新增</button></div></div> : null}

            <MediaSourcePicker moduleKey="field_operations" usageContext={`${objectType}_${uploadStage}`} title="Field Attachment Source / 现场附件素材来源" helper="Upload customer photos, engineer inspection videos, job progress images, payment proof or warranty documents from local computer, URL, or backend library. / 上传客户照片、工程师查验视频、施工进度图、付款证明或保修文件，支持本地电脑、URL 或素材库。" onSelect={createLink} />
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
