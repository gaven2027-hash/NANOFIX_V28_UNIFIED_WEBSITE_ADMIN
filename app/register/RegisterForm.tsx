'use client';

import Link from 'next/link';
import { Suspense, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { createBrowserClient } from '@/lib/supabase/browser';

type RegisterContext = 'admin' | 'customer' | 'engineer';

const copyByContext = {
  admin: {
    eyebrow: 'Admin Access Application',
    eyebrowZh: '管理员权限申请',
    title: 'Request Admin Management Access',
    zh: '申请管理员管理系统权限',
    welcome: 'Welcome to the NANOFIX admin access application page.',
    welcomeZh: '欢迎进入 NANOFIX 管理员权限申请页面。',
    note: 'Submit your details first. Super Admin will review your identity and assign the correct management role before access is enabled.',
    noteZh: '请先提交资料，总管理员审核身份后，才会分配对应管理权限并启用账号。',
    bullets: [
      ['Access requires Super Admin approval', '管理员权限必须由总管理员审核'],
      ['Role will be assigned after review', '审核后才会分配具体角色'],
      ['No automatic admin permission is granted', '不会自动授予管理员权限']
    ],
    roleLabel: 'Admin applicant / 管理员申请人'
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
  },
  engineer: {
    eyebrow: 'Engineer Account Application',
    eyebrowZh: '工程师账号申请',
    title: 'Apply for Engineer Portal Access',
    zh: '申请工程师管理系统账号',
    welcome: 'Welcome to the NANOFIX field engineer account application page.',
    welcomeZh: '欢迎进入 NANOFIX 工程师账号申请页面。',
    note: 'Submit your account request. The operations team will verify and activate your engineer access before field jobs are assigned.',
    noteZh: '请提交账号申请，运营团队审核并启用工程师权限后，才会分配现场工单。',
    bullets: [
      ['Engineer access requires approval', '工程师权限需要审核'],
      ['View assigned jobs after activation', '启用后可查看已分配工单'],
      ['Update site inspection and work status', '更新现场查验与施工状态']
    ],
    roleLabel: 'Engineer applicant / 工程师申请人'
  }
} as const;

function getRegisterContext(explicitRole: string | null, forcedContext?: RegisterContext): RegisterContext {
  if (forcedContext) return forcedContext;
  const role = String(explicitRole || '').toLowerCase();
  if (role.includes('engineer')) return 'engineer';
  if (role.includes('admin')) return 'admin';
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
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const loginHref = useMemo(() => `/login?role=${context}`, [context]);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage('');

    if (password.length < 8) {
      setLoading(false);
      setMessage('Password must be at least 8 characters. / 密码至少需要 8 位。');
      return;
    }

    try {
      const supabase = createBrowserClient();
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: name,
            phone,
            requested_role: context,
            registration_source: 'nanofix_portal_register',
            review_status: context === 'customer' ? 'pending_customer_profile' : 'pending_review'
          }
        }
      });

      if (error) {
        setMessage(`${error.message} / 注册失败，请检查资料后重试。`);
        return;
      }

      setMessage(
        context === 'customer'
          ? 'Registration submitted. Please verify your email if required, then sign in to continue. / 注册已提交。如系统要求，请先验证邮箱，然后登录继续使用。'
          : 'Application submitted. Please verify your email if required. Your access will be enabled after Super Admin review. / 申请已提交。如系统要求，请先验证邮箱。权限将在总管理员审核后启用。'
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
          {copy.eyebrow} / {copy.eyebrowZh}
        </div>
        <h1 className="mt-4 text-2xl font-black tracking-tight text-slate-950">{copy.title}</h1>
        <p className="mt-1 text-base font-black text-activeBlue">{copy.zh}</p>
        <p className="mt-4 text-sm font-bold leading-6 text-slate-700">{copy.welcome}<br />{copy.welcomeZh}</p>
        <p className="mt-3 text-xs font-semibold leading-5 text-slate-500">{copy.note}<br />{copy.noteZh}</p>
        <div className="mt-4 grid gap-2 text-left">
          {copy.bullets.map(([en, zh]) => (
            <div key={en} className="rounded-2xl bg-slate-50 px-4 py-3 text-xs font-bold leading-5 text-slate-700 ring-1 ring-slate-100">
              <span className="text-activeBlue">✓</span> {en}<br />
              <span className="pl-4 text-slate-500">{zh}</span>
            </div>
          ))}
        </div>
      </div>

      <form className="mt-6 space-y-4" onSubmit={onSubmit}>
        <div className="rounded-2xl bg-blue-50 px-4 py-3 text-xs font-bold leading-5 text-blue-800 ring-1 ring-blue-100">
          Default role / 默认角色：{copy.roleLabel}
        </div>
        <input className="w-full rounded-2xl border border-slate-200 bg-adminBg px-4 py-3 text-sm outline-none focus:border-activeBlue" placeholder="Full Name / 姓名" value={name} onChange={(event) => setName(event.target.value)} autoComplete="name" required />
        <input className="w-full rounded-2xl border border-slate-200 bg-adminBg px-4 py-3 text-sm outline-none focus:border-activeBlue" placeholder="Phone / WhatsApp / 手机或 WhatsApp" value={phone} onChange={(event) => setPhone(event.target.value)} autoComplete="tel" required />
        <input className="w-full rounded-2xl border border-slate-200 bg-adminBg px-4 py-3 text-sm outline-none focus:border-activeBlue" placeholder="Email / 邮箱" type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" required />
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
