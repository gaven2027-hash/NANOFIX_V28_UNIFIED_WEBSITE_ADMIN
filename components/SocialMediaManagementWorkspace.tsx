'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Badge } from './Badge';
import { SectionCard } from './SectionCard';
import { MediaSourcePicker } from './MediaSourcePicker';
import { socialMediaSections, type SocialMediaSectionConfig } from '@/lib/nanofix/socialMediaConfig';

type Row = Record<string, unknown>;
type Tab = 'records' | 'messages' | 'drafts' | 'versions';

const inputClass = 'w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 outline-none transition focus:border-activeBlue focus:ring-2 focus:ring-blue-100';
const labelClass = 'mb-1 block text-xs font-black uppercase tracking-[0.12em] text-slate-500';
const recordStatuses = ['draft', 'active', 'pending_review', 'approved', 'scheduled', 'published', 'archived', 'disabled'];
const draftStatuses = ['draft', 'pending_review', 'approved', 'rejected', 'published', 'scheduled'];
const versionStatuses = ['approved', 'scheduled', 'published', 'cancelled', 'failed'];
const platforms = ['all', 'facebook', 'instagram', 'tiktok', 'youtube_shorts', 'xiaohongshu', 'google_business_profile', 'whatsapp', 'website_live_chat', 'general'];

function formatValue(value: unknown) {
  if (value === null || value === undefined || value === '') return '—';
  if (Array.isArray(value)) return value.join(', ');
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

function statusTone(status: unknown): 'blue' | 'green' | 'amber' | 'red' | 'gray' | 'cyan' {
  const s = String(status || '').toLowerCase();
  if (/(active|approved|published|sent|converted)/.test(s)) return 'green';
  if (/(draft|pending|scheduled|new|queued|progress)/.test(s)) return 'amber';
  if (/(archived|disabled|failed|cancelled|rejected|spam|high)/.test(s)) return 'red';
  return 'blue';
}

function safeJsonString(value: unknown) {
  if (!value) return '{}';
  if (typeof value === 'string') return value;
  return JSON.stringify(value, null, 2);
}

function parseJsonInput(value: string) {
  try { return JSON.parse(value || '{}') as Row | Row[]; } catch { return null; }
}

function sectionDefaultJson(section?: SocialMediaSectionConfig | null) {
  if (!section) return {};
  return {
    section_key: section.key,
    platform: section.platform,
    title: section.title,
    title_zh: section.zh,
    helper: section.helper,
    ai_auto_publish_allowed: false,
    admin_review_required: true,
    media_source_picker_required: true,
    notes: 'This social management record is editable from NANOFIX Social Media Management. Media can come from local upload, URL import, or backend media library.'
  };
}

function mediaAssetPayload(asset: Row, context: string) {
  return {
    asset_id: asset.asset_id,
    source_type: asset.source_type,
    asset_url: asset.asset_url,
    storage_path: asset.storage_path,
    mime_type: asset.mime_type,
    alt_text: asset.alt_text,
    title: asset.title,
    context,
    selected_at: new Date().toISOString()
  };
}

function appendAssetToJsonText(jsonText: string, asset: Row, context: string) {
  const parsed = parseJsonInput(jsonText);
  const base = parsed && !Array.isArray(parsed) ? parsed : {};
  const previous = Array.isArray((base as Row).selected_media_assets) ? (base as Row).selected_media_assets as Row[] : [];
  return safeJsonString({
    ...base,
    selected_media_assets: [...previous, mediaAssetPayload(asset, context)],
    latest_media_url: asset.asset_url || (base as Row).latest_media_url,
    media_source_picker_required: true
  });
}

function appendAssetToReferences(jsonText: string, asset: Row, context: string) {
  const parsed = parseJsonInput(jsonText);
  const list = Array.isArray(parsed) ? parsed : [];
  return safeJsonString([...list, { source: 'media_source_picker', ...mediaAssetPayload(asset, context) }]);
}

function SectionShortcutTabs({ activeSection }: { activeSection?: SocialMediaSectionConfig | null }) {
  return <div className="mb-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">{socialMediaSections.map((section) => <Link key={section.key} href={section.href} className={`rounded-2xl border px-4 py-3 text-sm font-black transition ${activeSection?.key === section.key ? 'border-activeBlue bg-blue-50 text-activeBlue shadow-sm' : 'border-slate-200 bg-white text-slate-700 hover:border-activeBlue hover:text-activeBlue'}`}><span className="block">{section.title}</span><span className="block text-xs font-semibold text-slate-500">{section.zh}</span></Link>)}</div>;
}

function Tabs({ active, onChange }: { active: Tab; onChange: (tab: Tab) => void }) {
  const tabs: Array<[Tab, string, string]> = [['records', 'Records & Settings', '记录与设置'], ['messages', 'Inbox / Messages', '收件箱/消息'], ['drafts', 'AI Drafts & Preview', 'AI 草稿与预览'], ['versions', 'Schedule / Publish Versions', '排期/发布版本']];
  return <div className="mb-5 grid gap-2 md:grid-cols-4">{tabs.map(([key, title, zh]) => <button key={key} type="button" onClick={() => onChange(key)} className={`rounded-2xl border px-4 py-3 text-left text-sm font-black transition ${active === key ? 'border-activeBlue bg-blue-50 text-activeBlue shadow-sm' : 'border-slate-200 bg-white text-slate-700 hover:border-activeBlue hover:text-activeBlue'}`}><span className="block">{title}</span><span className="block text-xs font-semibold text-slate-500">{zh}</span></button>)}</div>;
}

function RecordEditor({ row, section, onSaved, onClose }: { row: Row | null; section?: SocialMediaSectionConfig | null; onSaved: () => void; onClose: () => void }) {
  const [form, setForm] = useState<Row>(row || { section_key: section?.key || 'social-accounts', platform: section?.platform || 'general', title: section?.title || '', body: '', status: 'draft', config_json: sectionDefaultJson(section) });
  const [configJson, setConfigJson] = useState(safeJsonString(row?.config_json || sectionDefaultJson(section)));
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => { setForm(row || { section_key: section?.key || 'social-accounts', platform: section?.platform || 'general', title: section?.title || '', body: '', status: 'draft', config_json: sectionDefaultJson(section) }); setConfigJson(safeJsonString(row?.config_json || sectionDefaultJson(section))); setMessage(''); }, [row, section]);

  function applyMedia(asset: Row) { setConfigJson((current) => appendAssetToJsonText(current, asset, 'social_record_or_platform_setting')); }

  async function save() {
    const parsed = parseJsonInput(configJson);
    if (parsed === null || Array.isArray(parsed)) return setMessage('Config JSON is invalid. / 配置 JSON 格式错误。');
    setSaving(true);
    const action = row ? 'update_record' : 'create_record';
    const response = await fetch('/api/admin/social-media', { method: row ? 'PATCH' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...form, config_json: parsed, action, record_id: row?.record_id }) });
    const json = await response.json().catch(() => ({}));
    setSaving(false);
    if (!response.ok || !json.ok) return setMessage(json.error || 'Save failed. / 保存失败。');
    setMessage('Saved. / 已保存。'); onSaved();
  }

  return <div className="rounded-3xl bg-white p-5 shadow-soft ring-1 ring-slate-200"><div className="mb-4 flex items-start justify-between gap-3"><div><div className="text-xs font-black uppercase tracking-[0.16em] text-activeBlue">{row ? 'Edit Record' : 'New Record'}</div><h3 className="mt-1 text-xl font-black text-slate-950">{row ? formatValue(row.title) : `Create ${section?.title || 'Social Record'}`}</h3></div><button type="button" onClick={onClose} className="rounded-xl bg-slate-100 px-3 py-2 text-xs font-black text-slate-600 hover:bg-slate-200">Close / 关闭</button></div>{message ? <div className="mb-4 rounded-2xl bg-blue-50 px-4 py-3 text-sm font-bold text-blue-800 ring-1 ring-blue-100">{message}</div> : null}<div className="grid gap-4 md:grid-cols-2"><label><span className={labelClass}>Section Key / 栏目键名</span><input className={inputClass} value={String(form.section_key || '')} onChange={(event) => setForm((current) => ({ ...current, section_key: event.target.value }))} /></label><label><span className={labelClass}>Platform / 平台</span><select className={inputClass} value={String(form.platform || 'general')} onChange={(event) => setForm((current) => ({ ...current, platform: event.target.value }))}>{platforms.map((p) => <option key={p} value={p}>{p}</option>)}</select></label><label><span className={labelClass}>Status / 状态</span><select className={inputClass} value={String(form.status || 'draft')} onChange={(event) => setForm((current) => ({ ...current, status: event.target.value }))}>{recordStatuses.map((s) => <option key={s} value={s}>{s}</option>)}</select></label><label className="md:col-span-2"><span className={labelClass}>Title / 标题</span><input className={inputClass} value={String(form.title || '')} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} /></label><label className="md:col-span-2"><span className={labelClass}>Body / 内容</span><textarea className={`${inputClass} min-h-24`} value={String(form.body || '')} onChange={(event) => setForm((current) => ({ ...current, body: event.target.value }))} /></label><label className="md:col-span-2"><span className={labelClass}>Config JSON / 配置 JSON</span><textarea className={`${inputClass} min-h-40 font-mono text-xs`} value={configJson} onChange={(event) => setConfigJson(event.target.value)} /></label></div><div className="mt-5"><MediaSourcePicker moduleKey="social_media" usageContext="record_or_setting_media" title="Record Media Source / 记录素材来源" helper="Attach images, GIFs, videos or files to social records/settings using local upload, URL import, or media library. / 为社媒记录/设置关联图片、GIF、视频或文件，支持本地上传、URL 和素材库。" onSelect={applyMedia} compact /></div><button type="button" disabled={saving} onClick={save} className="mt-4 rounded-2xl bg-activeBlue px-5 py-3 text-sm font-black text-white shadow-sm hover:bg-blue-700 disabled:opacity-60">Save Record / 保存记录</button></div>;
}

function DraftEditor({ row, section, onSaved, onClose }: { row: Row | null; section?: SocialMediaSectionConfig | null; onSaved: () => void; onClose: () => void }) {
  const [form, setForm] = useState<Row>(row || { section_key: section?.key || 'ai-social-content-studio', platform: section?.platform || 'all', title: section?.title || '', body: '', approval_status: 'draft', prompt_version: section?.key || 'manual', model: 'manual', source_references: [] });
  const [sourceReferences, setSourceReferences] = useState(safeJsonString(row?.source_references || []));
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => { setForm(row || { section_key: section?.key || 'ai-social-content-studio', platform: section?.platform || 'all', title: section?.title || '', body: '', approval_status: 'draft', prompt_version: section?.key || 'manual', model: 'manual', source_references: [] }); setSourceReferences(safeJsonString(row?.source_references || [])); setMessage(''); }, [row, section]);

  function applyMedia(asset: Row) { setSourceReferences((current) => appendAssetToReferences(current, asset, 'social_ai_draft_material')); }

  async function save() {
    const parsed = parseJsonInput(sourceReferences);
    if (parsed === null || !Array.isArray(parsed)) return setMessage('Source References JSON must be an array. / 来源引用 JSON 必须是数组。');
    setSaving(true);
    const action = row ? 'update_draft' : 'create_draft';
    const response = await fetch('/api/admin/social-media', { method: row ? 'PATCH' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...form, source_references: parsed, action, content_id: row?.content_id }) });
    const json = await response.json().catch(() => ({}));
    setSaving(false);
    if (!response.ok || !json.ok) return setMessage(json.error || 'Save failed. / 保存失败。');
    setMessage('Saved. / 已保存。'); onSaved();
  }

  return <div className="rounded-3xl bg-white p-5 shadow-soft ring-1 ring-slate-200"><div className="mb-4 flex items-start justify-between gap-3"><div><div className="text-xs font-black uppercase tracking-[0.16em] text-activeBlue">{row ? 'Edit Draft' : 'New Draft'}</div><h3 className="mt-1 text-xl font-black text-slate-950">{row ? formatValue(row.title) : `Create ${section?.title || 'Social Draft'}`}</h3></div><button type="button" onClick={onClose} className="rounded-xl bg-slate-100 px-3 py-2 text-xs font-black text-slate-600 hover:bg-slate-200">Close / 关闭</button></div>{message ? <div className="mb-4 rounded-2xl bg-blue-50 px-4 py-3 text-sm font-bold text-blue-800 ring-1 ring-blue-100">{message}</div> : null}<div className="grid gap-4 md:grid-cols-2"><label><span className={labelClass}>Platform / 平台</span><select className={inputClass} value={String(form.platform || 'all')} onChange={(event) => setForm((current) => ({ ...current, platform: event.target.value }))}>{platforms.map((p) => <option key={p} value={p}>{p}</option>)}</select></label><label><span className={labelClass}>Approval Status / 审核状态</span><select className={inputClass} value={String(form.approval_status || 'draft')} onChange={(event) => setForm((current) => ({ ...current, approval_status: event.target.value }))}>{draftStatuses.map((s) => <option key={s} value={s}>{s}</option>)}</select></label><label className="md:col-span-2"><span className={labelClass}>Title / 标题</span><input className={inputClass} value={String(form.title || '')} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} /></label><label className="md:col-span-2"><span className={labelClass}>Post Body / 文案</span><textarea className={`${inputClass} min-h-40`} value={String(form.body || '')} onChange={(event) => setForm((current) => ({ ...current, body: event.target.value }))} /></label><label><span className={labelClass}>Prompt Version / 提示词版本</span><input className={inputClass} value={String(form.prompt_version || '')} onChange={(event) => setForm((current) => ({ ...current, prompt_version: event.target.value }))} /></label><label><span className={labelClass}>Model / 模型</span><input className={inputClass} value={String(form.model || 'manual')} onChange={(event) => setForm((current) => ({ ...current, model: event.target.value }))} /></label><label className="md:col-span-2"><span className={labelClass}>Source References JSON / 来源引用 JSON</span><textarea className={`${inputClass} min-h-28 font-mono text-xs`} value={sourceReferences} onChange={(event) => setSourceReferences(event.target.value)} /></label></div><div className="mt-5"><MediaSourcePicker moduleKey="social_media" usageContext="ai_draft_material" title="AI Draft Material Source / AI 草稿素材来源" helper="Upload or select images, GIFs, videos and files as materials for AI-generated multi-platform drafts. / 上传或选择图片、GIF、视频和文件，作为 AI 多平台草稿生成素材。" onSelect={applyMedia} /></div><button type="button" disabled={saving} onClick={save} className="mt-4 rounded-2xl bg-activeBlue px-5 py-3 text-sm font-black text-white shadow-sm hover:bg-blue-700 disabled:opacity-60">Save Draft / 保存草稿</button></div>;
}

export function SocialMediaManagementWorkspace({ section }: { section?: SocialMediaSectionConfig | null }) {
  const [activeTab, setActiveTab] = useState<Tab>(section?.tab || 'records');
  const [records, setRecords] = useState<Row[]>([]);
  const [messages, setMessages] = useState<Row[]>([]);
  const [drafts, setDrafts] = useState<Row[]>([]);
  const [versions, setVersions] = useState<Row[]>([]);
  const [search, setSearch] = useState(section?.key || '');
  const [status, setStatus] = useState('');
  const [platform, setPlatform] = useState(section?.platform || 'all');
  const [selectedRecord, setSelectedRecord] = useState<Row | null>(null);
  const [selectedDraft, setSelectedDraft] = useState<Row | null>(null);
  const [creatingRecord, setCreatingRecord] = useState(false);
  const [creatingDraft, setCreatingDraft] = useState(false);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => { setActiveTab(section?.tab || 'records'); setSearch(section?.key || ''); setPlatform(section?.platform || 'all'); setSelectedRecord(null); setSelectedDraft(null); setCreatingRecord(false); setCreatingDraft(false); }, [section]);

  async function loadAll() {
    setLoading(true); setMessage('');
    const params = new URLSearchParams({ mode: 'all' });
    if (search) params.set('search', search); if (status) params.set('status', status); if (section?.key) params.set('section_key', section.key); if (platform) params.set('platform', platform);
    const response = await fetch(`/api/admin/social-media?${params.toString()}`, { cache: 'no-store' });
    const json = await response.json().catch(() => ({})); setLoading(false);
    if (!response.ok || !json.ok) return setMessage(json.error || 'Load failed. / 加载失败。');
    setRecords(json.records || []); setMessages(json.messages || []); setDrafts(json.drafts || []); setVersions(json.versions || []);
  }
  useEffect(() => { void loadAll(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [section]);

  async function publishSnapshot(row?: Row | null) {
    setMessage('');
    const source = row || selectedDraft || selectedRecord;
    const response = await fetch('/api/admin/social-media', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'publish_snapshot', content_id: source?.content_id, record_id: source?.record_id, platform, status: 'scheduled', snapshot_json: { section_key: section?.key, platform, source, final_approval_completed_before_schedule: true, publish_ready_after_schedule: true, admin_review_required: true, ai_auto_publish_allowed: false, created_at: new Date().toISOString() } }) });
    const json = await response.json().catch(() => ({}));
    if (!response.ok || !json.ok) return setMessage(json.error || 'Publish snapshot failed. / 发布快照失败。');
    setMessage(`Publish snapshot saved as version ${json.version?.version_no}. / 已保存发布版本 ${json.version?.version_no}。`); await loadAll();
  }

  return <div><SectionShortcutTabs activeSection={section} />{section ? <div className="mb-5 rounded-3xl bg-white p-5 shadow-soft ring-1 ring-slate-200"><div className="text-xs font-black uppercase tracking-[0.16em] text-activeBlue">Social Media Section / 社媒管理二级栏目</div><h3 className="mt-1 text-2xl font-black text-slate-950">{section.title} / {section.zh}</h3><p className="mt-2 text-sm font-semibold leading-6 text-slate-600">{section.helper}</p><div className="mt-3 flex flex-wrap gap-2"><Badge tone="blue">Platform: {section.platform}</Badge><Badge tone="amber">AI no auto publish</Badge><Badge tone="green">Media upload/select enabled</Badge></div></div> : null}<Tabs active={activeTab} onChange={setActiveTab} />{message ? <div className="mb-4 rounded-2xl bg-blue-50 px-4 py-3 text-sm font-bold text-blue-800 ring-1 ring-blue-100">{message}</div> : null}<SectionCard title="Social Media Control Center / 社媒控制中心" subtitle="Manage social records, inbox messages, AI drafts, media uploads/selections, scheduling and publish versions. / 管理社媒记录、消息、AI 草稿、素材上传/选择、排期和发布版本。"><div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_220px_220px_auto_auto]"><input className={inputClass} placeholder="Search title, body, channel, platform... / 搜索" value={search} onChange={(event) => setSearch(event.target.value)} /><select className={inputClass} value={platform} onChange={(event) => setPlatform(event.target.value)}>{platforms.map((p) => <option key={p} value={p}>{p}</option>)}</select><select className={inputClass} value={status} onChange={(event) => setStatus(event.target.value)}><option value="">All statuses / 全部状态</option>{[...new Set([...recordStatuses, ...draftStatuses, ...versionStatuses])].map((item) => <option key={item} value={item}>{item}</option>)}</select><button type="button" onClick={loadAll} className="rounded-2xl bg-slate-900 px-5 py-2 text-sm font-black text-white hover:bg-slate-700">Search / 搜索</button><button type="button" onClick={() => publishSnapshot()} className="rounded-2xl bg-activeBlue px-5 py-2 text-sm font-black text-white hover:bg-blue-700">Save Publish Snapshot / 保存发布版本</button></div></SectionCard>{activeTab === 'records' ? <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1fr)_520px]"><SectionCard title="Records & Settings / 记录与设置" subtitle="Manage account settings, response rules, review workflows and media-linked platform configuration. / 管理账号、回复规则、审核流程和带素材的配置。"><div className="mb-3 flex justify-end"><button type="button" onClick={() => { setCreatingRecord(true); setSelectedRecord(null); }} className="rounded-2xl bg-activeBlue px-4 py-2 text-sm font-black text-white">New Record / 新增记录</button></div><div className="overflow-x-auto rounded-2xl border border-slate-200"><table className="min-w-[880px] w-full text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="p-3">Status</th><th className="p-3">Section</th><th className="p-3">Platform</th><th className="p-3">Title</th><th className="p-3">Updated</th><th className="p-3">Action</th></tr></thead><tbody className="divide-y divide-slate-100">{records.map((record) => <tr key={String(record.record_id)} className="hover:bg-blue-50/50"><td className="p-3"><Badge tone={statusTone(record.status)}>{formatValue(record.status)}</Badge></td><td className="p-3 font-semibold text-slate-700">{formatValue(record.section_key)}</td><td className="p-3 text-slate-600">{formatValue(record.platform)}</td><td className="max-w-72 truncate p-3 font-bold text-slate-800">{formatValue(record.title)}</td><td className="p-3 text-slate-500">{formatValue(record.updated_at)}</td><td className="p-3"><button type="button" onClick={() => { setSelectedRecord(record); setCreatingRecord(false); }} className="rounded-xl bg-white px-3 py-2 text-xs font-black text-activeBlue ring-1 ring-blue-100 hover:bg-blue-50">Open / 打开</button></td></tr>)}{!records.length ? <tr><td colSpan={6} className="p-6 text-center text-sm font-bold text-slate-500">{loading ? 'Loading...' : 'No records yet. / 暂无记录。'}</td></tr> : null}</tbody></table></div></SectionCard><RecordEditor row={creatingRecord ? null : selectedRecord} section={section} onSaved={loadAll} onClose={() => { setSelectedRecord(null); setCreatingRecord(false); }} /></div> : null}{activeTab === 'messages' ? <div className="mt-5"><SectionCard title="Inbox / Messages / 收件箱与消息" subtitle="Search and review real social_messages records. / 搜索和查看真实 social_messages 记录。"><div className="overflow-x-auto rounded-2xl border border-slate-200"><table className="min-w-[960px] w-full text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="p-3">Channel</th><th className="p-3">Direction</th><th className="p-3">Risk</th><th className="p-3">Body</th><th className="p-3">Created</th></tr></thead><tbody className="divide-y divide-slate-100">{messages.map((row) => <tr key={String(row.message_id)} className="hover:bg-blue-50/50"><td className="p-3 font-bold text-slate-800">{formatValue(row.channel)}</td><td className="p-3 text-slate-600">{formatValue(row.direction)}</td><td className="p-3"><Badge tone={statusTone(row.risk_level)}>{formatValue(row.risk_level)}</Badge></td><td className="max-w-xl truncate p-3 font-semibold text-slate-700">{formatValue(row.body)}</td><td className="p-3 text-slate-500">{formatValue(row.created_at)}</td></tr>)}{!messages.length ? <tr><td colSpan={5} className="p-6 text-center text-sm font-bold text-slate-500">{loading ? 'Loading...' : 'No messages yet. / 暂无消息。'}</td></tr> : null}</tbody></table></div></SectionCard></div> : null}{activeTab === 'drafts' ? <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1fr)_560px]"><SectionCard title="AI Drafts & Platform Preview / AI 草稿与平台预览" subtitle="Create and edit platform-specific drafts with media materials from local upload, URL import or library. / 使用本地上传、URL 或素材库素材创建和编辑平台草稿。"><div className="mb-3 flex justify-end"><button type="button" onClick={() => { setCreatingDraft(true); setSelectedDraft(null); }} className="rounded-2xl bg-activeBlue px-4 py-2 text-sm font-black text-white">New Draft / 新增草稿</button></div><div className="overflow-x-auto rounded-2xl border border-slate-200"><table className="min-w-[920px] w-full text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="p-3">Status</th><th className="p-3">Platform</th><th className="p-3">Title</th><th className="p-3">Prompt</th><th className="p-3">Created</th><th className="p-3">Action</th></tr></thead><tbody className="divide-y divide-slate-100">{drafts.map((draft) => <tr key={String(draft.content_id)} className="hover:bg-blue-50/50"><td className="p-3"><Badge tone={statusTone(draft.approval_status)}>{formatValue(draft.approval_status)}</Badge></td><td className="p-3 font-bold text-slate-800">{formatValue(draft.platform)}</td><td className="max-w-72 truncate p-3 font-semibold text-slate-700">{formatValue(draft.title)}</td><td className="p-3 text-slate-600">{formatValue(draft.prompt_version)}</td><td className="p-3 text-slate-500">{formatValue(draft.created_at)}</td><td className="p-3"><button type="button" onClick={() => { setSelectedDraft(draft); setCreatingDraft(false); }} className="rounded-xl bg-white px-3 py-2 text-xs font-black text-activeBlue ring-1 ring-blue-100 hover:bg-blue-50">Open / 打开</button></td></tr>)}{!drafts.length ? <tr><td colSpan={6} className="p-6 text-center text-sm font-bold text-slate-500">{loading ? 'Loading...' : 'No drafts yet. / 暂无草稿。'}</td></tr> : null}</tbody></table></div></SectionCard><DraftEditor row={creatingDraft ? null : selectedDraft} section={section} onSaved={loadAll} onClose={() => { setSelectedDraft(null); setCreatingDraft(false); }} /></div> : null}{activeTab === 'versions' ? <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]"><SectionCard title="Schedule / Publish Versions / 排期与发布版本" subtitle="Store approval/schedule/publish snapshots for audit and rollback. / 保存审批、排期、发布快照，便于审计和回溯。"><div className="overflow-x-auto rounded-2xl border border-slate-200"><table className="min-w-[860px] w-full text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="p-3">Status</th><th className="p-3">Platform</th><th className="p-3">Version</th><th className="p-3">Scheduled</th><th className="p-3">Created</th></tr></thead><tbody className="divide-y divide-slate-100">{versions.map((version) => <tr key={String(version.version_id)}><td className="p-3"><Badge tone={statusTone(version.status)}>{formatValue(version.status)}</Badge></td><td className="p-3 font-bold text-slate-800">{formatValue(version.platform)}</td><td className="p-3"><Badge tone="green">v{formatValue(version.version_no)}</Badge></td><td className="p-3 text-slate-600">{formatValue(version.scheduled_at)}</td><td className="p-3 text-slate-500">{formatValue(version.created_at)}</td></tr>)}{!versions.length ? <tr><td colSpan={5} className="p-6 text-center text-sm font-bold text-slate-500">No publish versions yet. / 暂无发布版本。</td></tr> : null}</tbody></table></div></SectionCard><section className="rounded-3xl bg-white p-5 shadow-soft ring-1 ring-slate-200"><h3 className="text-lg font-black text-slate-950">AI Publish Safety / AI 发布安全</h3><p className="mt-3 text-sm leading-7 text-slate-600">AI-generated social content is always saved as draft first. Admin can approve, schedule or create publish snapshots, but AI cannot auto-publish by default.</p><button type="button" onClick={() => publishSnapshot()} className="mt-4 rounded-2xl bg-activeBlue px-4 py-3 text-sm font-black text-white hover:bg-blue-700">Create Snapshot / 创建快照</button></section></div> : null}</div>;
}
