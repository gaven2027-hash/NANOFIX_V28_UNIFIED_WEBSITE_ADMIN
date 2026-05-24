'use client';

import { useEffect, useState } from 'react';
import { Badge } from './Badge';
import { SectionCard } from './SectionCard';

type Row = Record<string, unknown>;

const inputClass = 'w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 outline-none transition focus:border-activeBlue focus:ring-2 focus:ring-blue-100';
const labelClass = 'mb-1 block text-xs font-black uppercase tracking-[0.12em] text-slate-500';

function formatValue(value: unknown) {
  if (value === null || value === undefined || value === '') return '—';
  if (Array.isArray(value)) return value.length ? value.join(', ') : '—';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

function statusTone(status: unknown): 'blue' | 'green' | 'amber' | 'red' | 'gray' | 'cyan' {
  const s = String(status || '').toLowerCase();
  if (/(active|completed|verified|sent|success)/i.test(s)) return 'green';
  if (/(pending|verification|open|draft)/i.test(s)) return 'amber';
  if (/(failed|disabled|frozen|blacklisted|cancelled|suspended)/i.test(s)) return 'red';
  return 'blue';
}

export function AuthManagementPanel() {
  const [customers, setCustomers] = useState<Row[]>([]);
  const [actions, setActions] = useState<Row[]>([]);
  const [search, setSearch] = useState('');
  const [message, setMessage] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Row | null>(null);
  const [form, setForm] = useState<Row>({
    username: '',
    name: '',
    email: '',
    phone: '',
    whatsapp: '',
    preferred_login_method: 'email',
    email_verified: false,
    phone_verified: false,
    whatsapp_verified: false
  });
  const [actionForm, setActionForm] = useState<Row>({
    action_type: 'email_recovery_link',
    delivery_channel: 'email',
    metadata: { note: 'Created by Auth Management Center' }
  });

  async function load() {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    const response = await fetch(`/api/admin/auth-management?${params.toString()}`, { cache: 'no-store' });
    const json = await response.json().catch(() => ({}));
    if (!response.ok || !json.ok) {
      setMessage(json.error || 'Load failed. / 加载失败。');
      return;
    }
    setCustomers(json.customers || []);
    setActions(json.actions || []);
  }

  useEffect(() => { void load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  function selectCustomer(row: Row) {
    setSelectedCustomer(row);
    setActionForm((current) => ({
      ...current,
      customer_id: row.customer_id,
      auth_user_id: row.auth_user_id,
      username: row.username,
      email: row.email,
      phone: row.phone,
      whatsapp: row.whatsapp || row.phone
    }));
  }

  async function registerCustomer() {
    setMessage('');
    const response = await fetch('/api/admin/auth-management', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, action: 'register_customer' })
    });
    const json = await response.json().catch(() => ({}));
    if (!response.ok || !json.ok) {
      setMessage(json.error || 'Register failed. / 注册失败。');
      return;
    }
    setMessage('Customer registration profile created. Verification/recovery action has been logged. / 客户注册资料已创建，并记录验证/恢复动作。');
    await load();
  }

  async function createAction() {
    setMessage('');
    const response = await fetch('/api/admin/auth-management', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...actionForm, action: 'create_auth_action' })
    });
    const json = await response.json().catch(() => ({}));
    if (!response.ok || !json.ok) {
      setMessage(json.error || 'Action failed. / 操作失败。');
      return;
    }
    setMessage('Auth action created and audit logged. / 认证操作已创建并写入审计。');
    await load();
  }

  return (
    <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1fr)_440px]">
      <div className="grid gap-5">
        <SectionCard title="Customer Registration Methods / 客户注册方式" subtitle="Supports username, email, phone and WhatsApp registration metadata. Real OTP sending can be connected to SMTP / SMS / WhatsApp provider. / 支持用户名、邮箱、手机号、WhatsApp 注册资料；真实 OTP 可后续对接 SMTP/SMS/WhatsApp。">
          {message ? <div className="mb-4 rounded-2xl bg-blue-50 px-4 py-3 text-sm font-bold text-blue-800 ring-1 ring-blue-100">{message}</div> : null}
          <div className="grid gap-4 md:grid-cols-2">
            <label><span className={labelClass}>Username / 用户名</span><input className={inputClass} value={String(form.username || '')} onChange={(e) => setForm((c) => ({ ...c, username: e.target.value }))} /></label>
            <label><span className={labelClass}>Display Name / 显示名</span><input className={inputClass} value={String(form.name || '')} onChange={(e) => setForm((c) => ({ ...c, name: e.target.value }))} /></label>
            <label><span className={labelClass}>Email / 邮箱</span><input className={inputClass} value={String(form.email || '')} onChange={(e) => setForm((c) => ({ ...c, email: e.target.value }))} /></label>
            <label><span className={labelClass}>Phone / 手机号</span><input className={inputClass} value={String(form.phone || '')} onChange={(e) => setForm((c) => ({ ...c, phone: e.target.value }))} /></label>
            <label><span className={labelClass}>WhatsApp / WhatsApp 验证号码</span><input className={inputClass} value={String(form.whatsapp || '')} onChange={(e) => setForm((c) => ({ ...c, whatsapp: e.target.value }))} /></label>
            <label><span className={labelClass}>Preferred Login / 优先登录方式</span><select className={inputClass} value={String(form.preferred_login_method || 'email')} onChange={(e) => setForm((c) => ({ ...c, preferred_login_method: e.target.value }))}><option value="email">Email / 邮箱</option><option value="username">Username / 用户名</option><option value="phone">Phone / 手机</option><option value="whatsapp">WhatsApp</option></select></label>
            <label className="flex items-center gap-3 rounded-2xl border border-slate-200 p-3"><input type="checkbox" checked={Boolean(form.email_verified)} onChange={(e) => setForm((c) => ({ ...c, email_verified: e.target.checked }))} /><span className="text-sm font-black text-slate-700">Email verified / 邮箱已验证</span></label>
            <label className="flex items-center gap-3 rounded-2xl border border-slate-200 p-3"><input type="checkbox" checked={Boolean(form.whatsapp_verified)} onChange={(e) => setForm((c) => ({ ...c, whatsapp_verified: e.target.checked }))} /><span className="text-sm font-black text-slate-700">WhatsApp verified / WhatsApp 已验证</span></label>
          </div>
          <button type="button" onClick={registerCustomer} className="mt-4 rounded-2xl bg-activeBlue px-5 py-3 text-sm font-black text-white hover:bg-blue-700">Create Registration / 创建注册资料</button>
        </SectionCard>

        <SectionCard title="Customers / 客户认证资料" subtitle="Search and select a customer before creating recovery / verification actions. / 搜索并选择客户后创建恢复/验证动作。">
          <div className="mb-3 grid gap-3 md:grid-cols-[minmax(0,1fr)_auto]"><input className={inputClass} placeholder="Search username, email, phone, WhatsApp... / 搜索" value={search} onChange={(e) => setSearch(e.target.value)} /><button type="button" onClick={load} className="rounded-2xl bg-slate-900 px-5 py-2 text-sm font-black text-white hover:bg-slate-700">Search / 搜索</button></div>
          <div className="overflow-x-auto rounded-2xl border border-slate-200"><table className="min-w-[980px] w-full text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="p-3">Status</th><th className="p-3">Username</th><th className="p-3">Name</th><th className="p-3">Email</th><th className="p-3">Phone / WhatsApp</th><th className="p-3">Preferred</th><th className="p-3">Action</th></tr></thead><tbody className="divide-y divide-slate-100">{customers.map((customer) => <tr key={String(customer.customer_id)} className="hover:bg-blue-50/50"><td className="p-3"><Badge tone={statusTone(customer.account_status)}>{formatValue(customer.account_status)}</Badge></td><td className="p-3 font-bold text-slate-800">{formatValue(customer.username)}</td><td className="p-3 text-slate-700">{formatValue(customer.name)}</td><td className="p-3 text-slate-600">{formatValue(customer.email)}</td><td className="p-3 text-slate-600">{formatValue(customer.phone || customer.whatsapp)}</td><td className="p-3"><Badge tone="blue">{formatValue(customer.preferred_login_method)}</Badge></td><td className="p-3"><button type="button" onClick={() => selectCustomer(customer)} className="rounded-xl bg-white px-3 py-2 text-xs font-black text-activeBlue ring-1 ring-blue-100 hover:bg-blue-50">Select / 选择</button></td></tr>)}{!customers.length ? <tr><td colSpan={7} className="p-6 text-center text-sm font-bold text-slate-500">No customers. / 暂无客户。</td></tr> : null}</tbody></table></div>
        </SectionCard>
      </div>

      <div className="grid gap-5 content-start">
        <SectionCard title="Recovery / Verification Actions / 恢复与验证动作" subtitle="Create admin direct credential action, email recovery link request, WhatsApp recovery link request, or verification request. / 创建后台直接凭证动作、邮件链接、WhatsApp 链接或验证请求。">
          <div className="mb-3 rounded-2xl bg-slate-50 p-3 text-xs font-bold text-slate-600">Selected / 已选择：{selectedCustomer ? `${formatValue(selectedCustomer.username || selectedCustomer.email || selectedCustomer.phone)}` : 'None / 未选择'}</div>
          <div className="grid gap-3">
            <label><span className={labelClass}>Action Type / 操作类型</span><select className={inputClass} value={String(actionForm.action_type || 'email_recovery_link')} onChange={(e) => setActionForm((c) => ({ ...c, action_type: e.target.value }))}><option value="direct_credential_update">Direct Credential Update / 后台直接更新凭证</option><option value="email_recovery_link">Email Recovery Link / 邮件恢复链接</option><option value="whatsapp_recovery_link">WhatsApp Recovery Link / WhatsApp 恢复链接</option><option value="email_verification">Email Verification / 邮箱验证</option><option value="phone_verification">Phone Verification / 手机验证</option><option value="whatsapp_verification">WhatsApp Verification / WhatsApp 验证</option></select></label>
            <label><span className={labelClass}>Delivery Channel / 发送渠道</span><select className={inputClass} value={String(actionForm.delivery_channel || 'email')} onChange={(e) => setActionForm((c) => ({ ...c, delivery_channel: e.target.value }))}><option value="admin">Admin Only / 仅后台记录</option><option value="email">Email / 邮件</option><option value="phone">Phone / 手机</option><option value="whatsapp">WhatsApp</option></select></label>
            <label><span className={labelClass}>Username / 用户名</span><input className={inputClass} value={String(actionForm.username || '')} onChange={(e) => setActionForm((c) => ({ ...c, username: e.target.value }))} /></label>
            <label><span className={labelClass}>Email / 邮箱</span><input className={inputClass} value={String(actionForm.email || '')} onChange={(e) => setActionForm((c) => ({ ...c, email: e.target.value }))} /></label>
            <label><span className={labelClass}>WhatsApp / WhatsApp</span><input className={inputClass} value={String(actionForm.whatsapp || '')} onChange={(e) => setActionForm((c) => ({ ...c, whatsapp: e.target.value }))} /></label>
          </div>
          <button type="button" onClick={createAction} className="mt-4 rounded-2xl bg-activeBlue px-5 py-3 text-sm font-black text-white hover:bg-blue-700">Create Action / 创建动作</button>
        </SectionCard>

        <SectionCard title="Recent Auth Actions / 最近认证动作" subtitle="Audit-friendly list. No plain credentials are displayed or stored. / 审计友好列表，不显示或保存明文凭证。">
          <div className="grid max-h-[520px] gap-2 overflow-y-auto">{actions.map((action) => <div key={String(action.action_id)} className="rounded-2xl border border-slate-200 bg-white p-3 text-sm"><div className="flex items-center justify-between gap-2"><span className="font-black text-slate-900">{formatValue(action.action_type)}</span><Badge tone={statusTone(action.status)}>{formatValue(action.status)}</Badge></div><div className="mt-1 text-xs font-semibold text-slate-500">{formatValue(action.delivery_channel)} · {formatValue(action.username || action.email || action.whatsapp || action.phone)}</div><div className="mt-1 text-[11px] text-slate-400">{formatValue(action.created_at)}</div></div>)}{!actions.length ? <div className="rounded-2xl bg-slate-50 p-4 text-sm font-bold text-slate-500">No auth actions. / 暂无认证动作。</div> : null}</div>
        </SectionCard>
      </div>
    </div>
  );
}
