'use client';

import { useEffect, useMemo, useState } from 'react';
import { Badge } from './Badge';
import { SectionCard } from './SectionCard';
import { MediaSourcePicker } from './MediaSourcePicker';

type Row = Record<string, unknown>;

const inputClass = 'w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 outline-none transition focus:border-activeBlue focus:ring-2 focus:ring-blue-100';
const labelClass = 'mb-1 block text-xs font-black uppercase tracking-[0.12em] text-slate-500';
const aiModules = ['general_ai','ai_analysis','material_suggestion','quotation_assistant','invoice_assistant','report_generator','risk_detection','seo_aeo_ai','social_ai','web_search_ai'];
const objectTypes = ['ai_context','lead','service_request','job','inspection','quotation','invoice','material','supplier','report','website_content','social_content','other'];
const usageContexts = ['ai_attachment','analysis_input','evidence_photo','inspection_video','material_reference','price_reference','quotation_reference','invoice_reference','report_source','seo_source','social_source','training_reference'];
const readinessStatuses = ['pending_review','approved_for_ai','blocked_for_ai','used_in_ai','archived'];
const privacyScopes = ['internal_only','customer_visible','engineer_visible','public_source','sensitive_restricted'];
const statuses = ['active','review_required','approved','rejected','archived','deleted'];

function formatValue(value: unknown) {
  if (value === null || value === undefined || value === '') return '—';
  if (Array.isArray(value)) return value.join(', ');
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

function tone(value: unknown): 'blue' | 'green' | 'amber' | 'red' | 'gray' | 'cyan' {
  const text = String(value || '').toLowerCase();
  if (/(approved|used|report|quotation|material|public_source)/.test(text)) return 'green';
  if (/(pending|review|analysis|invoice|seo|social|web_search)/.test(text)) return 'amber';
  if (/(blocked|sensitive|rejected|deleted|archived)/.test(text)) return 'red';
  if (/(ai|photo|video|reference|source)/.test(text)) return 'cyan';
  return 'blue';
}

function safeJsonString(value: unknown, fallback: Row = {}) {
  if (!value) return JSON.stringify(fallback, null, 2);
  if (typeof value === 'string') return value;
  return JSON.stringify(value, null, 2);
}

function parseJson(value: string) { try { return JSON.parse(value || '{}'); } catch { return null; } }
function assetFromLink(link: Row) { return link.media_assets && typeof link.media_assets === 'object' ? link.media_assets as Row : {}; }

export function AiMediaCenterWorkspace() {
  const [links, setLinks] = useState<Row[]>([]);
  const [search, setSearch] = useState('');
  const [aiModule, setAiModule] = useState('ai_analysis');
  const [objectType, setObjectType] = useState('service_request');
  const [objectId, setObjectId] = useState('');
  const [usageContext, setUsageContext] = useState('analysis_input');
  const [readiness, setReadiness] = useState('pending_review');
  const [privacy, setPrivacy] = useState('internal_only');
  const [status, setStatus] = useState('active');
  const [referenceLabel, setReferenceLabel] = useState('');
  const [promptHint, setPromptHint] = useState('');
  const [aiSummary, setAiSummary] = useState('');
  const [tags, setTags] = useState('');
  const [extractionJson, setExtractionJson] = useState(safeJsonString({ extracted_by: 'admin_review', confidence: null }));
  const [metadataJson, setMetadataJson] = useState(safeJsonString({ source: 'ai_media_center', admin_review_required: true }));
  const [selectedLink, setSelectedLink] = useState<Row | null>(null);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  async function loadLinks() {
    setLoading(true);
    setMessage('');
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (aiModule) params.set('ai_module', aiModule);
    if (objectType) params.set('object_type', objectType);
    if (readiness) params.set('ai_readiness_status', readiness);
    if (privacy) params.set('privacy_scope', privacy);
    if (status) params.set('status', status);
    const response = await fetch(`/api/admin/ai-media?${params.toString()}`, { cache: 'no-store' });
    const json = await response.json().catch(() => ({}));
    setLoading(false);
    if (!response.ok || !json.ok) return setMessage(json.error || 'Load failed. / 加载失败。');
    setLinks(json.links || []);
  }

  useEffect(() => { void loadLinks(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  function resetForm() {
    setSelectedLink(null);
    setReferenceLabel('');
    setPromptHint('');
    setAiSummary('');
    setTags('');
    setExtractionJson(safeJsonString({ extracted_by: 'admin_review', confidence: null }));
    setMetadataJson(safeJsonString({ source: 'ai_media_center', admin_review_required: true }));
  }

  function open(link: Row) {
    setSelectedLink(link);
    setAiModule(String(link.ai_module || 'ai_analysis'));
    setObjectType(String(link.object_type || 'ai_context'));
    setObjectId(String(link.object_id || ''));
    setUsageContext(String(link.usage_context || 'ai_attachment'));
    setReadiness(String(link.ai_readiness_status || 'pending_review'));
    setPrivacy(String(link.privacy_scope || 'internal_only'));
    setStatus(String(link.status || 'active'));
    setReferenceLabel(String(link.reference_label || ''));
    setPromptHint(String(link.ai_prompt_hint || ''));
    setAiSummary(String(link.ai_summary || ''));
    setTags(Array.isArray(link.tags) ? (link.tags as string[]).join(', ') : '');
    setExtractionJson(safeJsonString(link.extraction_json || {}));
    setMetadataJson(safeJsonString(link.metadata_json || {}));
  }

  async function createLink(asset: Row) {
    const extraction = parseJson(extractionJson);
    const metadata = parseJson(metadataJson);
    if (extraction === null) return setMessage('Extraction JSON is invalid. / 提取结果 JSON 格式错误。');
    if (metadata === null) return setMessage('Metadata JSON is invalid. / Metadata JSON 格式错误。');
    setSaving(true);
    setMessage('');
    const response = await fetch('/api/admin/ai-media', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        asset_id: asset.asset_id,
        ai_module: aiModule,
        object_type: objectType,
        object_id: objectId || null,
        usage_context: usageContext,
        ai_readiness_status: readiness,
        privacy_scope: privacy,
        status,
        reference_label: referenceLabel || asset.title || asset.original_filename || 'AI media attachment',
        ai_prompt_hint: promptHint,
        ai_summary: aiSummary,
        extraction_json: extraction,
        tags,
        metadata_json: { ...metadata, selected_asset: { asset_id: asset.asset_id, asset_url: asset.asset_url, storage_path: asset.storage_path, source_type: asset.source_type }, ai_module: aiModule, usage_context: usageContext, privacy_scope: privacy, ai_auto_action_allowed: false }
      })
    });
    const json = await response.json().catch(() => ({}));
    setSaving(false);
    if (!response.ok || !json.ok) return setMessage(json.error || 'AI media link failed. / AI 素材关联失败。');
    setMessage('AI media linked. / AI 素材已关联。');
    await loadLinks();
    open(json.link);
  }

  async function updateLink(nextReadiness?: string) {
    if (!selectedLink?.link_id) return setMessage('Open an AI media link first. / 请先打开一条 AI 素材关联。');
    const extraction = parseJson(extractionJson);
    const metadata = parseJson(metadataJson);
    if (extraction === null) return setMessage('Extraction JSON is invalid. / 提取结果 JSON 格式错误。');
    if (metadata === null) return setMessage('Metadata JSON is invalid. / Metadata JSON 格式错误。');
    setSaving(true);
    setMessage('');
    const response = await fetch('/api/admin/ai-media', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        link_id: selectedLink.link_id,
        ai_module: aiModule,
        object_type: objectType,
        object_id: objectId || null,
        usage_context: usageContext,
        ai_readiness_status: nextReadiness || readiness,
        privacy_scope: privacy,
        status,
        reference_label: referenceLabel,
        ai_prompt_hint: promptHint,
        ai_summary: aiSummary,
        extraction_json: extraction,
        tags,
        metadata_json: metadata
      })
    });
    const json = await response.json().catch(() => ({}));
    setSaving(false);
    if (!response.ok || !json.ok) return setMessage(json.error || 'Update failed. / 更新失败。');
    setMessage('AI media link updated. / AI 素材关联已更新。');
    await loadLinks();
    open(json.link);
  }

  const stats = useMemo(() => ({ total: links.length, approved: links.filter((link) => link.ai_readiness_status === 'approved_for_ai').length, blocked: links.filter((link) => link.ai_readiness_status === 'blocked_for_ai').length, sensitive: links.filter((link) => link.privacy_scope === 'sensitive_restricted').length }), [links]);

  return (
    <div className="space-y-5">
      <SectionCard title="AI Media Center / AI 素材中心" subtitle="Attach approved media and documents to AI analysis, quotation assistance, material suggestions, invoice assistance, reports, SEO/AEO and social AI workflows. / 为 AI 分析、报价辅助、材料建议、发票辅助、报告、SEO/AEO 和社媒 AI 工作流绑定已审核素材。">
        <div className="grid gap-3 md:grid-cols-4">
          <div className="rounded-2xl bg-blue-50 p-4 ring-1 ring-blue-100"><div className="text-2xl font-black text-blue-900">{stats.total}</div><div className="text-xs font-bold text-blue-700">AI media links / AI 素材</div></div>
          <div className="rounded-2xl bg-emerald-50 p-4 ring-1 ring-emerald-100"><div className="text-2xl font-black text-emerald-900">{stats.approved}</div><div className="text-xs font-bold text-emerald-700">Approved for AI / 允许 AI 使用</div></div>
          <div className="rounded-2xl bg-red-50 p-4 ring-1 ring-red-100"><div className="text-2xl font-black text-red-900">{stats.blocked}</div><div className="text-xs font-bold text-red-700">Blocked / 禁止 AI 使用</div></div>
          <div className="rounded-2xl bg-amber-50 p-4 ring-1 ring-amber-100"><div className="text-2xl font-black text-amber-900">{stats.sensitive}</div><div className="text-xs font-bold text-amber-700">Sensitive / 敏感限制</div></div>
        </div>
      </SectionCard>

      {message ? <div className="rounded-2xl bg-blue-50 px-4 py-3 text-sm font-bold text-blue-800 ring-1 ring-blue-100">{message}</div> : null}

      <SectionCard title="Filters & AI Context / 筛选与 AI 上下文" subtitle="Set AI module, linked object and privacy before uploading/selecting media. / 上传或选择素材前设置 AI 模块、关联对象和隐私范围。">
        <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
          <input className={inputClass} value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search / 搜索" />
          <select className={inputClass} value={aiModule} onChange={(event) => setAiModule(event.target.value)}>{aiModules.map((item) => <option key={item} value={item}>{item}</option>)}</select>
          <select className={inputClass} value={objectType} onChange={(event) => setObjectType(event.target.value)}>{objectTypes.map((item) => <option key={item} value={item}>{item}</option>)}</select>
          <input className={inputClass} value={objectId} onChange={(event) => setObjectId(event.target.value)} placeholder="Object UUID / 对象ID" />
          <select className={inputClass} value={readiness} onChange={(event) => setReadiness(event.target.value)}>{readinessStatuses.map((item) => <option key={item} value={item}>{item}</option>)}</select>
          <button type="button" onClick={loadLinks} disabled={loading} className="rounded-2xl bg-slate-900 px-4 py-2 text-sm font-black text-white hover:bg-slate-700 disabled:opacity-60">Search / 搜索</button>
        </div>
      </SectionCard>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_560px]">
        <SectionCard title="AI Media Links / AI 素材关联" subtitle="Open records to approve, block or mark as used in AI. / 打开记录可批准、禁止或标记已用于 AI。">
          <div className="overflow-x-auto rounded-2xl border border-slate-200">
            <table className="min-w-[1180px] w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="p-3">AI Status</th><th className="p-3">Module</th><th className="p-3">Context</th><th className="p-3">Privacy</th><th className="p-3">Label</th><th className="p-3">Media</th><th className="p-3">Created</th><th className="p-3">Action</th></tr></thead>
              <tbody className="divide-y divide-slate-100">
                {links.map((link) => { const asset = assetFromLink(link); return <tr key={String(link.link_id)} className="hover:bg-blue-50/50"><td className="p-3"><Badge tone={tone(link.ai_readiness_status)}>{formatValue(link.ai_readiness_status)}</Badge></td><td className="p-3"><Badge tone={tone(link.ai_module)}>{formatValue(link.ai_module)}</Badge></td><td className="p-3"><Badge tone={tone(link.usage_context)}>{formatValue(link.usage_context)}</Badge></td><td className="p-3"><Badge tone={tone(link.privacy_scope)}>{formatValue(link.privacy_scope)}</Badge></td><td className="max-w-60 truncate p-3 font-semibold text-slate-700">{formatValue(link.reference_label)}</td><td className="max-w-72 truncate p-3 text-xs font-semibold text-blue-700">{formatValue(asset.title || asset.asset_url || asset.storage_path)}</td><td className="p-3 text-slate-500">{formatValue(link.created_at)}</td><td className="p-3"><button type="button" onClick={() => open(link)} className="rounded-xl bg-white px-3 py-2 text-xs font-black text-activeBlue ring-1 ring-blue-100 hover:bg-blue-50">Open / 打开</button></td></tr>; })}
                {!links.length ? <tr><td colSpan={8} className="p-6 text-center text-sm font-bold text-slate-500">{loading ? 'Loading...' : 'No AI media links. / 暂无 AI 素材关联。'}</td></tr> : null}
              </tbody>
            </table>
          </div>
        </SectionCard>

        <SectionCard title="Upload / Select AI Media / 上传或选择 AI 素材" subtitle="AI can only use assets approved by admin. Sensitive assets can be blocked. / AI 只能使用管理员批准的素材；敏感素材可以禁止使用。">
          <div className="space-y-4">
            <div className="grid gap-3 md:grid-cols-2">
              <label><span className={labelClass}>Usage Context / 用途</span><select className={inputClass} value={usageContext} onChange={(event) => setUsageContext(event.target.value)}>{usageContexts.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
              <label><span className={labelClass}>Privacy Scope / 隐私范围</span><select className={inputClass} value={privacy} onChange={(event) => setPrivacy(event.target.value)}>{privacyScopes.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
              <label><span className={labelClass}>Reference Label / 标签</span><input className={inputClass} value={referenceLabel} onChange={(event) => setReferenceLabel(event.target.value)} /></label>
              <label><span className={labelClass}>Status / 状态</span><select className={inputClass} value={status} onChange={(event) => setStatus(event.target.value)}>{statuses.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
              <label className="md:col-span-2"><span className={labelClass}>AI Prompt Hint / AI 提示词提示</span><textarea className={`${inputClass} min-h-20`} value={promptHint} onChange={(event) => setPromptHint(event.target.value)} placeholder="Use this image as evidence for leak location and repair recommendation..." /></label>
              <label className="md:col-span-2"><span className={labelClass}>AI Summary / AI 摘要</span><textarea className={`${inputClass} min-h-20`} value={aiSummary} onChange={(event) => setAiSummary(event.target.value)} /></label>
              <label className="md:col-span-2"><span className={labelClass}>Tags / 标签</span><input className={inputClass} value={tags} onChange={(event) => setTags(event.target.value)} placeholder="leak, quotation, material, roof" /></label>
              <label className="md:col-span-2"><span className={labelClass}>Extraction JSON / 提取结果 JSON</span><textarea className={`${inputClass} min-h-24 font-mono text-xs`} value={extractionJson} onChange={(event) => setExtractionJson(event.target.value)} /></label>
              <label className="md:col-span-2"><span className={labelClass}>Metadata JSON / 元数据</span><textarea className={`${inputClass} min-h-24 font-mono text-xs`} value={metadataJson} onChange={(event) => setMetadataJson(event.target.value)} /></label>
            </div>

            {selectedLink ? <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200"><div className="mb-2 text-xs font-black uppercase tracking-[0.12em] text-slate-500">Selected Link / 当前关联</div><div className="text-sm font-black text-slate-900">{formatValue(selectedLink.reference_label)}</div><div className="mt-2 flex flex-wrap gap-2"><button type="button" disabled={saving} onClick={() => updateLink('approved_for_ai')} className="rounded-xl bg-emerald-50 px-3 py-2 text-xs font-black text-emerald-700 ring-1 ring-emerald-100">Approve for AI / 允许 AI 使用</button><button type="button" disabled={saving} onClick={() => updateLink('blocked_for_ai')} className="rounded-xl bg-red-50 px-3 py-2 text-xs font-black text-red-700 ring-1 ring-red-100">Block AI / 禁止 AI</button><button type="button" disabled={saving} onClick={() => updateLink('used_in_ai')} className="rounded-xl bg-blue-50 px-3 py-2 text-xs font-black text-blue-700 ring-1 ring-blue-100">Mark Used / 标记已用</button><button type="button" disabled={saving} onClick={() => updateLink()} className="rounded-xl bg-activeBlue px-3 py-2 text-xs font-black text-white">Save / 保存</button><button type="button" onClick={resetForm} className="rounded-xl bg-white px-3 py-2 text-xs font-black text-slate-700 ring-1 ring-slate-200">New / 新增</button></div></div> : null}

            <MediaSourcePicker moduleKey="ai_center" usageContext={`${aiModule}_${usageContext}`} title="AI Attachment Source / AI 附件素材来源" helper="Upload or select AI evidence photos, inspection videos, material references, price sheets, reports and SEO/social sources from local computer, URL, or backend library. / 上传或选择 AI 证据照片、查验视频、材料参考、价格表、报告和 SEO/社媒来源，支持本地电脑、URL 或素材库。" onSelect={createLink} />
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
