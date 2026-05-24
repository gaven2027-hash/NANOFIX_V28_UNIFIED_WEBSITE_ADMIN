'use client';

import { useState } from 'react';
import Link from 'next/link';
import { createBrowserClient } from '@/lib/supabase/browser';

type RegisterRole = 'customer' | 'engineer' | 'admin';

const roleCopy: Record<RegisterRole, { title: string; zh: string; description: string; descriptionZh: string; loginHref: string }> = {
  customer: {
    title: 'Premium Member Registration',
    zh: '高级会员注册',
    description: 'Create a NANOFIX member account to submit repair requests, track progress and review quotations, invoices, payments and warranty records.',
    descriptionZh: '创建 NANOFIX 会员账号，用于提交报修、追踪进度、查看报价、发票、付款和保修记录。',
    loginHref: '/login?role=customer'
  },
  engineer: {
    title: 'Engineer Account Application',
    zh: '工程师账号申请',
    description: 'Apply for a NANOFIX engineer account to access assigned jobs, inspections, photos, job notes and completion records after admin approval.',
    descriptionZh: '申请 NANOFIX 工程师账号，审核通过后可查看已分配工单、查验、照片、工单记录和完工资料。',
    loginHref: '/login?role=engineer'
  },
  admin: {
    title: 'Administrator Account Application',
    zh: '管理员账号申请',
    description: 'Apply for a NANOFIX administrator account. Access is disabled until a Super Admin reviews and assigns the final role.',
    descriptionZh: '申请 NANOFIX 管理员账号。总管理员审核并分配最终角色前，账号不会启用。',
    loginHref: '/login?role=admin'
  }
};

const inputClass = 'w-full rounded-2xl border border-slate-200 bg-adminBg px-4 py-3 text-sm outline-none focus:border-activeBlue';

export function RegisterForm({ defaultRole }: { defaultRole: RegisterRole }) {
  const copy = roleCopy[defaultRole];
  const [form, setForm] = useState({
    email: '',
    password: '',
    full_name: '',
    username: '',
    mobile_phone: '',
    whatsapp_phone: ''
  });
  const [message, setMessage] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  function update<K extends keyof typeof form>(key: K, value: string) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage('');
    setSuccess(false);

    if (form.password.length < 10) {
      setLoading(false);
      setMessage('Password must be at least 10 characters. / 密码至少 10 位。');
      return;
    }

    try {
      const supabase = createBrowserClient();
      const { error } = await supabase.auth.signUp({
        email: form.email,
        password: form.password,
        options: {
          data: {
            requested_role: defaultRole,
            full_name: form.full_name,
            username: form.username,
            mobile_phone: form.mobile_phone,
            whatsapp_phone: form.whatsapp_phone
          },
          emailRedirectTo: typeof window !== 'undefined' ? `${window.location.origin}${copy.loginHref}` : undefined
        }
      });
      if (error) {
        setMessage(error.message || 'Registration failed. / 注册失败。');
        return;
      }
      setSuccess(true);
      setMessage('Registration submitted. Your account is pending Super Admin review before activation. / 注册申请已提交，账号需总管理员审核通过后才会启用。');
      setForm({ email: '', password: '', full_name: '', username: '', mobile_phone: '', whatsapp_phone: '' });
    } catch {
      setMessage('Registration service is not configured. / 注册服务暂未配置。');
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <div className="mt-5 text-center">
        <h1 className="text-2xl font-black tracking-tight text-slate-950">{copy.title}</h1>
        <p className="mt-1 text-base font-black text-activeBlue">{copy.zh}</p>
        <p className="mt-4 text-sm font-bold leading-6 text-slate-700">{copy.description}</p>
        <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">{copy.descriptionZh}</p>
      </div>
      <form className="mt-6 space-y-4" onSubmit={submit}>
        <input className={inputClass} type="email" value={form.email} onChange={(event) => update('email', event.target.value)} placeholder="Email / 邮箱" autoComplete="email" required />
        <input className={inputClass} type="password" value={form.password} onChange={(event) => update('password', event.target.value)} placeholder="Password / 密码（至少 10 位）" autoComplete="new-password" required />
        <input className={inputClass} value={form.full_name} onChange={(event) => update('full_name', event.target.value)} placeholder="Full Name / 姓名" autoComplete="name" required />
        <input className={inputClass} value={form.username} onChange={(event) => update('username', event.target.value)} placeholder="Username / 用户名（可选）" autoComplete="username" />
        <input className={inputClass} value={form.mobile_phone} onChange={(event) => update('mobile_phone', event.target.value)} placeholder="Mobile Phone / 手机号码（可选）" autoComplete="tel" />
        <input className={inputClass} value={form.whatsapp_phone} onChange={(event) => update('whatsapp_phone', event.target.value)} placeholder="WhatsApp Phone / WhatsApp 号码（可选）" autoComplete="tel" />
        {message ? <div className={`rounded-2xl px-4 py-3 text-sm font-semibold ring-1 ${success ? 'bg-green-50 text-green-800 ring-green-100' : 'bg-red-50 text-red-800 ring-red-100'}`}>{message}</div> : null}
        <button className="w-full rounded-2xl bg-activeBlue px-4 py-3 font-bold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60" type="submit" disabled={loading}>
          {loading ? 'Submitting... / 提交中...' : 'Submit Registration / 提交注册申请'}
        </button>
        <p className="text-center text-xs font-semibold leading-5 text-slate-500">
          Already have an account? / 已有账号？ <Link className="font-black text-activeBlue" href={copy.loginHref}>Sign in / 登录</Link>
        </p>
      </form>
    </>
  );
}
