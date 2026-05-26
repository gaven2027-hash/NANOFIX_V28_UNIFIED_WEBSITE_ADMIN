'use client';

import { useEffect, useMemo, useState } from 'react';
import { Badge } from './Badge';
import { SectionCard } from './SectionCard';

type Row = Record<string, unknown>;

const inputClass = 'w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 outline-none transition focus:border-activeBlue focus:ring-2 focus:ring-blue-100';
const labelClass = 'mb-1 block text-xs font-black uppercase tracking-[0.12em] text-slate-500';
const statuses = ['pending_review', 'approved', 'rejected', 'cancelled'];
const roles = ['customer', 'admin'];
const roleGroups = ['customer','total_management','management','inspection_repair','operations','finance'];
const roleGroupLabels: Record<string, string> = {
  customer: 'Customer / 客户',
  total_management: 'Total Management / 总管理',
  management: 'Management / 管理',
  inspection_repair: 'Inspection & Repair / 检修',
  operations: 'Operations / 运营',
  finance: 'Finance / 财务'
};
function formatValue(value: unknown) { if (value === null || value === undefined || value === '') return '—'; if (typeof value === 'object') return JSON.stringify(value); return String(value); }
function statusTone(status: unknown): 'blue' | 'green' | 'amber' | 'red' | 'gray' | 'cyan' { const value = String(status || ''); if (value === 'approved') return 'green'; if (value === 'pending_review') return 'amber'; if (value === 'rejected' || value === 'cancelled') return 'red'; return 'blue'; }
function defaultGroup(row: Row | null) { const requested = String(row?.requested_role || 'customer'); if (requested === 'customer') return 'customer'; return String(row?.approved_role_group || row?.requested_role_group || 'management'); }

function ReviewPanel({ row, onSaved, onClose }: { row: Row | null; onSaved: () => void; onClose: () => void }) {
  const [approvedRoleGroup, setApprovedRoleGroup] = useState('customer');
  const [notes, setNotes] = useState('');
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);
  useEffect(() => { setApprovedRoleGroup(defaultGroup(row)); setNotes(String(row?.reviewer_notes || '')); setMessage(''); }, [row]);
  async function review(action: 'approve' | 'reject') {
    if (!row?.registration_request_id) return;
    setSaving(true); setMessage('');
    const response = await fetch('/api/admin/registration-requests', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ registration_request_id: row.registration_request_id, action, approved_role_group: approvedRoleGroup, reviewer_notes: notes }) });
    const json = await response.json().catch(() => ({}));
    setSaving(false);
    if (!response.ok || !json.ok) return setMessage(json.error || 'Review action failed. / 审核操作失败。');
    setMessage(action === 'approve' ? 'Approved and profile activated. / 已批准并启用档案。' : 'Rejected. / 已驳回。');
    onSaved();
  }
  if (!row) return <div className="rounded-3xl bg-white p-5 shadow-soft ring-1 ring-slate-200"><div className="text-xs font-black uppercase tracking-[0.16em] text-activeBlue">Registration Review / 注册审核</div><h3 className="mt-2 text-xl font-black text-slate-950">Select an application / 选择一条申请</h3><p className="mt-2 text-sm font-semibold leading-6 text-slate-600">Open a registration request to approve, reject or assign the correct role group. / 打开注册申请后，可批准、驳回或分配正确角色分组。</p></div>;
  const isCustomer = String(row.requested_role) === 'customer';
  return <div className="rounded-3xl bg-white p-5 shadow-soft ring-1 ring-slate-200"><div className="mb-4 flex items-start justify-between gap-3"><div><div className="text-xs font-black uppercase tracking-[0.16em] text-activeBlue">Review Application / 审核申请</div><h3 className="mt-1 text-xl font-black text-slate-950">{formatValue(row.full_name || row.email)}</h3><p className="mt-1 break-all text-xs font-semibold text-slate-500">{formatValue(row.registration_request_id)}</p></div><button type="button" onClick={onClose} className="rounded-xl bg-slate-100 px-3 py-2 text-xs font-black text-slate-600 hover:bg-slate-200">Close / 关闭</button></div>{message ? <div className="mb-4 rounded-2xl bg-blue-50 px-4 py-3 text-sm font-bold text-blue-800 ring-1 ring-blue-100">{message}</div> : null}<div className="grid gap-3 text-sm md:grid-cols-2"><div><span className={labelClass}>Status / 状态</span><Badge tone={statusTone(row.status)}>{formatValue(row.status)}</Badge></div><div><span className={labelClass}>Requested Type / 申请类型</span><div className="font-black text-slate-800">{formatValue(row.requested_role)}</div></div><div><span className={labelClass}>Requested Group / 申请分组</span><div className="font-black text-slate-800">{roleGroupLabels[String(row.requested_role_group)] || formatValue(row.requested_role_group)}</div></div><div><span className={labelClass}>Approved Group / 批准分组</span><div className="font-black text-slate-800">{roleGroupLabels[String(row.approved_role_group)] || formatValue(row.approved_role_group)}</div></div><div><span className={labelClass}>Email / 邮箱</span><div className="break-all font-bold text-slate-700">{formatValue(row.email)}</div></div><div><span className={labelClass}>Phone / WhatsApp</span><div className="font-bold text-slate-700">{formatValue(row.phone)}</div></div></div><div className="mt-5 grid gap-4"><label><span className={labelClass}>Final Role Group / 最终角色分组</span><select className={inputClass} value={approvedRoleGroup} disabled={isCustomer} onChange={(event) => setApprovedRoleGroup(event.target.value)}>{roleGroups.filter((group) => isCustomer ? group === 'customer' : group !== 'customer').map((group) => <option key={group} value={group}>{roleGroupLabels[group]}</option>)}</select><span className="mt-1 block text-[11px] font-semibold text-slate-500">Super Admin can correct a wrong selection before approval. / 总管理员可在批准前修正错误分组。</span></label><label><span className={labelClass}>Reviewer Notes / 审核备注</span><textarea className={`${inputClass} min-h-28`} value={notes} onChange={(event) => setNotes(event.target.value)} /></label></div><div className="mt-4 flex flex-wrap gap-3"><button type="button" disabled={saving} onClick={() => review('approve')} className="rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-black text-white shadow-sm hover:bg-emerald-700 disabled:opacity-60">Approve / 批准</button><button type="button" disabled={saving} onClick={() => review('reject')} className="rounded-2xl bg-red-600 px-5 py-3 text-sm font-black text-white shadow-sm hover:bg-red-700 disabled:opacity-60">Reject / 驳回</button></div><div className="mt-5 rounded-2xl bg-adminBg p-4"><div className="mb-2 text-xs font-black uppercase tracking-[0.16em] text-slate-500">Raw Detail / 原始详情</div><pre className="max-h-80 overflow-auto whitespace-pre-wrap break-words text-xs font-semibold leading-5 text-slate-600">{JSON.stringify(row, null, 2)}</pre></div></div>;
}

export function RegistrationReviewWorkspace() {
  const [rows, setRows] = useState<Row[]>([]);
  const [selected, setSelected] = useState<Row | null>(null);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('pending_review');
  const [role, setRole] = useState('');
  const [roleGroup, setRoleGroup] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  async function loadRows() {
    setLoading(true); setMessage('');
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (status) params.set('status', status);
    if (role) params.set('role', role);
    if (roleGroup) params.set('role_group', roleGroup);
    const response = await fetch(`/api/admin/registration-requests?${params.toString()}`, { cache: 'no-store' });
    const json = await response.json().catch(() => ({}));
    setLoading(false);
    if (!response.ok || !json.ok) return setMessage(json.error || 'Load failed. / 加载失败。');
    setRows(json.rows || []);
  }
  useEffect(() => { void loadRows(); }, []);
  const counters = useMemo(() => ({ pending: rows.filter((row) => row.status === 'pending_review').length, approved: rows.filter((row) => row.status === 'approved').length, rejected: rows.filter((row) => row.status === 'rejected').length }), [rows]);
  return <div><SectionCard title="Registration Review / 注册审核" subtitle="Review customer and internal admin applications. Internal staff choose a group first; Super Admin can correct it before approval. / 审核客户和公司内部管理员申请；内部人员先选分组，总管理员可修正后批准。"><div className="grid gap-3 md:grid-cols-3"><div className="rounded-2xl bg-amber-50 p-4 ring-1 ring-amber-100"><div className="text-xs font-black uppercase text-amber-700">Pending / 待审核</div><div className="mt-2 text-2xl font-black text-slate-950">{counters.pending}</div></div><div className="rounded-2xl bg-green-50 p-4 ring-1 ring-green-100"><div className="text-xs font-black uppercase text-green-700">Approved / 已批准</div><div className="mt-2 text-2xl font-black text-slate-950">{counters.approved}</div></div><div className="rounded-2xl bg-red-50 p-4 ring-1 ring-red-100"><div className="text-xs font-black uppercase text-red-700">Rejected / 已驳回</div><div className="mt-2 text-2xl font-black text-slate-950">{counters.rejected}</div></div></div><div className="mt-4 grid gap-3 md:grid-cols-[minmax(0,1fr)_160px_160px_180px_auto]"><input className={inputClass} placeholder="Search name, email, phone... / 搜索姓名、邮箱、电话" value={search} onChange={(event) => setSearch(event.target.value)} /><select className={inputClass} value={status} onChange={(event) => setStatus(event.target.value)}><option value="">All statuses / 全部状态</option>{statuses.map((item) => <option key={item} value={item}>{item}</option>)}</select><select className={inputClass} value={role} onChange={(event) => setRole(event.target.value)}><option value="">All types / 全部类型</option>{roles.map((item) => <option key={item} value={item}>{item}</option>)}</select><select className={inputClass} value={roleGroup} onChange={(event) => setRoleGroup(event.target.value)}><option value="">All groups / 全部分组</option>{roleGroups.map((group) => <option key={group} value={group}>{roleGroupLabels[group]}</option>)}</select><button type="button" onClick={loadRows} className="rounded-2xl bg-slate-900 px-5 py-2 text-sm font-black text-white hover:bg-slate-700">Search / 搜索</button></div></SectionCard>{message ? <div className="mt-4 rounded-2xl bg-blue-50 px-4 py-3 text-sm font-bold text-blue-800 ring-1 ring-blue-100">{message}</div> : null}<div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1fr)_460px]"><SectionCard title="Registration Applications / 注册申请列表" subtitle="Open a request to approve, reject and correct role group. / 打开申请后可批准、驳回和修正角色分组。"><div className="overflow-x-auto rounded-2xl border border-slate-200"><table className="min-w-[980px] w-full text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="p-3">Status</th><th className="p-3">Type</th><th className="p-3">Group</th><th className="p-3">Name</th><th className="p-3">Email</th><th className="p-3">Created</th><th className="p-3">Action</th></tr></thead><tbody className="divide-y divide-slate-100">{rows.map((row) => <tr key={String(row.registration_request_id)} className="hover:bg-blue-50/50"><td className="p-3"><Badge tone={statusTone(row.status)}>{formatValue(row.status)}</Badge></td><td className="p-3 font-black text-slate-800">{formatValue(row.requested_role)}</td><td className="p-3 font-black text-slate-800">{roleGroupLabels[String(row.requested_role_group)] || formatValue(row.requested_role_group)}</td><td className="p-3 font-semibold text-slate-700">{formatValue(row.full_name)}</td><td className="max-w-64 truncate p-3 text-slate-600">{formatValue(row.email)}</td><td className="p-3 text-slate-500">{formatValue(row.created_at)}</td><td className="p-3"><button type="button" onClick={() => setSelected(row)} className="rounded-xl bg-white px-3 py-2 text-xs font-black text-activeBlue ring-1 ring-blue-100 hover:bg-blue-50">Open / 打开</button></td></tr>)}{!rows.length ? <tr><td colSpan={7} className="p-6 text-center text-sm font-bold text-slate-500">{loading ? 'Loading...' : 'No registration requests found. / 暂无注册申请。'}</td></tr> : null}</tbody></table></div></SectionCard><ReviewPanel row={selected} onSaved={loadRows} onClose={() => setSelected(null)} /></div></div>;
}
