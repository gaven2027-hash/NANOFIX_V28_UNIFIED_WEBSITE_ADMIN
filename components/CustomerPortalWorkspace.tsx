'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Badge } from './Badge';
import { SectionCard } from './SectionCard';
import { customerPortalSections, type CustomerPortalSectionConfig } from '@/lib/nanofix/customerPortalConfig';

type Row = Record<string, unknown>;
type Tab = 'requests' | 'quotes' | 'invoices' | 'payments' | 'warranties' | 'submit' | 'versions';

const inputClass = 'w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 outline-none transition focus:border-activeBlue focus:ring-2 focus:ring-blue-100';
const labelClass = 'mb-1 block text-xs font-black uppercase tracking-[0.12em] text-slate-500';
const requestStatuses = ['pending_review', 'scheduled', 'inspected', 'quoted', 'approved', 'cancelled'];
const priorities = ['P0', 'P1', 'P2', 'P3'];

function formatValue(value: unknown) {
  if (value === null || value === undefined || value === '') return '—';
  if (Array.isArray(value)) return value.length ? value.join(', ') : '—';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

function statusTone(status: unknown): 'blue' | 'green' | 'amber' | 'red' | 'gray' | 'cyan' {
  const s = String(status || '');
  if (/(active|approved|accepted|paid|succeeded|issued|published)/i.test(s)) return 'green';
  if (/(pending|draft|scheduled|quoted|inspected|processing|partially)/i.test(s)) return 'amber';
  if (/(cancelled|rejected|expired|void|failed|overdue|refunded|archived)/i.test(s)) return 'red';
  return 'blue';
}

function SectionShortcutTabs({ activeSection }: { activeSection?: CustomerPortalSectionConfig | null }) {
  return (
    <div className="mb-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {customerPortalSections.map((section) => (
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
    ['requests', 'Repair Requests', '报修'],
    ['quotes', 'Quotes', '报价'],
    ['invoices', 'Invoices', '发票'],
    ['payments', 'Payments / Receipts', '付款/收据'],
    ['warranties', 'Warranties', '保修'],
    ['submit', 'Submit Request', '提交报修'],
    ['versions', 'Versions', '版本']
  ];
  return <div className="mb-5 grid gap-2 md:grid-cols-7">{tabs.map(([key, title, zh]) => <button key={key} type="button" onClick={() => onChange(key)} className={`rounded-2xl border px-4 py-3 text-left text-sm font-black transition ${active === key ? 'border-activeBlue bg-blue-50 text-activeBlue shadow-sm' : 'border-slate-200 bg-white text-slate-700 hover:border-activeBlue hover:text-activeBlue'}`}><span className="block">{title}</span><span className="block text-xs font-semibold text-slate-500">{zh}</span></button>)}</div>;
}

function RequestCreator({ customerId, onSaved }: { customerId: string; onSaved: () => void }) {
  const [form, setForm] = useState<Row>({ customer_id: customerId, contact_name: '', phone: '', whatsapp: '', email: '', issue_type: 'water_leak', issue_description: '', leak_location: '', property_address: '', postal_code: '', property_type: '', preferred_time_text: '', priority: 'P2', status: 'pending_review', consent: true });
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => setForm((current) => ({ ...current, customer_id: customerId })), [customerId]);

  async function save() {
    setSaving(true);
    const response = await fetch('/api/admin/customer-portal', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...form, action: 'create_request' }) });
    const json = await response.json().catch(() => ({}));
    setSaving(false);
    if (!response.ok || !json.ok) { setMessage(json.error || 'Create failed. / 创建失败。'); return; }
    setMessage('Repair request created. / 报修已创建。');
    onSaved();
  }

  return <SectionCard title="Create Customer Portal Repair Request / 创建客户门户报修" subtitle="Creates a real service_requests record. Registration itself does not create jobs, quotations, invoices or warranties. / 创建真实 service_requests；注册本身不自动生成工单、报价、发票或保修。"><div className="grid gap-4 md:grid-cols-2"><label><span className={labelClass}>Customer ID / 客户ID</span><input className={inputClass} value={String(form.customer_id || '')} onChange={(event) => setForm((current) => ({ ...current, customer_id: event.target.value }))} /></label><label><span className={labelClass}>Priority / 优先级</span><select className={inputClass} value={String(form.priority || 'P2')} onChange={(event) => setForm((current) => ({ ...current, priority: event.target.value }))}>{priorities.map((p) => <option key={p} value={p}>{p}</option>)}</select></label><label><span className={labelClass}>Contact Name / 联系人</span><input className={inputClass} value={String(form.contact_name || '')} onChange={(event) => setForm((current) => ({ ...current, contact_name: event.target.value }))} /></label><label><span className={labelClass}>Phone / 电话</span><input className={inputClass} value={String(form.phone || '')} onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))} /></label><label><span className={labelClass}>WhatsApp</span><input className={inputClass} value={String(form.whatsapp || '')} onChange={(event) => setForm((current) => ({ ...current, whatsapp: event.target.value }))} /></label><label><span className={labelClass}>Email / 邮箱</span><input className={inputClass} value={String(form.email || '')} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} /></label><label><span className={labelClass}>Issue Type / 问题类型</span><input className={inputClass} value={String(form.issue_type || '')} onChange={(event) => setForm((current) => ({ ...current, issue_type: event.target.value }))} /></label><label><span className={labelClass}>Leak Location / 漏水位置</span><input className={inputClass} value={String(form.leak_location || '')} onChange={(event) => setForm((current) => ({ ...current, leak_location: event.target.value }))} /></label><label className="md:col-span-2"><span className={labelClass}>Property Address / 地址</span><input className={inputClass} value={String(form.property_address || '')} onChange={(event) => setForm((current) => ({ ...current, property_address: event.target.value }))} /></label><label><span className={labelClass}>Postal Code / 邮编</span><input className={inputClass} value={String(form.postal_code || '')} onChange={(event) => setForm((current) => ({ ...current, postal_code: event.target.value }))} /></label><label><span className={labelClass}>Preferred Time / 期望时间</span><input className={inputClass} value={String(form.preferred_time_text || '')} onChange={(event) => setForm((current) => ({ ...current, preferred_time_text: event.target.value }))} /></label><label className="md:col-span-2"><span className={labelClass}>Issue Description / 问题描述</span><textarea className={`${inputClass} min-h-32`} value={String(form.issue_description || '')} onChange={(event) => setForm((current) => ({ ...current, issue_description: event.target.value }))} /></label></div>{message ? <div className="mt-4 rounded-2xl bg-blue-50 px-4 py-3 text-sm font-bold text-blue-800 ring-1 ring-blue-100">{message}</div> : null}<button type="button" disabled={saving} onClick={save} className="mt-4 rounded-2xl bg-activeBlue px-5 py-3 text-sm font-black text-white hover:bg-blue-700 disabled:opacity-60">Create Request / 创建报修</button></SectionCard>;
}

function GenericTable({ title, subtitle, rows, empty }: { title: string; subtitle: string; rows: Row[]; empty: string }) {
  const keys = rows[0] ? Object.keys(rows[0]).slice(0, 7) : [];
  return <SectionCard title={title} subtitle={subtitle}><div className="overflow-x-auto rounded-2xl border border-slate-200"><table className="min-w-[980px] w-full text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr>{keys.length ? keys.map((key) => <th key={key} className="p-3">{key}</th>) : <th className="p-3">Records</th>}</tr></thead><tbody className="divide-y divide-slate-100">{rows.map((row, index) => <tr key={String(row[Object.keys(row)[0]]) || index.toString()}>{keys.map((key) => <td key={key} className="max-w-56 truncate p-3 text-slate-700">{key.includes('status') ? <Badge tone={statusTone(row[key])}>{formatValue(row[key])}</Badge> : formatValue(row[key])}</td>)}</tr>)}{!rows.length ? <tr><td className="p-6 text-center text-sm font-bold text-slate-500">{empty}</td></tr> : null}</tbody></table></div></SectionCard>;
}

export function CustomerPortalWorkspace({ section }: { section?: CustomerPortalSectionConfig | null }) {
  const [activeTab, setActiveTab] = useState<Tab>(section?.tab || 'requests');
  const [customers, setCustomers] = useState<Row[]>([]);
  const [requests, setRequests] = useState<Row[]>([]);
  const [quotes, setQuotes] = useState<Row[]>([]);
  const [invoices, setInvoices] = useState<Row[]>([]);
  const [payments, setPayments] = useState<Row[]>([]);
  const [receipts, setReceipts] = useState<Row[]>([]);
  const [warranties, setWarranties] = useState<Row[]>([]);
  const [versions, setVersions] = useState<Row[]>([]);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => { setActiveTab(section?.tab || 'requests'); }, [section]);

  async function loadAll() {
    setLoading(true); setMessage('');
    const params = new URLSearchParams({ mode: 'all' });
    if (search) params.set('search', search);
    if (status) params.set('status', status);
    if (customerId) params.set('customer_id', customerId);
    if (section?.key) params.set('section_key', section.key);
    const response = await fetch(`/api/admin/customer-portal?${params.toString()}`, { cache: 'no-store' });
    const json = await response.json().catch(() => ({}));
    setLoading(false);
    if (!response.ok || !json.ok) { setMessage(json.error || 'Load failed. / 加载失败。'); return; }
    setCustomers(json.customers || []); setRequests(json.requests || []); setQuotes(json.quotes || []); setInvoices(json.invoices || []); setPayments(json.payments || []); setReceipts(json.receipts || []); setWarranties(json.warranties || []); setVersions(json.versions || []);
  }

  useEffect(() => { void loadAll(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [section]);

  async function saveVersion(entity?: Row | null, entityType = 'portal_record') {
    const entityId = entity?.service_request_id || entity?.quotation_id || entity?.invoice_id || entity?.payment_id || entity?.warranty_id || entity?.version_id;
    const response = await fetch('/api/admin/customer-portal', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'save_version', section_key: section?.key || activeTab, customer_id: entity?.customer_id || customerId, entity_type: entityType, entity_id: entityId, status: 'approved', snapshot_json: { section_key: section?.key, active_tab: activeTab, entity, created_at: new Date().toISOString() } }) });
    const json = await response.json().catch(() => ({}));
    if (!response.ok || !json.ok) { setMessage(json.error || 'Save version failed. / 保存版本失败。'); return; }
    setMessage(`Customer Portal version saved as v${json.version?.version_no}. / 已保存客户门户版本 v${json.version?.version_no}。`); await loadAll();
  }

  return <div><SectionShortcutTabs activeSection={section} />{section ? <div className="mb-5 rounded-3xl bg-white p-5 shadow-soft ring-1 ring-slate-200"><div className="text-xs font-black uppercase tracking-[0.16em] text-activeBlue">Customer Portal Admin Section / 客户门户管理二级栏目</div><h3 className="mt-1 text-2xl font-black text-slate-950">{section.title} / {section.zh}</h3><p className="mt-2 text-sm font-semibold leading-6 text-slate-600">{section.helper}</p><div className="mt-3 flex flex-wrap gap-2"><Badge tone="blue">Admin-side portal management</Badge><Badge tone="green">Customer data filtered by RLS API</Badge><Badge tone="amber">Standalone portal: /portal/customer</Badge></div></div> : null}<Tabs active={activeTab} onChange={setActiveTab} />{message ? <div className="mb-4 rounded-2xl bg-blue-50 px-4 py-3 text-sm font-bold text-blue-800 ring-1 ring-blue-100">{message}</div> : null}<SectionCard title="Customer Portal Control / 客户门户控制台" subtitle="Admin-side customer portal data view. Use Customer ID to simulate customer-visible records. / 管理员侧客户门户数据视图，可用客户ID筛选客户可见记录。"><div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_260px_220px_auto_auto]"><input className={inputClass} placeholder="Search customer, request, invoice... / 搜索" value={search} onChange={(event) => setSearch(event.target.value)} /><input className={inputClass} placeholder="Customer ID / 客户ID" value={customerId} onChange={(event) => setCustomerId(event.target.value)} /><select className={inputClass} value={status} onChange={(event) => setStatus(event.target.value)}><option value="">All statuses / 全部状态</option>{[...requestStatuses, 'draft', 'sent', 'accepted', 'paid', 'issued', 'active', 'expired', 'succeeded', 'failed'].map((s) => <option key={s} value={s}>{s}</option>)}</select><button type="button" onClick={loadAll} className="rounded-2xl bg-slate-900 px-5 py-2 text-sm font-black text-white hover:bg-slate-700">Search / 搜索</button><button type="button" onClick={() => saveVersion(null)} className="rounded-2xl bg-activeBlue px-5 py-2 text-sm font-black text-white hover:bg-blue-700">Save Version / 保存版本</button></div></SectionCard>

  <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]"><section>{activeTab === 'requests' ? <GenericTable title="My Repair Requests / 我的报修" subtitle="Real service_requests visible in customer portal management." rows={requests} empty={loading ? 'Loading...' : 'No repair requests. / 暂无报修。'} /> : null}{activeTab === 'quotes' ? <GenericTable title="My Quotes / 我的报价" subtitle="Real quotations linked to customers." rows={quotes} empty="No quotes. / 暂无报价。" /> : null}{activeTab === 'invoices' ? <GenericTable title="My Invoices / 我的发票" subtitle="Real invoices linked to customers." rows={invoices} empty="No invoices. / 暂无发票。" /> : null}{activeTab === 'payments' ? <div className="grid gap-5"><GenericTable title="My Payments / 我的付款" subtitle="Real payments linked to customers." rows={payments} empty="No payments. / 暂无付款。" /><GenericTable title="My Receipts / 我的收据" subtitle="Real receipts records." rows={receipts} empty="No receipts. / 暂无收据。" /></div> : null}{activeTab === 'warranties' ? <GenericTable title="My Warranties / 我的保修" subtitle="Real warranties linked to customers." rows={warranties} empty="No warranties. / 暂无保修。" /> : null}{activeTab === 'submit' ? <RequestCreator customerId={customerId} onSaved={loadAll} /> : null}{activeTab === 'versions' ? <GenericTable title="Customer Portal Versions / 客户门户版本" subtitle="Customer portal version snapshots." rows={versions} empty="No versions. / 暂无版本。" /> : null}</section><section className="rounded-3xl bg-white p-5 shadow-soft ring-1 ring-slate-200"><h3 className="text-lg font-black text-slate-950">Customers / 客户列表</h3><p className="mt-2 text-sm text-slate-600">Click a customer to fill Customer ID filter. / 点击客户填入客户ID筛选。</p><div className="mt-4 grid max-h-[560px] gap-2 overflow-y-auto">{customers.map((customer) => <button key={String(customer.customer_id)} type="button" onClick={() => setCustomerId(String(customer.customer_id || ''))} className="rounded-2xl border border-slate-200 bg-white p-3 text-left text-sm hover:border-activeBlue hover:bg-blue-50"><span className="block font-black text-slate-900">{formatValue(customer.name)}</span><span className="block text-xs font-semibold text-slate-500">{formatValue(customer.phone || customer.whatsapp || customer.email)}</span><span className="mt-1 block font-mono text-[11px] text-slate-400">{formatValue(customer.customer_id)}</span></button>)}{!customers.length ? <div className="rounded-2xl bg-slate-50 p-4 text-sm font-bold text-slate-500">No customers. / 暂无客户。</div> : null}</div></section></div></div>;
}
