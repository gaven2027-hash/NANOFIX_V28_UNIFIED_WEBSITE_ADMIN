'use client';

import Link from 'next/link';
import { Suspense, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { createBrowserClient } from '@/lib/supabase/browser';

type RegisterContext = 'admin' | 'customer';

type RoleGroup = 'customer' | 'total_management' | 'management' | 'inspection_repair' | 'operations' | 'finance';

const internalGroups: Array<{ value: RoleGroup; label: string; note: string }> = [
  { value: 'total_management', label: 'Total Management / 总管理', note: 'Company owner / final approval access.' },
  { value: 'management', label: 'Management / 管理', note: 'General management and admin work.' },
  { value: 'inspection_repair', label: 'Inspection & Repair / 检修', note: 'Former engineer access, inspection and repair operations.' },
  { value: 'operations', label: 'Operations / 运营', note: 'Daily job coordination and operations.' },
  { value: 'finance', label: 'Finance / 财务', note: 'Quotation, invoice, payment and finance records.' }
];

const copyByContext = {
  admin: {
    eyebrow: 'Internal Staff Access Application',
    eyebrowZh: '公司内部账号申请',
    title: 'Request Internal Management Access',
    zh: '申请公司内部管理系统权限',
    welcome: 'Welcome to the NANOFIX internal access application page.',
    welcomeZh: '欢迎进入 NANOFIX 公司内部账号申请页面。',
    note: 'Select the closest role group first. Super Admin can correct the role group during review before access is enabled.',
    noteZh: '请先选择接近的角色分组。总管理员审核时可核对并修改到正确分组后再启用账号。',
    bullets: [
      ['One internal registration link for all staff', '所有公司内部人员统一使用管理员注册链接'],
      ['Inspection & repair replaces separate engineer registration', '检修分组替代独立工程师注册'],
      ['Super Admin can correct the group before approval', '总管理员审核时可修改分组后批准']
    ],
    roleLabel: 'Internal staff applicant / 公司内部申请人'
  },
  customer: {
    eyebrow: 'Premium Member Registration',
    eyebrowZh: '高级会员注册',
    title: 'Create Premium Member Account',
    zh: '注册高级会员账号',
    welcome: 'Welcome to the NANOFIX premium member registration page.',
    welcomeZh: '欢迎进入 NANOFIX 高级会员注册页面。',
    note: 'Create your member account to submit repair requests, track progress and keep your quotations, invoices, payments and warranty records organised.',
    noteZh: '注册会员账号后，可提交报修、追踪维修进度，并集中保存报价、发票、付款和保修记录。',
    bullets: [
      ['Submit repair requests online', '在线提交报修申请'],
      ['Track repair progress anytime', '随时追踪维修进度'],
      ['Keep all service records in one place', '集中保存所有服务资料']
    ],
    roleLabel: 'Premium member / 高级会员'
  }
} as const;

function getRegisterContext(explicitRole: string | null, forcedContext?: RegisterContext): RegisterContext {
  if (forcedContext) return forcedContext;
  const role = String(explicitRole || '').toLowerCase();
  if (role.includes('admin') || role.includes('staff') || role.includes('internal')) return 'admin';
  return 'customer';
}

function RegisterFormInner({ forcedContext }: { forcedContext?: RegisterContext }) {
  const searchParams = useSearchParams();
  const context = getRegisterContext(searchParams.get('role'), forcedContext);
  const copy = copyByContext[context];
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [roleGroup, setRoleGroup] = useState<RoleGroup>(context === 'admin' ? 'inspection_repair' : 'customer');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const loginHref = useMemo(() => `/login?role=${context}`, [context]);

  async function submitRegistrationRequest(authUserId?: string) {
    await fetch('/api/public/registration-requests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        auth_user_id: authUserId || null,
        email,
        full_name: name,
        phone,
        requested_role: context,
        requested_role_group: context === 'customer' ? 'customer' : roleGroup,
        source: 'portal_register',
        registration_source: 'nanofix_portal_register'
      })
    });
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage('');
    if (password.length < 8) { setLoading(false); setMessage('Password must be at least 8 characters. / 密码至少需要 8 位。'); return; }
    try {
      const supabase = createBrowserClient();
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: name, name, phone, mobile_phone: phone, whatsapp_phone: phone, requested_role: context, requested_role_group: context === 'customer' ? 'customer' : roleGroup, registration_source: 'nanofix_portal_register', review_status: 'pending_review' } }
      });
      if (error) { setMessage(`${error.message} / 注册失败，请检查资料后重试。`); return; }
      await submitRegistrationRequest(data.user?.id);
      setMessage(context === 'customer' ? 'Registration submitted. Please verify your email if required, then sign in to continue. / 注册已提交。如系统要求，请先验证邮箱，然后登录继续使用。' : 'Application submitted. Super Admin will verify and assign the final role group before access is enabled. / 申请已提交。总管理员会核对并分配最终角色分组后启用权限。');
    } catch { setMessage('Registration service is not configured. / 注册服务暂未配置。'); }
    finally { setLoading(false); }
  }

  return <><div className="mt-5 text-center"><div className="mx-auto inline-flex rounded-full bg-blue-50 px-4 py-2 text-[11px] font-black uppercase tracking-[0.16em] text-activeBlue ring-1 ring-blue-100">{copy.eyebrow} / {copy.eyebrowZh}</div><h1 className="mt-4 text-2xl font-black tracking-tight text-slate-950">{copy.title}</h1><p className="mt-1 text-base font-black text-activeBlue">{copy.zh}</p><p className="mt-4 text-sm font-bold leading-6 text-slate-700">{copy.welcome}<br />{copy.welcomeZh}</p><p className="mt-3 text-xs font-semibold leading-5 text-slate-500">{copy.note}<br />{copy.noteZh}</p><div className="mt-4 grid gap-2 text-left">{copy.bullets.map(([en, zh]) => <div key={en} className="rounded-2xl bg-slate-50 px-4 py-3 text-xs font-bold leading-5 text-slate-700 ring-1 ring-slate-100"><span className="text-activeBlue">✓</span> {en}<br /><span className="pl-4 text-slate-500">{zh}</span></div>)}</div></div><form className="mt-6 space-y-4" onSubmit={onSubmit}><div className="rounded-2xl bg-blue-50 px-4 py-3 text-xs font-bold leading-5 text-blue-800 ring-1 ring-blue-100">Default role / 默认角色：{copy.roleLabel}</div>{context === 'admin' ? <label className="block"><span className="mb-1 block text-xs font-black uppercase tracking-[0.12em] text-slate-500">Role Group / 角色分组</span><select className="w-full rounded-2xl border border-slate-200 bg-adminBg px-4 py-3 text-sm outline-none focus:border-activeBlue" value={roleGroup} onChange={(event) => setRoleGroup(event.target.value as RoleGroup)}>{internalGroups.map((group) => <option key={group.value} value={group.value}>{group.label} — {group.note}</option>)}</select><span className="mt-1 block text-[11px] font-semibold text-slate-500">Super Admin may correct this during review. / 总管理员审核时可以修改此分组。</span></label> : null}<input className="w-full rounded-2xl border border-slate-200 bg-adminBg px-4 py-3 text-sm outline-none focus:border-activeBlue" placeholder="Full Name / 姓名" value={name} onChange={(event) => setName(event.target.value)} autoComplete="name" required /><input className="w-full rounded-2xl border border-slate-200 bg-adminBg px-4 py-3 text-sm outline-none focus:border-activeBlue" placeholder="Phone / WhatsApp / 手机或 WhatsApp" value={phone} onChange={(event) => setPhone(event.target.value)} autoComplete="tel" required /><input className="w-full rounded-2xl border border-slate-200 bg-adminBg px-4 py-3 text-sm outline-none focus:border-activeBlue" placeholder="Email / 邮箱" type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" required /><input className="w-full rounded-2xl border border-slate-200 bg-adminBg px-4 py-3 text-sm outline-none focus:border-activeBlue" placeholder="Password / 密码" type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="new-password" required />{message ? <div className="rounded-2xl bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-900 ring-1 ring-amber-100">{message}</div> : null}<button className="w-full rounded-2xl bg-activeBlue px-4 py-3 font-bold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60" type="submit" disabled={loading}>{loading ? 'Submitting... / 提交中...' : 'Create Account / 创建账号'}</button><p className="text-center text-[11px] font-bold leading-5 text-slate-500">Already have an account? / 已有账号？ <Link href={loginHref} className="text-activeBlue hover:underline">Sign in here / 点击登录</Link></p></form></>;
}

export function RegisterForm({ forcedContext }: { forcedContext?: RegisterContext }) {
  return <Suspense fallback={<div className="mt-6 rounded-2xl bg-adminBg px-4 py-3 text-sm font-semibold text-slate-600">Loading register form...</div>}><RegisterFormInner forcedContext={forcedContext} /></Suspense>;
}
