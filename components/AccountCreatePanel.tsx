'use client';

import { useState } from 'react';
import { SectionCard } from './SectionCard';

type Row = Record<string, unknown>;

type CreateRole = 'customer' | 'engineer' | 'admin';

const inputClass = 'w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 outline-none transition focus:border-activeBlue focus:ring-2 focus:ring-blue-100';
const labelClass = 'mb-1 block text-xs font-black uppercase tracking-[0.12em] text-slate-500';

const roleLabels: Record<CreateRole, string> = {
  customer: 'Advanced Member / 高级会员',
  engineer: 'Engineer / 工程师',
  admin: 'Administrator / 管理员'
};

export function AccountCreatePanel({ onCreated }: { onCreated: (profile: Row) => void }) {
  const [form, setForm] = useState({
    email: '',
    full_name: '',
    username: '',
    mobile_phone: '',
    whatsapp_phone: '',
    role: 'customer' as CreateRole,
    review_status: 'approved',
    profile_status: 'active',
    send_invite: true,
    account_admin_note: ''
  });
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);

  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function createProfile() {
    setSaving(true);
    setMessage('');
    const response = await fetch('/api/admin/system-settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'create_profile', ...form })
    });
    const json = await response.json().catch(() => ({}));
    setSaving(false);
    if (!response.ok || !json.ok) {
      setMessage(json.error || 'Create failed. / 新增失败。');
      return;
    }
    setMessage('Account profile created. The user can register with the same email and will be linked to this profile. / 账号档案已创建，用户之后用相同邮箱注册会自动绑定到此档案。');
    onCreated(json.profile);
    setForm((current) => ({ ...current, email: '', full_name: '', username: '', mobile_phone: '', whatsapp_phone: '', account_admin_note: '' }));
  }

  return (
    <SectionCard title="Create Account Profile / 新增账号档案" subtitle="Super Admin can add an Advanced Member, Engineer or Administrator profile. No plain password is stored here. / 总管理员可新增高级会员、工程师或管理员档案；这里不保存明文密码。">
      {message ? <div className="mb-4 rounded-2xl bg-blue-50 px-4 py-3 text-sm font-bold text-blue-800 ring-1 ring-blue-100">{message}</div> : null}
      <div className="grid gap-4 md:grid-cols-3">
        <label>
          <span className={labelClass}>Role / 默认角色</span>
          <select className={inputClass} value={form.role} onChange={(event) => update('role', event.target.value as CreateRole)}>
            {(Object.keys(roleLabels) as CreateRole[]).map((role) => <option key={role} value={role}>{roleLabels[role]}</option>)}
          </select>
        </label>
        <label>
          <span className={labelClass}>Review / 审核状态</span>
          <select className={inputClass} value={form.review_status} onChange={(event) => update('review_status', event.target.value)}>
            <option value="approved">approved / 已通过</option>
            <option value="pending_review">pending_review / 待审核</option>
            <option value="rejected">rejected / 已驳回</option>
          </select>
        </label>
        <label>
          <span className={labelClass}>Account / 账号状态</span>
          <select className={inputClass} value={form.profile_status} onChange={(event) => update('profile_status', event.target.value)}>
            <option value="active">active / 启用</option>
            <option value="disabled">disabled / 停用</option>
            <option value="frozen">frozen / 冻结</option>
          </select>
        </label>
        <label>
          <span className={labelClass}>Email / 邮箱</span>
          <input className={inputClass} type="email" value={form.email} onChange={(event) => update('email', event.target.value)} placeholder="name@example.com" />
        </label>
        <label>
          <span className={labelClass}>Full Name / 姓名</span>
          <input className={inputClass} value={form.full_name} onChange={(event) => update('full_name', event.target.value)} placeholder="Full name / 姓名" />
        </label>
        <label>
          <span className={labelClass}>Username / 用户名</span>
          <input className={inputClass} value={form.username} onChange={(event) => update('username', event.target.value)} placeholder="Optional / 可选" />
        </label>
        <label>
          <span className={labelClass}>Mobile / 手机</span>
          <input className={inputClass} value={form.mobile_phone} onChange={(event) => update('mobile_phone', event.target.value)} placeholder="+65 ..." />
        </label>
        <label>
          <span className={labelClass}>WhatsApp / WhatsApp</span>
          <input className={inputClass} value={form.whatsapp_phone} onChange={(event) => update('whatsapp_phone', event.target.value)} placeholder="+65 ..." />
        </label>
        <label>
          <span className={labelClass}>Invite Record / 邀请记录</span>
          <select className={inputClass} value={String(form.send_invite)} onChange={(event) => update('send_invite', event.target.value === 'true')}>
            <option value="true">admin_invited / 管理员邀请</option>
            <option value="false">admin_created / 管理员创建</option>
          </select>
        </label>
        <label className="md:col-span-3">
          <span className={labelClass}>Admin Note / 管理备注</span>
          <textarea className={`${inputClass} min-h-20`} value={form.account_admin_note} onChange={(event) => update('account_admin_note', event.target.value)} placeholder="Internal note only. / 仅后台内部备注。" />
        </label>
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button type="button" disabled={saving} onClick={createProfile} className="rounded-2xl bg-activeBlue px-5 py-3 text-sm font-black text-white hover:bg-blue-700 disabled:opacity-60">Create Account Profile / 新增账号档案</button>
        <p className="text-xs font-semibold leading-5 text-slate-500">The actual password is created by the user through registration/reset flow. / 实际密码由用户通过注册或重置流程设置。</p>
      </div>
    </SectionCard>
  );
}
