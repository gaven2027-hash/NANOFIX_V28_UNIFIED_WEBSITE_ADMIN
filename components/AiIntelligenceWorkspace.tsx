'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Badge } from './Badge';
import { SectionCard } from './SectionCard';
import { aiIntelligenceSections, type AiIntelligenceSectionConfig } from '@/lib/nanofix/aiIntelligenceConfig';

type Row = Record<string, unknown>;
type Tab = 'records' | 'drafts' | 'logs' | 'versions' | 'search';

const inputClass = 'w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 outline-none transition focus:border-activeBlue focus:ring-2 focus:ring-blue-100';
const labelClass = 'mb-1 block text-xs font-black uppercase tracking-[0.12em] text-slate-500';
const recordStatuses = ['draft', 'active', 'pending_review', 'approved', 'scheduled', 'published', 'archived', 'disabled'];
const draftStatuses = ['pending_review', 'approved', 'rejected', 'published', 'scheduled'];
const versionStatuses = ['draft', 'approved', 'scheduled', 'published', 'cancelled', 'failed'];
const riskLevels = ['low', 'normal', 'medium', 'high', 'blocked'];
const categories = ['all', 'search', 'website', 'social', 'conversation', 'lead_discovery', 'rules', 'safety', 'knowledge_base', 'handoff', 'logs', 'cost', 'alerts', 'materials', 'quotation', 'invoice', 'policy'];

function formatValue(value: unknown) {
  if (value === null || value === undefined || value === '') return '—';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

function statusTone(status: unknown): 'blue' | 'green' | 'amber' | 'red' | 'gray' | 'cyan' {
  const s = String(status || '');
  if (/(active|approved|published)/i.test(s)) return 'green';
  if (/(draft|pending|scheduled|review)/i.test(s)) return 'amber';
  if (/(archived|disabled|failed|cancelled|rejected|blocked|high)/i.test(s)) return 'red';
  return 'blue';
}

function safeJsonString(value: unknown) {
  if (!value) return '{}';
  if (typeof value === 'string') return value;
  return JSON.stringify(value, null, 2);
}

function parseJsonInput(value: string) {
  try {
    return JSON.parse(value || '{}');
  } catch {
    return null;
  }
}

function sectionDefaultJson(section?: AiIntelligenceSectionConfig | null) {
  if (!section) return {};
  return {
    section_key: section.key,
    category: section.category,
    title: section.title,
    title_zh: section.zh,
    helper: section.helper,
    ai_auto_publish_allowed: false,
    ai_auto_approve_allowed: false,
    admin_review_required: true,
    notes: 'This AI management record is editable from NANOFIX AI Intelligence Center.'
  };
}

function SectionShortcutTabs({ activeSection }: { activeSection?: AiIntelligenceSectionConfig | null }) {
  return (
    <div className="mb-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
      {aiIntelligenceSections.map((section) => (
        <Link key={section.key} href={section.href} className={`rounded-2xl border px-4 py-3 text-sm font-black transition ${activeSection?.key === section.key ? 'border-activeBlue bg-blue-50 text-activeBlue shadow-sm' : 'border-slate-200 bg-white text-slate-700 hover:border-activeBlue hover:text-activeBlue'}`}>
          <span className="block">{section.title}</span>
          <span className="block text-xs font-semibold text-slate-500">{section.zh}</span>
        </Link>
      ))}
    </div>
  );
}

function Tabs({ active, onChange }: { active: Tab; onChange: (tab: Tab) => void }) {
  const tabs: Array<[Tab, string, string]> = [
    ['records', 'AI Rules & Records', 'AI 规则与记录'],
    ['drafts', 'AI Drafts / Review', 'AI 草稿/审核'],
    ['logs', 'AI Logs', 'AI 日志'],
    ['search', 'Search Logs', '搜索日志'],
    ['versions', 'Version Snapshots', '版本快照']
  ];
  return (
    <div className="mb-5 grid gap-2 md:grid-cols-5">
      {tabs.map(([key, title, zh]) => (
        <button key={key} type="button" onClick={() => onChange(key)} className={`rounded-2xl border px-4 py-3 text-left text-sm font-black transition ${active === key ? 'border-activeBlue bg-blue-50 text-activeBlue shadow-sm' : 'border-slate-200 bg-white text-slate-700 hover:border-activeBlue hover:text-activeBlue'}`}>
          <span className="block">{title}</span>
          <span className="block text-xs font-semibold text-slate-500">{zh}</span>
        </button>
      ))}
    </div>
  );
}

function RecordEditor({ row, section, onSaved, onClose }: { row: Row | null; section?: AiIntelligenceSectionConfig | null; onSaved: () => void; onClose: () => void }) {
  const [form, setForm] = useState<Row>(row || { section_key: section?.key || 'ai-rules', category: section?.category || 'general', title: section?.title || '', body: '', status: 'draft', config_json: sectionDefaultJson(section) });
  const [configJson, setConfigJson] = useState(safeJsonString(row?.config_json || sectionDefaultJson(section)));
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setForm(row || { section_key: section?.key || 'ai-rules', category: section?.category || 'general', title: section?.title || '', body: '', status: 'draft', config_json: sectionDefaultJson(section) });
    setConfigJson(safeJsonString(row?.config_json || sectionDefaultJson(section)));
    setMessage('');
  }, [row, section]);

  async function save() {
    const parsed = parseJsonInput(configJson);
    if (parsed === null) {
      setMessage('Config JSON is invalid. / 配置 JSON 格式错误。');
      return;
    }
    setSaving(true);
    const action = row ? 'update_record' : 'create_record';
    const response = await fetch('/api/admin/ai-intelligence', {
      method: row ? 'PATCH' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, config_json: parsed, action, record_id: row?.record_id })
    });
    const json = await response.json().catch(() => ({}));
    setSaving(false);
    if (!response.ok || !json.ok) {
      setMessage(json.error || 'Save failed. / 保存失败。');
      return;
    }
    setMessage('Saved. / 已保存。');
    onSaved();
  }

  return (
    <div className="rounded-3xl bg-white p-5 shadow-soft ring-1 ring-slate-200">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div><div className="text-xs font-black uppercase tracking-[0.16em] text-activeBlue">{row ? 'Edit AI Record' : 'New AI Record'}</div><h3 className="mt-1 text-xl font-black text-slate-950">{row ? formatValue(row.title) : `Create ${section?.title || 'AI Record'}`}</h3></div>
        <button type="button" onClick={onClose} className="rounded-xl bg-slate-100 px-3 py-2 text-xs font-black text-slate-600 hover:bg-slate-200">Close / 关闭</button>
      </div>
      {message ? <div className="mb-4 rounded-2xl bg-blue-50 px-4 py-3 text-sm font-bold text-blue-800 ring-1 ring-blue-100">{message}</div> : null}
      <div className="grid gap-4 md:grid-cols-2">
        <label><span className={labelClass}>Section Key / 栏目键名</span><input className={inputClass} value={String(form.section_key || '')} onChange={(event) => setForm((current) => ({ ...current, section_key: event.target.value }))} /></label>
        <label><span className={labelClass}>Category / 分类</span><select className={inputClass} value={String(form.category || 'general')} onChange={(event) => setForm((current) => ({ ...current, category: event.target.value }))}>{categories.filter((c) => c !== 'all').map((category) => <option key={category} value={category}>{category}</option>)}</select></label>
        <label><span className={labelClass}>Status / 状态</span><select className={inputClass} value={String(form.status || 'draft')} onChange={(event) => setForm((current) => ({ ...current, status: event.target.value }))}>{recordStatuses.map((s) => <option key={s} value={s}>{s}</option>)}</select></label>
        <label className="md:col-span-2"><span className={labelClass}>Title / 标题</span><input className={inputClass} value={String(form.title || '')} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} /></label>
        <label className="md:col-span-2"><span className={labelClass}>Body / 内容</span><textarea className={`${inputClass} min-h-28`} value={String(form.body || '')} onChange={(event) => setForm((current) => ({ ...current, body: event.target.value }))} /></label>
        <label className="md:col-span-2"><span className={labelClass}>Config JSON / 配置 JSON</span><textarea className={`${inputClass} min-h-40 font-mono text-xs`} value={configJson} onChange={(event) => setConfigJson(event.target.value)} /></label>
      </div>
      <button type="button" disabled={saving} onClick={save} className="mt-4 rounded-2xl bg-activeBlue px-5 py-3 text-sm font-black text-white shadow-sm hover:bg-blue-700 disabled:opacity-60">Save Record / 保存记录</button>
    </div>
  );
}

function DraftEditor({ row, section, onSaved, onClose }: { row: Row | null; section?: AiIntelligenceSectionConfig | null; onSaved: () => void; onClose: () => void }) {
  const [form, setForm] = useState<Row>(row || { section_key: section?.key || 'ai-website-assistant', module: section?.category || 'ai', task: section?.title || '', input_text: '', output_text: '', ai_confidence: 0.8, ai_risk_level: 'normal', human_review_status: 'pending_review', created_by: 'admin' });
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setForm(row || { section_key: section?.key || 'ai-website-assistant', module: section?.category || 'ai', task: section?.title || '', input_text: '', output_text: '', ai_confidence: 0.8, ai_risk_level: 'normal', human_review_status: 'pending_review', created_by: 'admin' });
    setMessage('');
  }, [row, section]);

  async function save() {
    setSaving(true);
    const action = row ? 'update_draft' : 'create_draft';
    const response = await fetch('/api/admin/ai-intelligence', {
      method: row ? 'PATCH' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, action, draft_id: row?.draft_id })
    });
    const json = await response.json().catch(() => ({}));
    setSaving(false);
    if (!response.ok || !json.ok) {
      setMessage(json.error || 'Save failed. / 保存失败。');
      return;
    }
    setMessage('Saved as draft/review item. / 已保存为草稿/审核项。');
    onSaved();
  }

  return (
    <div className="rounded-3xl bg-white p-5 shadow-soft ring-1 ring-slate-200">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div><div className="text-xs font-black uppercase tracking-[0.16em] text-activeBlue">{row ? 'Edit AI Draft' : 'New AI Draft'}</div><h3 className="mt-1 text-xl font-black text-slate-950">{row ? formatValue(row.task) : `Create ${section?.title || 'AI Draft'}`}</h3></div>
        <button type="button" onClick={onClose} className="rounded-xl bg-slate-100 px-3 py-2 text-xs font-black text-slate-600 hover:bg-slate-200">Close / 关闭</button>
      </div>
      {message ? <div className="mb-4 rounded-2xl bg-blue-50 px-4 py-3 text-sm font-bold text-blue-800 ring-1 ring-blue-100">{message}</div> : null}
      <div className="grid gap-4 md:grid-cols-2">
        <label><span className={labelClass}>Module / 模块</span><select className={inputClass} value={String(form.module || 'ai')} onChange={(event) => setForm((current) => ({ ...current, module: event.target.value }))}>{categories.filter((c) => c !== 'all').map((category) => <option key={category} value={category}>{category}</option>)}</select></label>
        <label><span className={labelClass}>Risk Level / 风险级别</span><select className={inputClass} value={String(form.ai_risk_level || 'normal')} onChange={(event) => setForm((current) => ({ ...current, ai_risk_level: event.target.value }))}>{riskLevels.map((s) => <option key={s} value={s}>{s}</option>)}</select></label>
        <label><span className={labelClass}>Review Status / 审核状态</span><select className={inputClass} value={String(form.human_review_status || 'pending_review')} onChange={(event) => setForm((current) => ({ ...current, human_review_status: event.target.value }))}>{draftStatuses.map((s) => <option key={s} value={s}>{s}</option>)}</select></label>
        <label><span className={labelClass}>Confidence / 置信度</span><input className={inputClass} type="number" step="0.01" value={String(form.ai_confidence ?? 0)} onChange={(event) => setForm((current) => ({ ...current, ai_confidence: event.target.value }))} /></label>
        <label className="md:col-span-2"><span className={labelClass}>Task / 任务</span><input className={inputClass} value={String(form.task || '')} onChange={(event) => setForm((current) => ({ ...current, task: event.target.value }))} /></label>
        <label className="md:col-span-2"><span className={labelClass}>Input Text / 输入</span><textarea className={`${inputClass} min-h-32`} value={String(form.input_text || '')} onChange={(event) => setForm((current) => ({ ...current, input_text: event.target.value }))} /></label>
        <label className="md:col-span-2"><span className={labelClass}>Output Text / 输出草稿</span><textarea className={`${inputClass} min-h-40`} value={String(form.output_text || '')} onChange={(event) => setForm((current) => ({ ...current, output_text: event.target.value }))} /></label>
      </div>
      <button type="button" disabled={saving} onClick={save} className="mt-4 rounded-2xl bg-activeBlue px-5 py-3 text-sm font-black text-white shadow-sm hover:bg-blue-700 disabled:opacity-60">Save AI Draft / 保存 AI 草稿</button>
    </div>
  );
}

export function AiIntelligenceWorkspace({ section }: { section?: AiIntelligenceSectionConfig | null }) {
  const [activeTab, setActiveTab] = useState<Tab>(section?.tab || 'records');
  const [records, setRecords] = useState<Row[]>([]);
  const [drafts, setDrafts] = useState<Row[]>([]);
  const [logs, setLogs] = useState<Row[]>([]);
  const [searchLogs, setSearchLogs] = useState<Row[]>([]);
  const [versions, setVersions] = useState<Row[]>([]);
  const [search, setSearch] = useState(section?.key || '');
  const [status, setStatus] = useState('');
  const [category, setCategory] = useState(section?.category || 'all');
  const [selectedRecord, setSelectedRecord] = useState<Row | null>(null);
  const [selectedDraft, setSelectedDraft] = useState<Row | null>(null);
  const [creatingRecord, setCreatingRecord] = useState(false);
  const [creatingDraft, setCreatingDraft] = useState(false);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setActiveTab(section?.tab || 'records');
    setSearch(section?.key || '');
    setCategory(section?.category || 'all');
    setSelectedRecord(null);
    setSelectedDraft(null);
    setCreatingRecord(false);
    setCreatingDraft(false);
  }, [section]);

  async function loadAll() {
    setLoading(true);
    setMessage('');
    const params = new URLSearchParams({ mode: 'all' });
    if (search) params.set('search', search);
    if (status) params.set('status', status);
    if (section?.key) params.set('section_key', section.key);
    if (category) params.set('category', category);
    const response = await fetch(`/api/admin/ai-intelligence?${params.toString()}`, { cache: 'no-store' });
    const json = await response.json().catch(() => ({}));
    setLoading(false);
    if (!response.ok || !json.ok) {
      setMessage(json.error || 'Load failed. / 加载失败。');
      return;
    }
    setRecords(json.records || []);
    setDrafts(json.drafts || []);
    setLogs(json.logs || []);
    setSearchLogs(json.searchLogs || []);
    setVersions(json.versions || []);
  }

  useEffect(() => {
    void loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [section]);

  async function saveVersion(row?: Row | null) {
    setMessage('');
    const source = row || selectedDraft || selectedRecord;
    const response = await fetch('/api/admin/ai-intelligence', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'save_version',
        record_id: source?.record_id,
        draft_id: source?.draft_id,
        section_key: section?.key || 'general',
        status: 'approved',
        snapshot_json: { section_key: section?.key, category, source, ai_auto_publish_allowed: false, ai_auto_approve_allowed: false, created_at: new Date().toISOString() }
      })
    });
    const json = await response.json().catch(() => ({}));
    if (!response.ok || !json.ok) {
      setMessage(json.error || 'Save version failed. / 保存版本失败。');
      return;
    }
    setMessage(`AI version snapshot saved as v${json.version?.version_no}. / 已保存 AI 版本 v${json.version?.version_no}。`);
    await loadAll();
  }

  return (
    <div>
      <SectionShortcutTabs activeSection={section} />
      {section ? (
        <div className="mb-5 rounded-3xl bg-white p-5 shadow-soft ring-1 ring-slate-200">
          <div className="text-xs font-black uppercase tracking-[0.16em] text-activeBlue">AI Intelligence Section / AI 智能中心二级栏目</div>
          <h3 className="mt-1 text-2xl font-black text-slate-950">{section.title} / {section.zh}</h3>
          <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">{section.helper}</p>
          <div className="mt-3 flex flex-wrap gap-2"><Badge tone="blue">Category: {section.category}</Badge><Badge tone="amber">Save as draft first</Badge><Badge tone="red">No auto approve / publish</Badge></div>
        </div>
      ) : null}
      <Tabs active={activeTab} onChange={setActiveTab} />
      {message ? <div className="mb-4 rounded-2xl bg-blue-50 px-4 py-3 text-sm font-bold text-blue-800 ring-1 ring-blue-100">{message}</div> : null}

      <SectionCard title="AI Intelligence Control Center / AI 智能控制中心" subtitle="Manage AI rules, drafts, search logs, operation logs, safety policies, usage/cost notes and version snapshots. / 管理 AI 规则、草稿、搜索记录、日志、安全策略、成本和版本快照。">
        <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_220px_220px_auto_auto]">
          <input className={inputClass} placeholder="Search title, task, risk, decision... / 搜索" value={search} onChange={(event) => setSearch(event.target.value)} />
          <select className={inputClass} value={category} onChange={(event) => setCategory(event.target.value)}>{categories.map((c) => <option key={c} value={c}>{c}</option>)}</select>
          <select className={inputClass} value={status} onChange={(event) => setStatus(event.target.value)}><option value="">All statuses / 全部状态</option>{[...new Set([...recordStatuses, ...draftStatuses, ...versionStatuses])].map((item) => <option key={item} value={item}>{item}</option>)}</select>
          <button type="button" onClick={loadAll} className="rounded-2xl bg-slate-900 px-5 py-2 text-sm font-black text-white hover:bg-slate-700">Search / 搜索</button>
          <button type="button" onClick={() => saveVersion()} className="rounded-2xl bg-activeBlue px-5 py-2 text-sm font-black text-white hover:bg-blue-700">Save Version / 保存版本</button>
        </div>
      </SectionCard>

      {activeTab === 'records' ? (
        <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1fr)_420px]">
          <SectionCard title="AI Rules & Records / AI 规则与记录" subtitle="Create and edit AI operating rules, knowledge, safety policy, cost notes and module configuration. / 新增和编辑 AI 运行规则、知识、安全策略、成本和模块配置。">
            <div className="mb-3 flex justify-end"><button type="button" onClick={() => { setCreatingRecord(true); setSelectedRecord(null); }} className="rounded-2xl bg-activeBlue px-4 py-2 text-sm font-black text-white">New Record / 新增记录</button></div>
            <div className="overflow-x-auto rounded-2xl border border-slate-200"><table className="min-w-[880px] w-full text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="p-3">Status</th><th className="p-3">Section</th><th className="p-3">Category</th><th className="p-3">Title</th><th className="p-3">Updated</th><th className="p-3">Action</th></tr></thead><tbody className="divide-y divide-slate-100">
              {records.map((record) => <tr key={String(record.record_id)} className="hover:bg-blue-50/50"><td className="p-3"><Badge tone={statusTone(record.status)}>{formatValue(record.status)}</Badge></td><td className="p-3 font-semibold text-slate-700">{formatValue(record.section_key)}</td><td className="p-3 text-slate-600">{formatValue(record.category)}</td><td className="max-w-72 truncate p-3 font-bold text-slate-800">{formatValue(record.title)}</td><td className="p-3 text-slate-500">{formatValue(record.updated_at)}</td><td className="p-3"><button type="button" onClick={() => { setSelectedRecord(record); setCreatingRecord(false); }} className="rounded-xl bg-white px-3 py-2 text-xs font-black text-activeBlue ring-1 ring-blue-100 hover:bg-blue-50">Open / 打开</button></td></tr>)}
              {!records.length ? <tr><td colSpan={6} className="p-6 text-center text-sm font-bold text-slate-500">{loading ? 'Loading...' : 'No AI records yet. / 暂无 AI 记录。'}</td></tr> : null}
            </tbody></table></div>
          </SectionCard>
          <RecordEditor row={creatingRecord ? null : selectedRecord} section={section} onSaved={loadAll} onClose={() => { setSelectedRecord(null); setCreatingRecord(false); }} />
        </div>
      ) : null}

      {activeTab === 'drafts' ? (
        <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1fr)_460px]">
          <SectionCard title="AI Drafts / Review / AI 草稿与审核" subtitle="Create and review AI drafts. AI outputs are not automatically approved, sent or published. / 创建和审核 AI 草稿，AI 不自动审批、发送或发布。">
            <div className="mb-3 flex justify-end"><button type="button" onClick={() => { setCreatingDraft(true); setSelectedDraft(null); }} className="rounded-2xl bg-activeBlue px-4 py-2 text-sm font-black text-white">New Draft / 新增草稿</button></div>
            <div className="overflow-x-auto rounded-2xl border border-slate-200"><table className="min-w-[960px] w-full text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="p-3">Status</th><th className="p-3">Risk</th><th className="p-3">Module</th><th className="p-3">Task</th><th className="p-3">Confidence</th><th className="p-3">Created</th><th className="p-3">Action</th></tr></thead><tbody className="divide-y divide-slate-100">
              {drafts.map((draft) => <tr key={String(draft.draft_id)} className="hover:bg-blue-50/50"><td className="p-3"><Badge tone={statusTone(draft.human_review_status)}>{formatValue(draft.human_review_status)}</Badge></td><td className="p-3"><Badge tone={statusTone(draft.ai_risk_level)}>{formatValue(draft.ai_risk_level)}</Badge></td><td className="p-3 font-bold text-slate-800">{formatValue(draft.module)}</td><td className="max-w-72 truncate p-3 font-semibold text-slate-700">{formatValue(draft.task)}</td><td className="p-3 text-slate-600">{formatValue(draft.ai_confidence)}</td><td className="p-3 text-slate-500">{formatValue(draft.created_at)}</td><td className="p-3"><button type="button" onClick={() => { setSelectedDraft(draft); setCreatingDraft(false); }} className="rounded-xl bg-white px-3 py-2 text-xs font-black text-activeBlue ring-1 ring-blue-100 hover:bg-blue-50">Open / 打开</button></td></tr>)}
              {!drafts.length ? <tr><td colSpan={7} className="p-6 text-center text-sm font-bold text-slate-500">{loading ? 'Loading...' : 'No AI drafts yet. / 暂无 AI 草稿。'}</td></tr> : null}
            </tbody></table></div>
          </SectionCard>
          <DraftEditor row={creatingDraft ? null : selectedDraft} section={section} onSaved={loadAll} onClose={() => { setSelectedDraft(null); setCreatingDraft(false); }} />
        </div>
      ) : null}

      {activeTab === 'logs' ? (
        <div className="mt-5"><SectionCard title="AI Logs / AI 日志" subtitle="Search AI logs by module, prompt type, risk, confidence and decision. / 按模块、提示词类型、风险、置信度和决策搜索 AI 日志。"><div className="overflow-x-auto rounded-2xl border border-slate-200"><table className="min-w-[960px] w-full text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="p-3">Risk</th><th className="p-3">Module</th><th className="p-3">Prompt</th><th className="p-3">Decision</th><th className="p-3">Confidence</th><th className="p-3">Created</th></tr></thead><tbody className="divide-y divide-slate-100">{logs.map((row) => <tr key={String(row.ai_log_id)}><td className="p-3"><Badge tone={statusTone(row.risk_level)}>{formatValue(row.risk_level)}</Badge></td><td className="p-3 font-bold text-slate-800">{formatValue(row.module)}</td><td className="p-3 text-slate-600">{formatValue(row.prompt_type)}</td><td className="max-w-72 truncate p-3 font-semibold text-slate-700">{formatValue(row.decision)}</td><td className="p-3 text-slate-600">{formatValue(row.confidence)}</td><td className="p-3 text-slate-500">{formatValue(row.created_at)}</td></tr>)}{!logs.length ? <tr><td colSpan={6} className="p-6 text-center text-sm font-bold text-slate-500">No AI logs yet. / 暂无 AI 日志。</td></tr> : null}</tbody></table></div></SectionCard></div>
      ) : null}

      {activeTab === 'search' ? (
        <div className="mt-5"><SectionCard title="Global Web / Search Logs / 全网搜索与搜索日志" subtitle="Review search_logs records for AI/web research and global search activity. / 查看 AI/全网搜索和全局搜索记录。"><div className="overflow-x-auto rounded-2xl border border-slate-200"><table className="min-w-[860px] w-full text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="p-3">Query</th><th className="p-3">Results</th><th className="p-3">Actor</th><th className="p-3">Created</th></tr></thead><tbody className="divide-y divide-slate-100">{searchLogs.map((row) => <tr key={String(row.search_log_id)}><td className="max-w-xl truncate p-3 font-bold text-slate-800">{formatValue(row.query)}</td><td className="p-3 text-slate-600">{formatValue(row.result_count)}</td><td className="p-3 text-slate-600">{formatValue(row.actor_id)}</td><td className="p-3 text-slate-500">{formatValue(row.created_at)}</td></tr>)}{!searchLogs.length ? <tr><td colSpan={4} className="p-6 text-center text-sm font-bold text-slate-500">No search logs yet. / 暂无搜索记录。</td></tr> : null}</tbody></table></div></SectionCard></div>
      ) : null}

      {activeTab === 'versions' ? (
        <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]"><SectionCard title="Version Snapshots / 版本快照" subtitle="Store approved AI rule/draft snapshots for audit and rollback. / 保存已审核 AI 规则/草稿版本快照，便于审计和回滚。"><div className="overflow-x-auto rounded-2xl border border-slate-200"><table className="min-w-[860px] w-full text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="p-3">Status</th><th className="p-3">Section</th><th className="p-3">Version</th><th className="p-3">Published</th></tr></thead><tbody className="divide-y divide-slate-100">{versions.map((version) => <tr key={String(version.version_id)}><td className="p-3"><Badge tone={statusTone(version.status)}>{formatValue(version.status)}</Badge></td><td className="p-3 font-bold text-slate-800">{formatValue(version.section_key)}</td><td className="p-3"><Badge tone="green">v{formatValue(version.version_no)}</Badge></td><td className="p-3 text-slate-500">{formatValue(version.published_at)}</td></tr>)}{!versions.length ? <tr><td colSpan={4} className="p-6 text-center text-sm font-bold text-slate-500">No AI versions yet. / 暂无 AI 版本。</td></tr> : null}</tbody></table></div></SectionCard><section className="rounded-3xl bg-white p-5 shadow-soft ring-1 ring-slate-200"><h3 className="text-lg font-black text-slate-950">AI Governance / AI 治理</h3><p className="mt-3 text-sm leading-7 text-slate-600">All AI content and AI decisions should remain auditable. AI cannot auto-publish, auto-send or auto-approve. Admin review and version snapshots are required.</p><button type="button" onClick={() => saveVersion()} className="mt-4 rounded-2xl bg-activeBlue px-4 py-3 text-sm font-black text-white hover:bg-blue-700">Create Version / 创建版本</button></section></div>
      ) : null}
    </div>
  );
}
