'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Badge } from './Badge';
import { SectionCard } from './SectionCard';
import { customerCenterSections, type CustomerCenterSectionConfig } from '@/lib/nanofix/customerCenterConfig';

type Row = Record<string, unknown>;
type Tab = 'customers' | 'records' | 'linked' | 'binding' | 'pdpa' | 'versions';

const inputClass = 'w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 outline-none transition focus:border-activeBlue focus:ring-2 focus:ring-blue-100';
const labelClass = 'mb-1 block text-xs font-black uppercase tracking-[0.12em] text-slate-500';
const customerStatuses = ['active', 'pending_verification', 'suspended'];
const accountStatuses = ['active', 'disabled', 'frozen', 'blacklisted', 'archived'];
const bindingStatuses = ['pending', 'linked', 'unlinked'];
const recordStatuses = ['draft', 'active', 'pending_review', 'approved', 'archived', 'disabled', 'blacklisted', 'frozen'];
const linkedCategories = ['leads', 'service_requests', 'jobs', 'quotations', 'invoices', 'payments', 'receipts', 'warranties'];

function formatValue(value: unknown) {
  if (value === null || value === undefined || value === '') return '—';
  if (Array.isArray(value)) return value.length ? value.join(', ') : '—';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

function statusTone(status: unknown): 'blue' | 'green' | 'amber' | 'red' | 'gray' | 'cyan' {
  const s = String(status || '');
  if (/(active|linked|approved|completed|paid|published)/i.test(s)) return 'green';
  if (/(pending|draft|review|verifying|suggested)/i.test(s)) return 'amber';
  if (/(suspended|disabled|frozen|blacklisted|archived|rejected|cancelled|overdue)/i.test(s)) return 'red';
  return 'blue';
}

function safeJsonString(value: unknown) {
  if (!value) return '{}';
  if (typeof value === 'string') return value;
  return JSON.stringify(value, null, 2);
}

function parseJsonInput(value: string) {
  try { return JSON.parse(value || '{}'); } catch { return null; }
}

function sectionDefaultJson(section?: CustomerCenterSectionConfig | null) {
  if (!section) return {};
  return { section_key: section.key, category: section.category, title: section.title, title_zh: section.zh, helper: section.helper, plain_password_visible: false, audit_required: true };
}

function SectionShortcutTabs({ activeSection }: { activeSection?: CustomerCenterSectionConfig | null }) {
  return (
    <div className="mb-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
      {customerCenterSections.map((section) => (
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
    ['customers', 'Customers', '客户'],
    ['records', 'Portal / Policy Records', '门户/规则记录'],
    ['linked', 'Linked Records', '关联记录'],
    ['binding', 'Binding Review', '绑定审核'],
    ['pdpa', 'PDPA Requests', 'PDPA 请求'],
    ['versions', 'Version Snapshots', '版本快照']
  ];
  return <div className="mb-5 grid gap-2 md:grid-cols-6">{tabs.map(([key, title, zh]) => <button key={key} type="button" onClick={() => onChange(key)} className={`rounded-2xl border px-4 py-3 text-left text-sm font-black transition ${active === key ? 'border-activeBlue bg-blue-50 text-activeBlue shadow-sm' : 'border-slate-200 bg-white text-slate-700 hover:border-activeBlue hover:text-activeBlue'}`}><span className="block">{title}</span><span className="block text-xs font-semibold text-slate-500">{zh}</span></button>)}</div>;
}

function CustomerEditor({ row, onSaved, onClose }: { row: Row | null; onSaved: () => void; onClose: () => void }) {
  const [form, setForm] = useState<Row>(row || { name: '', email: '', phone: '', whatsapp: '', status: 'active', account_status: 'active', binding_status: 'linked', address_json: {}, tags: [], risk_tags: [], vip_tags: [] });
  const [addressJson, setAddressJson] = useState(safeJsonString(row?.address_json || {}));
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => { setForm(row || { name: '', email: '', phone: '', whatsapp: '', status: 'active', account_status: 'active', binding_status: 'linked', address_json: {}, tags: [], risk_tags: [], vip_tags: [] }); setAddressJson(safeJsonString(row?.address_json || {})); setMessage(''); }, [row]);

  async function save() {
    const parsed = parseJsonInput(addressJson);
    if (parsed === null) { setMessage('Address JSON is invalid. / 地址 JSON 格式错误。'); return; }
    setSaving(true);
    const response = await fetch('/api/admin/customer-center', { method: row ? 'PATCH' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...form, address_json: parsed, action: row ? 'update_customer' : 'create_customer', customer_id: row?.customer_id }) });
    const json = await response.json().catch(() => ({}));
    setSaving(false);
    if (!response.ok || !json.ok) { setMessage(json.error || 'Save failed. / 保存失败。'); return; }
    setMessage('Saved. / 已保存。');
    onSaved();
  }

  return <div className="rounded-3xl bg-white p-5 shadow-soft ring-1 ring-slate-200"><div className="mb-4 flex items-start justify-between gap-3"><div><div className="text-xs font-black uppercase tracking-[0.16em] text-activeBlue">{row ? 'Edit Customer' : 'New Customer'}</div><h3 className="mt-1 text-xl font-black text-slate-950">{row ? formatValue(row.name) : 'Create Customer'}</h3></div><button type="button" onClick={onClose} className="rounded-xl bg-slate-100 px-3 py-2 text-xs font-black text-slate-600 hover:bg-slate-200">Close / 关闭</button></div>{message ? <div className="mb-4 rounded-2xl bg-blue-50 px-4 py-3 text-sm font-bold text-blue-800 ring-1 ring-blue-100">{message}</div> : null}<div className="grid gap-4 md:grid-cols-2"><label><span className={labelClass}>Name / 姓名</span><input className={inputClass} value={String(form.name || '')} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} /></label><label><span className={labelClass}>Email / 邮箱</span><input className={inputClass} value={String(form.email || '')} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} /></label><label><span className={labelClass}>Phone / 电话</span><input className={inputClass} value={String(form.phone || '')} onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))} /></label><label><span className={labelClass}>WhatsApp</span><input className={inputClass} value={String(form.whatsapp || '')} onChange={(event) => setForm((current) => ({ ...current, whatsapp: event.target.value }))} /></label><label><span className={labelClass}>Status / 状态</span><select className={inputClass} value={String(form.status || 'active')} onChange={(event) => setForm((current) => ({ ...current, status: event.target.value }))}>{customerStatuses.map((s) => <option key={s} value={s}>{s}</option>)}</select></label><label><span className={labelClass}>Account Status / 账号状态</span><select className={inputClass} value={String(form.account_status || 'active')} onChange={(event) => setForm((current) => ({ ...current, account_status: event.target.value }))}>{accountStatuses.map((s) => <option key={s} value={s}>{s}</option>)}</select></label><label><span className={labelClass}>Binding Status / 绑定状态</span><select className={inputClass} value={String(form.binding_status || 'linked')} onChange={(event) => setForm((current) => ({ ...current, binding_status: event.target.value }))}>{bindingStatuses.map((s) => <option key={s} value={s}>{s}</option>)}</select></label><label className="md:col-span-2"><span className={labelClass}>Address JSON / 地址 JSON</span><textarea className={`${inputClass} min-h-32 font-mono text-xs`} value={addressJson} onChange={(event) => setAddressJson(event.target.value)} /></label><label><span className={labelClass}>Tags / 标签</span><input className={inputClass} value={Array.isArray(form.tags) ? form.tags.join(', ') : String(form.tags || '')} onChange={(event) => setForm((current) => ({ ...current, tags: event.target.value }))} /></label><label><span className={labelClass}>Risk Tags / 风险标签</span><input className={inputClass} value={Array.isArray(form.risk_tags) ? form.risk_tags.join(', ') : String(form.risk_tags || '')} onChange={(event) => setForm((current) => ({ ...current, risk_tags: event.target.value }))} /></label></div><button type="button" disabled={saving} onClick={save} className="mt-4 rounded-2xl bg-activeBlue px-5 py-3 text-sm font-black text-white shadow-sm hover:bg-blue-700 disabled:opacity-60">Save Customer / 保存客户</button></div>;
}

function RecordEditor({ row, section, customerId, onSaved, onClose }: { row: Row | null; section?: CustomerCenterSectionConfig | null; customerId: string; onSaved: () => void; onClose: () => void }) {
  const [form, setForm] = useState<Row>(row || { section_key: section?.key || 'customer-portal-management', category: section?.category || 'general', customer_id: customerId || '', title: section?.title || '', body: '', status: 'draft', config_json: sectionDefaultJson(section) });
  const [configJson, setConfigJson] = useState(safeJsonString(row?.config_json || sectionDefaultJson(section)));
  const [message, setMessage] = useState('');

  useEffect(() => { setForm(row || { section_key: section?.key || 'customer-portal-management', category: section?.category || 'general', customer_id: customerId || '', title: section?.title || '', body: '', status: 'draft', config_json: sectionDefaultJson(section) }); setConfigJson(safeJsonString(row?.config_json || sectionDefaultJson(section))); setMessage(''); }, [row, section, customerId]);

  async function save() {
    const parsed = parseJsonInput(configJson);
    if (parsed === null) { setMessage('Config JSON is invalid. / 配置 JSON 格式错误。'); return; }
    const response = await fetch('/api/admin/customer-center', { method: row ? 'PATCH' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...form, config_json: parsed, action: row ? 'update_record' : 'create_record', record_id: row?.record_id }) });
    const json = await response.json().catch(() => ({}));
    if (!response.ok || !json.ok) { setMessage(json.error || 'Save failed. / 保存失败。'); return; }
    setMessage('Saved. / 已保存。');
    onSaved();
  }

  return <div className="rounded-3xl bg-white p-5 shadow-soft ring-1 ring-slate-200"><div className="mb-4 flex items-start justify-between gap-3"><div><div className="text-xs font-black uppercase tracking-[0.16em] text-activeBlue">{row ? 'Edit Customer Center Record' : 'New Customer Center Record'}</div><h3 className="mt-1 text-xl font-black text-slate-950">{row ? formatValue(row.title) : `Create ${section?.title || 'Record'}`}</h3></div><button type="button" onClick={onClose} className="rounded-xl bg-slate-100 px-3 py-2 text-xs font-black text-slate-600 hover:bg-slate-200">Close / 关闭</button></div>{message ? <div className="mb-4 rounded-2xl bg-blue-50 px-4 py-3 text-sm font-bold text-blue-800 ring-1 ring-blue-100">{message}</div> : null}<div className="grid gap-4 md:grid-cols-2"><label><span className={labelClass}>Section Key / 栏目键名</span><input className={inputClass} value={String(form.section_key || '')} onChange={(event) => setForm((current) => ({ ...current, section_key: event.target.value }))} /></label><label><span className={labelClass}>Category / 分类</span><input className={inputClass} value={String(form.category || '')} onChange={(event) => setForm((current) => ({ ...current, category: event.target.value }))} /></label><label><span className={labelClass}>Customer ID / 客户ID</span><input className={inputClass} value={String(form.customer_id || '')} onChange={(event) => setForm((current) => ({ ...current, customer_id: event.target.value }))} /></label><label><span className={labelClass}>Status / 状态</span><select className={inputClass} value={String(form.status || 'draft')} onChange={(event) => setForm((current) => ({ ...current, status: event.target.value }))}>{recordStatuses.map((s) => <option key={s} value={s}>{s}</option>)}</select></label><label className="md:col-span-2"><span className={labelClass}>Title / 标题</span><input className={inputClass} value={String(form.title || '')} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} /></label><label className="md:col-span-2"><span className={labelClass}>Body / 内容</span><textarea className={`${inputClass} min-h-24`} value={String(form.body || '')} onChange={(event) => setForm((current) => ({ ...current, body: event.target.value }))} /></label><label className="md:col-span-2"><span className={labelClass}>Config JSON / 配置 JSON</span><textarea className={`${inputClass} min-h-40 font-mono text-xs`} value={configJson} onChange={(event) => setConfigJson(event.target.value)} /></label></div><button type="button" onClick={save} className="mt-4 rounded-2xl bg-activeBlue px-5 py-3 text-sm font-black text-white shadow-sm hover:bg-blue-700">Save Record / 保存记录</button></div>;
}

export function CustomerCenterWorkspace({ section }: { section?: CustomerCenterSectionConfig | null }) {
  const [activeTab, setActiveTab] = useState<Tab>(section?.tab || 'customers');
  const [customers, setCustomers] = useState<Row[]>([]);
  const [records, setRecords] = useState<Row[]>([]);
  const [linked, setLinked] = useState<Row[]>([]);
  const [binding, setBinding] = useState<Row[]>([]);
  const [pdpa, setPdpa] = useState<Row[]>([]);
  const [versions, setVersions] = useState<Row[]>([]);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [category, setCategory] = useState(section?.category || 'leads');
  const [selectedCustomer, setSelectedCustomer] = useState<Row | null>(null);
  const [selectedRecord, setSelectedRecord] = useState<Row | null>(null);
  const [creatingCustomer, setCreatingCustomer] = useState(false);
  const [creatingRecord, setCreatingRecord] = useState(false);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => { setActiveTab(section?.tab || 'customers'); setCategory(section?.tab === 'linked' ? section.category : 'leads'); setSelectedCustomer(null); setSelectedRecord(null); setCreatingCustomer(false); setCreatingRecord(false); }, [section]);

  async function loadAll() {
    setLoading(true); setMessage('');
    const params = new URLSearchParams({ mode: 'all' });
    if (search) params.set('search', search);
    if (status) params.set('status', status);
    if (section?.key) params.set('section_key', section.key);
    if (customerId) params.set('customer_id', customerId);
    if (category) params.set('category', category);
    const response = await fetch(`/api/admin/customer-center?${params.toString()}`, { cache: 'no-store' });
    const json = await response.json().catch(() => ({}));
    setLoading(false);
    if (!response.ok || !json.ok) { setMessage(json.error || 'Load failed. / 加载失败。'); return; }
    setCustomers(json.customers || []); setRecords(json.records || []); setBinding(json.binding || []); setPdpa(json.pdpa || []); setLinked(json.linked || []); setVersions(json.versions || []);
  }

  useEffect(() => { void loadAll(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [section]);

  async function saveVersion(row?: Row | null) {
    const source = row || selectedRecord || selectedCustomer;
    const response = await fetch('/api/admin/customer-center', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'save_version', record_id: source?.record_id, customer_id: source?.customer_id || customerId, section_key: section?.key || 'general', status: 'approved', snapshot_json: { section_key: section?.key, category, source, created_at: new Date().toISOString() } }) });
    const json = await response.json().catch(() => ({}));
    if (!response.ok || !json.ok) { setMessage(json.error || 'Save version failed. / 保存版本失败。'); return; }
    setMessage(`Customer Center version saved as v${json.version?.version_no}. / 已保存客户中心版本 v${json.version?.version_no}。`); await loadAll();
  }

  async function reviewBinding(row: Row, nextStatus: string) {
    const response = await fetch('/api/admin/customer-center', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'review_binding', suggestion_id: row.suggestion_id, status: nextStatus }) });
    const json = await response.json().catch(() => ({}));
    if (!response.ok || !json.ok) { setMessage(json.error || 'Binding review failed. / 绑定审核失败。'); return; }
    setMessage('Binding review updated. / 绑定审核已更新。'); await loadAll();
  }

  return <div><SectionShortcutTabs activeSection={section} />{section ? <div className="mb-5 rounded-3xl bg-white p-5 shadow-soft ring-1 ring-slate-200"><div className="text-xs font-black uppercase tracking-[0.16em] text-activeBlue">Customer Center Section / 客户中心二级栏目</div><h3 className="mt-1 text-2xl font-black text-slate-950">{section.title} / {section.zh}</h3><p className="mt-2 text-sm font-semibold leading-6 text-slate-600">{section.helper}</p><div className="mt-3 flex flex-wrap gap-2"><Badge tone="blue">Category: {section.category}</Badge><Badge tone="green">RLS + admin API</Badge><Badge tone="amber">Audit log enabled</Badge></div></div> : null}<Tabs active={activeTab} onChange={setActiveTab} />{message ? <div className="mb-4 rounded-2xl bg-blue-50 px-4 py-3 text-sm font-bold text-blue-800 ring-1 ring-blue-100">{message}</div> : null}<SectionCard title="Customer Center Control / 客户中心控制台" subtitle="Manage customers, portal rules, linked records, binding review, PDPA requests and version snapshots. / 管理客户、门户规则、关联记录、绑定审核、PDPA 和版本快照。"><div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_220px_220px_220px_auto_auto]"><input className={inputClass} placeholder="Search name, phone, email, title... / 搜索" value={search} onChange={(event) => setSearch(event.target.value)} /><input className={inputClass} placeholder="Customer ID / 客户ID" value={customerId} onChange={(event) => setCustomerId(event.target.value)} /><select className={inputClass} value={category} onChange={(event) => setCategory(event.target.value)}>{linkedCategories.map((c) => <option key={c} value={c}>{c}</option>)}</select><select className={inputClass} value={status} onChange={(event) => setStatus(event.target.value)}><option value="">All statuses / 全部状态</option>{[...new Set([...customerStatuses, ...accountStatuses, ...recordStatuses, 'suggested', 'rejected', 'open', 'verifying', 'completed'])].map((s) => <option key={s} value={s}>{s}</option>)}</select><button type="button" onClick={loadAll} className="rounded-2xl bg-slate-900 px-5 py-2 text-sm font-black text-white hover:bg-slate-700">Search / 搜索</button><button type="button" onClick={() => saveVersion()} className="rounded-2xl bg-activeBlue px-5 py-2 text-sm font-black text-white hover:bg-blue-700">Save Version / 保存版本</button></div></SectionCard>

  {activeTab === 'customers' ? <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1fr)_460px]"><SectionCard title="Customers / 客户" subtitle="Real customers table with create, edit, search and account status control. / 真实客户表，支持新增、编辑、搜索和账号状态控制。"><div className="mb-3 flex justify-end"><button type="button" onClick={() => { setCreatingCustomer(true); setSelectedCustomer(null); }} className="rounded-2xl bg-activeBlue px-4 py-2 text-sm font-black text-white">New Customer / 新增客户</button></div><div className="overflow-x-auto rounded-2xl border border-slate-200"><table className="min-w-[980px] w-full text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="p-3">Status</th><th className="p-3">Account</th><th className="p-3">Binding</th><th className="p-3">Name</th><th className="p-3">Phone</th><th className="p-3">Email</th><th className="p-3">Action</th></tr></thead><tbody className="divide-y divide-slate-100">{customers.map((c) => <tr key={String(c.customer_id)} className="hover:bg-blue-50/50"><td className="p-3"><Badge tone={statusTone(c.status)}>{formatValue(c.status)}</Badge></td><td className="p-3"><Badge tone={statusTone(c.account_status)}>{formatValue(c.account_status)}</Badge></td><td className="p-3"><Badge tone={statusTone(c.binding_status)}>{formatValue(c.binding_status)}</Badge></td><td className="p-3 font-bold text-slate-800">{formatValue(c.name)}</td><td className="p-3 text-slate-600">{formatValue(c.phone || c.whatsapp)}</td><td className="p-3 text-slate-600">{formatValue(c.email)}</td><td className="p-3"><button type="button" onClick={() => { setSelectedCustomer(c); setCreatingCustomer(false); setCustomerId(String(c.customer_id || '')); }} className="rounded-xl bg-white px-3 py-2 text-xs font-black text-activeBlue ring-1 ring-blue-100 hover:bg-blue-50">Open / 打开</button></td></tr>)}{!customers.length ? <tr><td colSpan={7} className="p-6 text-center text-sm font-bold text-slate-500">{loading ? 'Loading...' : 'No customers yet. / 暂无客户。'}</td></tr> : null}</tbody></table></div></SectionCard><CustomerEditor row={creatingCustomer ? null : selectedCustomer} onSaved={loadAll} onClose={() => { setSelectedCustomer(null); setCreatingCustomer(false); }} /></div> : null}

  {activeTab === 'records' ? <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1fr)_460px]"><SectionCard title="Portal / Policy Records / 门户与规则记录" subtitle="Create and edit customer portal policies, account control notes, OTP and archive rules. / 新增和编辑客户门户策略、账号控制、OTP 和归档规则。"><div className="mb-3 flex justify-end"><button type="button" onClick={() => { setCreatingRecord(true); setSelectedRecord(null); }} className="rounded-2xl bg-activeBlue px-4 py-2 text-sm font-black text-white">New Record / 新增记录</button></div><div className="overflow-x-auto rounded-2xl border border-slate-200"><table className="min-w-[920px] w-full text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="p-3">Status</th><th className="p-3">Section</th><th className="p-3">Category</th><th className="p-3">Title</th><th className="p-3">Customer</th><th className="p-3">Action</th></tr></thead><tbody className="divide-y divide-slate-100">{records.map((r) => <tr key={String(r.record_id)} className="hover:bg-blue-50/50"><td className="p-3"><Badge tone={statusTone(r.status)}>{formatValue(r.status)}</Badge></td><td className="p-3 text-slate-600">{formatValue(r.section_key)}</td><td className="p-3 text-slate-600">{formatValue(r.category)}</td><td className="p-3 font-bold text-slate-800">{formatValue(r.title)}</td><td className="p-3 text-slate-500">{String(r.customer_id || '').slice(0, 8)}</td><td className="p-3"><button type="button" onClick={() => { setSelectedRecord(r); setCreatingRecord(false); }} className="rounded-xl bg-white px-3 py-2 text-xs font-black text-activeBlue ring-1 ring-blue-100 hover:bg-blue-50">Open / 打开</button></td></tr>)}{!records.length ? <tr><td colSpan={6} className="p-6 text-center text-sm font-bold text-slate-500">No records yet. / 暂无记录。</td></tr> : null}</tbody></table></div></SectionCard><RecordEditor row={creatingRecord ? null : selectedRecord} section={section} customerId={customerId} onSaved={loadAll} onClose={() => { setSelectedRecord(null); setCreatingRecord(false); }} /></div> : null}

  {activeTab === 'linked' ? <div className="mt-5"><SectionCard title="Linked Records / 关联记录" subtitle={`Current linked category: ${category}. Use Customer ID filter for customer-specific 360 view. / 当前分类：${category}，可用客户ID筛选客户全景。`}><div className="overflow-x-auto rounded-2xl border border-slate-200"><table className="min-w-[1000px] w-full text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="p-3">Status</th><th className="p-3">ID</th><th className="p-3">Main Info</th><th className="p-3">Amount / Date</th><th className="p-3">Created</th></tr></thead><tbody className="divide-y divide-slate-100">{linked.map((r) => <tr key={Object.values(r).join('-').slice(0, 80)}><td className="p-3"><Badge tone={statusTone(r.status)}>{formatValue(r.status)}</Badge></td><td className="p-3 font-mono text-xs text-slate-500">{formatValue(r.lead_id || r.service_request_id || r.job_id || r.quotation_id || r.invoice_id || r.payment_id || r.receipt_id || r.warranty_id)}</td><td className="max-w-md truncate p-3 font-bold text-slate-800">{formatValue(r.name || r.contact_name || r.issue_type || r.invoice_no || r.coverage || r.transaction_id || r.completion_notes)}</td><td className="p-3 text-slate-600">{formatValue(r.total_amount || r.amount || r.scheduled_at || r.valid_until || r.ends_on)}</td><td className="p-3 text-slate-500">{formatValue(r.created_at)}</td></tr>)}{!linked.length ? <tr><td colSpan={5} className="p-6 text-center text-sm font-bold text-slate-500">No linked records. / 暂无关联记录。</td></tr> : null}</tbody></table></div></SectionCard></div> : null}

  {activeTab === 'binding' ? <div className="mt-5"><SectionCard title="Customer Binding Review / 客户绑定审核" subtitle="Approve or reject customer binding suggestions. / 审核客户匹配绑定建议。"><div className="overflow-x-auto rounded-2xl border border-slate-200"><table className="min-w-[920px] w-full text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="p-3">Status</th><th className="p-3">Score</th><th className="p-3">Customer</th><th className="p-3">Service Request</th><th className="p-3">Reasons</th><th className="p-3">Action</th></tr></thead><tbody className="divide-y divide-slate-100">{binding.map((b) => <tr key={String(b.suggestion_id)}><td className="p-3"><Badge tone={statusTone(b.status)}>{formatValue(b.status)}</Badge></td><td className="p-3 font-bold text-slate-800">{formatValue(b.match_score)}</td><td className="p-3 text-slate-600">{formatValue(b.customer_id)}</td><td className="p-3 text-slate-600">{formatValue(b.service_request_id)}</td><td className="p-3 text-slate-600">{formatValue(b.match_reasons)}</td><td className="p-3 flex gap-2"><button onClick={() => reviewBinding(b, 'approved')} className="rounded-xl bg-green-50 px-3 py-2 text-xs font-black text-green-700 ring-1 ring-green-100">Approve</button><button onClick={() => reviewBinding(b, 'rejected')} className="rounded-xl bg-red-50 px-3 py-2 text-xs font-black text-red-700 ring-1 ring-red-100">Reject</button></td></tr>)}{!binding.length ? <tr><td colSpan={6} className="p-6 text-center text-sm font-bold text-slate-500">No binding suggestions. / 暂无绑定建议。</td></tr> : null}</tbody></table></div></SectionCard></div> : null}

  {activeTab === 'pdpa' ? <div className="mt-5"><SectionCard title="PDPA Requests / PDPA 请求" subtitle="Review customer access, correction, deletion and privacy requests. / 查看客户访问、更正、删除和隐私请求。"><div className="overflow-x-auto rounded-2xl border border-slate-200"><table className="min-w-[860px] w-full text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="p-3">Status</th><th className="p-3">Type</th><th className="p-3">Customer</th><th className="p-3">Details</th><th className="p-3">Created</th></tr></thead><tbody className="divide-y divide-slate-100">{pdpa.map((p) => <tr key={String(p.request_id)}><td className="p-3"><Badge tone={statusTone(p.status)}>{formatValue(p.status)}</Badge></td><td className="p-3 font-bold text-slate-800">{formatValue(p.request_type)}</td><td className="p-3 text-slate-600">{formatValue(p.customer_id)}</td><td className="max-w-lg truncate p-3 text-slate-600">{formatValue(p.details)}</td><td className="p-3 text-slate-500">{formatValue(p.created_at)}</td></tr>)}{!pdpa.length ? <tr><td colSpan={5} className="p-6 text-center text-sm font-bold text-slate-500">No PDPA requests. / 暂无 PDPA 请求。</td></tr> : null}</tbody></table></div></SectionCard></div> : null}

  {activeTab === 'versions' ? <div className="mt-5"><SectionCard title="Version Snapshots / 版本快照" subtitle="Save customer center policy/customer snapshots for audit and rollback. / 保存客户中心策略/客户快照，便于审计和回滚。"><div className="overflow-x-auto rounded-2xl border border-slate-200"><table className="min-w-[760px] w-full text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="p-3">Status</th><th className="p-3">Section</th><th className="p-3">Version</th><th className="p-3">Customer</th><th className="p-3">Published</th></tr></thead><tbody className="divide-y divide-slate-100">{versions.map((v) => <tr key={String(v.version_id)}><td className="p-3"><Badge tone={statusTone(v.status)}>{formatValue(v.status)}</Badge></td><td className="p-3 font-bold text-slate-800">{formatValue(v.section_key)}</td><td className="p-3"><Badge tone="green">v{formatValue(v.version_no)}</Badge></td><td className="p-3 text-slate-600">{formatValue(v.customer_id)}</td><td className="p-3 text-slate-500">{formatValue(v.published_at)}</td></tr>)}{!versions.length ? <tr><td colSpan={5} className="p-6 text-center text-sm font-bold text-slate-500">No versions yet. / 暂无版本。</td></tr> : null}</tbody></table></div></SectionCard></div> : null}
  </div>;
}
