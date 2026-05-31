'use client';

import Link from 'next/link';
import { Suspense, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { createBrowserClient } from '@/lib/supabase/browser';

type RegisterContext = 'admin' | 'customer';
type RoleGroup = 'customer' | 'super_admin' | 'admin' | 'inspection_repair' | 'operations' | 'finance';

const internalGroups: Array<{ value: RoleGroup; label: string; note: string }> = [
  { value: 'super_admin', label: 'Super Admin / 总管理员', note: 'Full-system takeover authority. Every takeover/action must be written to Audit Logs.' },
  { value: 'admin', label: 'Admin / 管理员', note: 'General internal management and daily admin work.' },
  { value: 'inspection_repair', label: 'Engineer / Inspection / 工程师/检修', note: 'Inspection and repair users share the Internal Admin App entry.' },
  { value: 'operations', label: 'Operations / 运营', note: 'Daily job coordination and service operations.' },
  { value: 'finance', label: 'Finance / 财务', note: 'Quotation, invoice, payment and finance records.' }
];

function getRegisterContext(explicitRole: string | null, forcedContext?: RegisterContext): RegisterContext {
  if (forcedContext) return forcedContext;
  const role = String(explicitRole || '').toLowerCase();
  const internalKeywords = ['admin', 'staff', 'internal', 'super_admin', 'management', 'engineer', 'inspection', 'repair', 'operations', 'finance'];
  return internalKeywords.some((keyword) => role.includes(keyword)) ? 'admin' : 'customer';
}

function slugIdentifier(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '.').replace(/^\.+|\.+$/g, '').slice(0, 80) || 'internal.user';
}

function syntheticInternalEmail(username: string, phone: string) {
  const raw = username || phone;
  return `internal.${slugIdentifier(raw)}@nanofix.local`;
}

function RegisterFormInner({ forcedContext }: { forcedContext?: RegisterContext }) {
  const searchParams = useSearchParams();
  const context = getRegisterContext(searchParams.get('role'), forcedContext);
  const isAdmin = context === 'admin';
  const [username, setUsername] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [roleGroup, setRoleGroup] = useState<RoleGroup>(isAdmin ? 'inspection_repair' : 'customer');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const loginHref = useMemo(() => `/login?role=${context}`, [context]);

  const cleanUsername = username.trim();
  const cleanName = name.trim();
  const cleanPhone = phone.trim();
  const cleanEmail = email.trim().toLowerCase();
  const internalIdentifier = cleanEmail || cleanPhone || cleanUsername;
  const signupEmail = isAdmin ? (cleanEmail || syntheticInternalEmail(cleanUsername, cleanPhone)) : cleanEmail;

  async function submitRegistrationRequest(authUserId?: string) {
    await fetch('/api/public/registration-requests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        auth_user_id: authUserId || null,
        email: signupEmail,
        contact_email: cleanEmail || null,
        username: cleanUsername || null,
        full_name: cleanName || cleanUsername || cleanPhone || cleanEmail,
        phone: cleanPhone,
        requested_role: isAdmin ? 'internal_admin_app' : 'customer_portal',
        requested_role_group: isAdmin ? roleGroup : 'customer',
        source: 'portal_register',
        registration_source: isAdmin ? 'internal_admin_app_register' : 'customer_portal_register',
        identifier_type: cleanEmail ? 'email' : cleanPhone ? 'phone' : cleanUsername ? 'username' : null,
        identifier_value: isAdmin ? internalIdentifier : cleanPhone
      })
    });
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage('');

    if (password.length < 8) {
      setLoading(false);
      setMessage('Password must be at least 8 characters. / 密码至少需要 8 位。');
      return;
    }

    if (isAdmin && !internalIdentifier) {
      setLoading(false);
      setMessage('Internal registration requires at least one identifier: username, phone or email. / 内部管理注册至少填写用户名、电话或邮箱其中一项。');
      return;
    }

    if (!isAdmin && !cleanPhone) {
      setLoading(false);
      setMessage('Customer registration requires a phone / WhatsApp number. / 客户会员注册必须填写电话号码或 WhatsApp。');
      return;
    }

    if (!isAdmin && !cleanEmail) {
      setLoading(false);
      setMessage('Customer registration also requires an email for secure portal sign-in. / 客户门户登录仍需要邮箱用于安全登录。');
      return;
    }

    try {
      const supabase = createBrowserClient();
      const { data, error } = await supabase.auth.signUp({
        email: signupEmail,
        password,
        options: {
          data: {
            username: cleanUsername || null,
            full_name: cleanName || cleanUsername || cleanPhone || cleanEmail,
            name: cleanName || cleanUsername || cleanPhone || cleanEmail,
            phone: cleanPhone,
            mobile_phone: cleanPhone,
            whatsapp_phone: cleanPhone,
            contact_email: cleanEmail || null,
            login_identifier: isAdmin ? internalIdentifier : cleanEmail,
            identifier_type: cleanEmail ? 'email' : cleanPhone ? 'phone' : cleanUsername ? 'username' : null,
            requested_role: isAdmin ? 'internal_admin_app' : 'customer_portal',
            requested_role_group: isAdmin ? roleGroup : 'customer',
            registration_source: isAdmin ? 'internal_admin_app_register' : 'customer_portal_register',
            review_status: isAdmin ? 'pending_super_admin_review' : 'pending_email_or_otp_verification'
          }
        }
      });

      if (error) {
        setMessage(`${error.message} / 注册失败，请检查资料后重试。`);
        return;
      }

      await submitRegistrationRequest(data.user?.id);
      setMessage(
        isAdmin
          ? 'Application submitted. Username / phone / email identifier is accepted for review. Super Admin will verify and assign the final role group. / 申请已提交。用户名、电话或邮箱任一识别资料均可进入审核，总管理员会核对并分配最终角色。'
          : 'Registration submitted. Phone is recorded as the required customer contact. Please verify your email or OTP if required, then sign in to Customer Portal. / 注册已提交，电话已作为客户必填联系方式记录。如系统要求，请先验证邮箱或 OTP，然后登录客户门户。'
      );
    } catch {
      setMessage('Registration service is not configured. / 注册服务暂未配置。');
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <div className="mt-5 text-center">
        <div className="mx-auto inline-flex rounded-full bg-blue-50 px-4 py-2 text-[11px] font-black uppercase tracking-[0.16em] text-activeBlue ring-1 ring-blue-100">
          {isAdmin ? 'Internal Admin App Registration / 内部管理系统注册' : 'Customer Portal Registration / 客户门户注册'}
        </div>
        <h1 className="mt-4 text-2xl font-black tracking-tight text-slate-950">
          {isAdmin ? 'Request Internal Management Access' : 'Create Customer Account'}
        </h1>
        <p className="mt-1 text-base font-black text-activeBlue">
          {isAdmin ? '申请内部管理系统权限' : '注册客户门户账号'}
        </p>
        <p className="mt-4 text-sm font-bold leading-6 text-slate-700">
          {isAdmin
            ? 'Internal staff may register with any one of username, phone or email. No separate Engineer Portal/Register/Login.'
            : 'Customer registration requires phone / WhatsApp, then customers use the independent portal only.'}
          <br />
          {isAdmin
            ? '内部人员注册：用户名、电话、邮箱三项中任意填写一项即可提交；不再有独立工程师注册或登录。'
            : '客户会员注册电话号码为必填项，客户只进入独立客户门户。'}
        </p>
      </div>
      <form className="mt-6 space-y-4" onSubmit={onSubmit}>
        {isAdmin ? (
          <label className="block">
            <span className="mb-1 block text-xs font-black uppercase tracking-[0.12em] text-slate-500">Role Group / 角色分组</span>
            <select
              className="w-full rounded-2xl border border-slate-200 bg-adminBg px-4 py-3 text-sm outline-none focus:border-activeBlue"
              value={roleGroup}
              onChange={(event) => setRoleGroup(event.target.value as RoleGroup)}
            >
              {internalGroups.map((group) => (
                <option key={group.value} value={group.value}>{group.label} — {group.note}</option>
              ))}
            </select>
            <span className="mt-1 block text-[11px] font-semibold text-slate-500">Super Admin may correct this during review. / 总管理员审核时可以修改此分组。</span>
          </label>
        ) : null}
        {isAdmin ? <input className="w-full rounded-2xl border border-slate-200 bg-adminBg px-4 py-3 text-sm outline-none focus:border-activeBlue" placeholder="Username / 用户名（内部注册可选）" value={username} onChange={(event) => setUsername(event.target.value)} autoComplete="username" /> : null}
        <input className="w-full rounded-2xl border border-slate-200 bg-adminBg px-4 py-3 text-sm outline-none focus:border-activeBlue" placeholder={isAdmin ? 'Full Name / 姓名（内部注册可选）' : 'Full Name / 姓名'} value={name} onChange={(event) => setName(event.target.value)} autoComplete="name" required={!isAdmin} />
        <input className="w-full rounded-2xl border border-slate-200 bg-adminBg px-4 py-3 text-sm outline-none focus:border-activeBlue" placeholder={isAdmin ? 'Phone / WhatsApp / 手机或 WhatsApp（内部注册可选）' : 'Phone / WhatsApp / 手机或 WhatsApp（客户必填）'} value={phone} onChange={(event) => setPhone(event.target.value)} autoComplete="tel" required={!isAdmin} />
        <input className="w-full rounded-2xl border border-slate-200 bg-adminBg px-4 py-3 text-sm outline-none focus:border-activeBlue" placeholder={isAdmin ? 'Email / 邮箱（内部注册可选）' : 'Email / 邮箱'} type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" required={!isAdmin} />
        <input className="w-full rounded-2xl border border-slate-200 bg-adminBg px-4 py-3 text-sm outline-none focus:border-activeBlue" placeholder="Password / 密码" type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="new-password" required />
        {message ? <div className="rounded-2xl bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-900 ring-1 ring-amber-100">{message}</div> : null}
        <button className="w-full rounded-2xl bg-activeBlue px-4 py-3 font-bold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60" type="submit" disabled={loading}>
          {loading ? 'Submitting... / 提交中...' : 'Create Account / 创建账号'}
        </button>
        <p className="text-center text-[11px] font-bold leading-5 text-slate-500">
          Already have an account? / 已有账号？ <Link href={loginHref} className="text-activeBlue hover:underline">Sign in here / 点击登录</Link>
        </p>
      </form>
    </>
  );
}

export function RegisterForm({ forcedContext }: { forcedContext?: RegisterContext }) {
  return (
    <Suspense fallback={<div className="mt-6 rounded-2xl bg-adminBg px-4 py-3 text-sm font-semibold text-slate-600">Loading register form...</div>}>
      <RegisterFormInner forcedContext={forcedContext} />
    </Suspense>
  );
}
