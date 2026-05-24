'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Badge } from './Badge';
import { SectionCard } from './SectionCard';

type Row = Record<string, unknown>;

type AccountFilter = 'all' | 'customer' | 'engineer' | 'admin' | 'super_admin';

const inputClass = 'w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 outline-none transition focus:border-activeBlue focus:ring-2 focus:ring-blue-100';
const labelClass = 'mb-1 block text-xs font-black uppercase tracking-[0.12em] text-slate-500';
const profileStatuses = ['active', 'disabled', 'frozen', 'blacklisted', 'archived'];
const reviewStatuses = ['pending_review', 'approved', 'rejected'];
const roleOptions = ['customer', 'engineer', 'admin', 'super_admin'];

function formatValue(value: unknown) {
  if (value === null || value === undefined || value === '') return '—';
  if (Array.isArray(value)) return value.length ? value.join(', ') : '—';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

function statusTone(status: unknown): 'blue' | 'green' | 'amber' | 'red' | 'gray' | 'cyan' {
  const s = String(status || '');
  if (/(active|approved|set|verified|true)/i.test(s)) return 'green';
  if (/(pending|review|required|draft)/i.test(s)) return 'amber';
  if (/(disabled|frozen|blacklisted|archived|rejected|inactive|false)/i.test(s)) return 'red';
  return 'blue';
}

function todayString(dateValue: unknown) {
  if (!dateValue) return '';
  const d = new Date(String(dateValue));
  if (Number.isNaN(d.getTime())) return '';
  return d.toISOString().slice(0, 10);
}

function AccountSummary({ rows, onFilter }: { rows: Row[]; onFilter: (filter: AccountFilter | 'pending_review' | 'blocked') => void }) {
  const today = new Date().toISOString().slice(0, 10);
  const stats = useMemo(() => {
    const customersToday = rows.filter((r) => r.role === 'customer' && todayString(r.created_at) === today).length;
    const engineersToday = rows.filter((r) => r.role === 'engineer' && todayString(r.created_at) === today).length;
    const pending = rows.filter((r) => r.review_status === 'pending_review').length;
    const blocked = rows.filter((r) => ['disabled', 'frozen', 'blacklisted'].includes(String(r.profile_status))).length;
    return [
      ['New Members Today', '今日新增会员', customersToday, 'customer'],
      ['New Engineers Today', '今日新增工程师', engineersToday, 'engineer'],
      ['Pending Review', '待审核账号', pending, 'pending_review'],
      ['Disabled / Blocked', '停用/冻结/拉黑', blocked, 'blocked']
    ] as const;
  }, [rows, today]);

  return (
    <div className="mb-5 grid gap-4 md:grid-cols-4">
      {stats.map(([title, zh, count, key]) => (
        <button key={key} type="button" onClick={() => onFilter(key as AccountFilter | 'pending_review' | 'blocked')} className="rounded-3xl bg-white p-5 text-left shadow-soft ring-1 ring-slate-200 transition hover:-translate-y-0.5 hover:ring-activeBlue">
          <div className="text-sm font-black text-slate-600">{title}</div>
          <div className="text-xs font-semibold text-slate-500">{zh}</div>
          <div className="mt-4 text-4xl font-black text-slate-950">{count}</div>
          <div className="mt-2 text-xs font-black text-activeBlue">Click to filter / 点击筛选</div>
        </button>
      ))}
    </div>
  );
}

export function AccountManagementWorkspace() {
  const searchParams = useSearchParams();
  const profileIdFromUrl = searchParams.get('profile_id');
  const [rows, setRows] = useState<Row[]>([]);
  const [search, setSearch] = useState('');
  const [role, setRole] = useState<AccountFilter>('all');
  const [quickFilter, setQuickFilter] = useState<'all' | 'pending_review' | 'blocked'>('all');
  const [selected, setSelected] = useState<Row | null>(null);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    setMessage('');
    const params = new URLSearchParams({ mode: 'rbac' });
    if (search) params.set('search', search);
    const response = await fetch(`/api/admin/system-settings?${params.toString()}`, { cache: 'no-store' });
    const json = await response.json().catch(() => ({}));
    setLoading(false);
    if (!response.ok || !json.ok) {
      setMessage(json.error || 'Load failed. / 加载失败。');
      return;
    }
    const nextRows = json.rbac || [];
    setRows(nextRows);
    if (profileIdFromUrl) {
      const match = nextRows.find((row: Row) => String(row.profile_id) === profileIdFromUrl);
      if (match) {
        setSelected(match);
        setRole('all');
        setQuickFilter('all');
        setMessage('Opened account from dashboard detail link. / 已从仪表盘明细链接打开账号。');
      }
    }
  }

  useEffect(() => { void load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [profileIdFromUrl]);

  const filtered = useMemo(() => rows.filter((row) => {
    if (role !== 'all' && row.role !== role) return false;
    if (quickFilter === 'pending_review' && row.review_status !== 'pending_review') return false;
    if (quickFilter === 'blocked' && !['disabled', 'frozen', 'blacklisted', 'archived'].includes(String(row.profile_status))) return false;
    return true;
  }), [rows, role, quickFilter]);

  function applySummaryFilter(filter: AccountFilter | 'pending_review' | 'blocked') {
    if (filter === 'pending_review' || filter === 'blocked') {
      setRole('all');
      setQuickFilter(filter);
      return;
    }
    setRole(filter);
    setQuickFilter('all');
  }

  async function updateAccount(row: Row, patch: Row) {
    setSaving(true);
    setMessage('');
    const response = await fetch('/api/admin/system-settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'update_profile_status', profile_id: row.profile_id, ...patch })
    });
    const json = await response.json().catch(() => ({}));
    setSaving(false);
    if (!response.ok || !json.ok) {
      setMessage(json.error || 'Update failed. / 更新失败。');
      return;
    }
    setMessage('Account updated and audit log recorded. / 账号已更新并写入审计日志。');
    setSelected(json.profile || null);
    await load();
  }

  return (
    <div>
      <AccountSummary rows={rows} onFilter={applySummaryFilter} />
      {message ? <div className="mb-4 rounded-2xl bg-blue-50 px-4 py-3 text-sm font-bold text-blue-800 ring-1 ring-blue-100">{message}</div> : null}
      <SectionCard title="Auth Management / 认证与账号管理" subtitle="Review and manage member, engineer and administrator accounts. Plain passwords are never visible. / 审核和管理会员、工程师与管理员账号，绝不显示明文密码。">
        <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_220px_220px_auto]">
          <input className={inputClass} value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search name, email, username, mobile, WhatsApp... / 搜索账号" />
          <select className={inputClass} value={role} onChange={(event) => setRole(event.target.value as AccountFilter)}>
            <option value="all">All roles / 全部角色</option>
            <option value="customer">Members / 会员</option>
            <option value="engineer">Engineers / 工程师</option>
            <option value="admin">Admins / 管理员</option>
            <option value="super_admin">Super Admin / 总管理员</option>
          </select>
          <select className={inputClass} value={quickFilter} onChange={(event) => setQuickFilter(event.target.value as 'all' | 'pending_review' | 'blocked')}>
            <option value="all">All statuses / 全部状态</option>
            <option value="pending_review">Pending review / 待审核</option>
            <option value="blocked">Disabled/Frozen/Blacklisted / 停用冻结拉黑</option>
          </select>
          <button type="button" onClick={load} className="rounded-2xl bg-slate-900 px-5 py-2 text-sm font-black text-white hover:bg-slate-700">Search / 搜索</button>
        </div>
      </SectionCard>

      <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1fr)_420px]">
        <SectionCard title="Accounts / 账号列表" subtitle="Click a row to view details and operate. / 点击账号查看详情并操作。">
          <div className="overflow-x-auto rounded-2xl border border-slate-200">
            <table className="min-w-[1180px] w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="p-3">Review</th><th className="p-3">Account</th><th className="p-3">Role</th><th className="p-3">Name</th><th className="p-3">Username</th><th className="p-3">Email</th><th className="p-3">Mobile / WhatsApp</th><th className="p-3">Created</th><th className="p-3">Action</th></tr></thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((row) => (
                  <tr key={String(row.profile_id)} className={`${selected?.profile_id === row.profile_id ? 'bg-blue-50' : 'hover:bg-blue-50/50'}`}>
                    <td className="p-3"><Badge tone={statusTone(row.review_status)}>{formatValue(row.review_status)}</Badge></td>
                    <td className="p-3"><Badge tone={statusTone(row.profile_status || (row.is_active ? 'active' : 'disabled'))}>{formatValue(row.profile_status || (row.is_active ? 'active' : 'disabled'))}</Badge></td>
                    <td className="p-3 font-black text-slate-800">{formatValue(row.role)}</td>
                    <td className="p-3 text-slate-700">{formatValue(row.full_name)}</td>
                    <td className="p-3 text-slate-600">{formatValue(row.username)}</td>
                    <td className="p-3 text-slate-600">{formatValue(row.email)}</td>
                    <td className="p-3 text-slate-600">{formatValue(row.mobile_phone)} / {formatValue(row.whatsapp_phone)}</td>
                    <td className="p-3 text-slate-500">{formatValue(row.created_at)}</td>
                    <td className="p-3"><button type="button" onClick={() => setSelected(row)} className="rounded-xl bg-white px-3 py-2 text-xs font-black text-activeBlue ring-1 ring-blue-100 hover:bg-blue-50">Open / 打开</button></td>
                  </tr>
                ))}
                {!filtered.length ? <tr><td colSpan={9} className="p-6 text-center text-sm font-bold text-slate-500">{loading ? 'Loading...' : 'No accounts found. / 暂无账号。'}</td></tr> : null}
              </tbody>
            </table>
          </div>
        </SectionCard>

        <div className="rounded-3xl bg-white p-5 shadow-soft ring-1 ring-slate-200">
          <div className="mb-4 flex items-start justify-between gap-3"><div><div className="text-xs font-black uppercase tracking-[0.16em] text-activeBlue">Account Detail / 账号详情</div><h3 className="mt-1 text-xl font-black text-slate-950">{selected ? formatValue(selected.email || selected.username || selected.full_name) : 'Select an account'}</h3></div></div>
          {selected ? (
            <div className="space-y-4">
              <div className="grid gap-3 text-sm">
                <div><span className={labelClass}>Profile ID</span><div className="break-all rounded-2xl bg-slate-50 p-3 font-mono text-xs text-slate-600">{formatValue(selected.profile_id)}</div></div>
                <div className="grid gap-3 md:grid-cols-2">
                  <div><span className={labelClass}>Role / 角色</span><select className={inputClass} value={String(selected.role || 'customer')} onChange={(event) => setSelected((current) => current ? { ...current, role: event.target.value } : current)}>{roleOptions.map((r) => <option key={r} value={r}>{r}</option>)}</select></div>
                  <div><span className={labelClass}>Review / 审核</span><select className={inputClass} value={String(selected.review_status || 'pending_review')} onChange={(event) => setSelected((current) => current ? { ...current, review_status: event.target.value } : current)}>{reviewStatuses.map((s) => <option key={s} value={s}>{s}</option>)}</select></div>
                  <div><span className={labelClass}>Account / 账号状态</span><select className={inputClass} value={String(selected.profile_status || 'active')} onChange={(event) => setSelected((current) => current ? { ...current, profile_status: event.target.value } : current)}>{profileStatuses.map((s) => <option key={s} value={s}>{s}</option>)}</select></div>
                  <div><span className={labelClass}>Reset Required / 需重设</span><select className={inputClass} value={String(Boolean(selected.password_reset_required))} onChange={(event) => setSelected((current) => current ? { ...current, password_reset_required: event.target.value === 'true' } : current)}><option value="false">false</option><option value="true">true</option></select></div>
                </div>
                <label><span className={labelClass}>Admin Note / 管理备注</span><textarea className={`${inputClass} min-h-24`} value={String(selected.account_admin_note || '')} onChange={(event) => setSelected((current) => current ? { ...current, account_admin_note: event.target.value } : current)} /></label>
              </div>
              <div className="flex flex-wrap gap-2">
                <button disabled={saving} onClick={() => updateAccount(selected, selected)} className="rounded-2xl bg-activeBlue px-4 py-2 text-sm font-black text-white hover:bg-blue-700 disabled:opacity-60">Save / 保存</button>
                <button disabled={saving} onClick={() => updateAccount(selected, { review_status: 'approved', profile_status: 'active' })} className="rounded-2xl bg-green-50 px-4 py-2 text-sm font-black text-green-700 ring-1 ring-green-100">Approve / 通过</button>
                <button disabled={saving} onClick={() => updateAccount(selected, { profile_status: 'disabled' })} className="rounded-2xl bg-amber-50 px-4 py-2 text-sm font-black text-amber-700 ring-1 ring-amber-100">Disable / 停用</button>
                <button disabled={saving} onClick={() => updateAccount(selected, { profile_status: 'frozen' })} className="rounded-2xl bg-amber-50 px-4 py-2 text-sm font-black text-amber-700 ring-1 ring-amber-100">Freeze / 冻结</button>
                <button disabled={saving} onClick={() => updateAccount(selected, { profile_status: 'blacklisted' })} className="rounded-2xl bg-red-50 px-4 py-2 text-sm font-black text-red-700 ring-1 ring-red-100">Blacklist / 拉黑</button>
              </div>
            </div>
          ) : <div className="rounded-2xl bg-slate-50 p-4 text-sm font-bold text-slate-500">Select an account from the table. / 请从列表选择账号。</div>}
        </div>
      </div>
    </div>
  );
}
