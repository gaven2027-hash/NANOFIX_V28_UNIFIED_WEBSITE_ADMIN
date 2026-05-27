'use client';

import Link from 'next/link';
import { Suspense, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createBrowserClient } from '@/lib/supabase/browser';

type LoginContext = 'admin' | 'customer';

const copyByContext = {
  admin: {
    eyebrow: 'NANOFIX Internal Admin App',
    eyebrowZh: 'NANOFIX 内部管理系统',
    title: 'Internal Admin App Login',
    zh: '内部管理系统登录',
    welcome: 'For Super Admin, Admin, Engineer / Inspection, Operations and Finance teams.',
    welcomeZh: '供总管理员、管理员、工程师/检修、运营和财务团队使用。',
    note: 'All internal users share this one secure entry. Engineer / Inspection users no longer use a separate Engineer Portal, Register or Login page.',
    noteZh: '所有内部人员共用此安全入口。工程师/检修人员不再使用独立 Engineer Portal、注册页或登录页。',
    registerCta: 'Request Internal Access',
    registerCtaZh: '申请内部人员权限'
  },
  customer: {
    eyebrow: 'NANOFIX Customer Portal',
    eyebrowZh: 'NANOFIX 客户门户',
    title: 'Customer Portal Login',
    zh: '客户门户登录',
    welcome: 'For customers and members to submit repair requests and track their own records.',
    welcomeZh: '供客户和会员提交报修并查看自己的服务记录。',
    note: 'Customers use an independent portal and never enter the Internal Admin App left menu.',
    noteZh: '客户使用独立门户，不进入内部总后台左侧一级菜单。',
    registerCta: 'Create Customer Account',
    registerCtaZh: '注册客户账号'
  }
} as const;

function setAdminAccessCookie(accessToken: string, expiresIn?: number) {
  if (typeof document === 'undefined') return;
  const maxAge = Math.max(60, Math.min(Number(expiresIn || 3600), 3600));
  const secure = window.location.protocol === 'https:' ? '; Secure' : '';
  document.cookie = `nanofix_admin_access_token=${encodeURIComponent(accessToken)}; Path=/; Max-Age=${maxAge}; SameSite=Lax${secure}`;
}

function clearAdminAccessCookie() {
  if (typeof document === 'undefined') return;
  const secure = window.location.protocol === 'https:' ? '; Secure' : '';
  document.cookie = `nanofix_admin_access_token=; Path=/; Max-Age=0; SameSite=Lax${secure}`;
}

function getLoginContext(nextPath: string | null, explicitRole: string | null, forcedContext?: LoginContext): LoginContext {
  if (forcedContext) return forcedContext;
  const text = `${nextPath || ''} ${explicitRole || ''}`.toLowerCase();
  if (text.includes('customer') || text.includes('member')) return 'customer';
  return 'admin';
}

function isInternalRole(role?: string | null) {
  return ['super_admin', 'operations_admin', 'finance', 'content_admin', 'support', 'engineer'].includes(String(role || '').toLowerCase());
}

function LoginFormInner({ forcedContext }: { forcedContext?: LoginContext }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const requestedNext = searchParams.get('next');
  const context = getLoginContext(requestedNext, searchParams.get('role'), forcedContext);
  const copy = copyByContext[context];
  const setupWarning = useMemo(() => searchParams.get('setup') === 'supabase_env_missing', [searchParams]);
  const registerHref = useMemo(() => `/register?role=${context === 'customer' ? 'customer' : 'admin'}`, [context]);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage('');
    clearAdminAccessCookie();

    try {
      const supabase = createBrowserClient();
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error || !data.user || !data.session?.access_token) {
        setMessage(error?.message ?? 'Login failed. / 登录失败。');
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role,is_active,review_status,profile_status')
        .eq('auth_user_id', data.user.id)
        .maybeSingle();

      if (profileError || !profile?.is_active) {
        await supabase.auth.signOut();
        clearAdminAccessCookie();
        const reviewText = profile?.review_status === 'pending_review'
          ? 'Your registration is pending Super Admin review. / 您的注册申请正在等待总管理员审核。'
          : 'This account is inactive or missing a role profile. / 此账号未启用或缺少角色档案。';
        setMessage(reviewText);
        return;
      }

      if (context === 'customer' && profile.role !== 'customer') {
        await supabase.auth.signOut();
        clearAdminAccessCookie();
        setMessage('This is an internal staff account. Please use Internal Admin App login. / 这是内部人员账号，请使用内部管理系统登录入口。');
        return;
      }

      if (context === 'admin' && !isInternalRole(profile.role)) {
        await supabase.auth.signOut();
        clearAdminAccessCookie();
        setMessage('This is a customer account. Please use Customer Portal login. / 这是客户账号，请使用客户门户登录入口。');
        return;
      }

      setAdminAccessCookie(data.session.access_token, data.session.expires_in);

      const defaultPath = profile.role === 'customer' ? '/customer-portal' : '/dashboard';
      const safeNext = requestedNext && requestedNext.startsWith('/') && !requestedNext.includes('engineer-portal') ? requestedNext : null;
      router.replace(safeNext || defaultPath);
      router.refresh();
    } catch {
      clearAdminAccessCookie();
      setMessage('Login service is not configured. / 登录服务暂未配置。');
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
      </div>
      <form className="mt-6 space-y-4" onSubmit={onSubmit}>
        {setupWarning ? (
          <div className="rounded-2xl bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-900 ring-1 ring-amber-100">
            Login environment is not configured yet. / 登录环境变量尚未配置。
          </div>
        ) : null}
        <input
          className="w-full rounded-2xl border border-slate-200 bg-adminBg px-4 py-3 text-sm outline-none focus:border-activeBlue"
          placeholder="Email / 邮箱"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          autoComplete="email"
          required
        />
        <input
          type="password"
          className="w-full rounded-2xl border border-slate-200 bg-adminBg px-4 py-3 text-sm outline-none focus:border-activeBlue"
          placeholder="Password / 密码"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          autoComplete="current-password"
          required
        />
        {message ? <div className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-800 ring-1 ring-red-100">{message}</div> : null}
        <button className="w-full rounded-2xl bg-activeBlue px-4 py-3 font-bold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60" type="submit" disabled={loading}>
          {loading ? 'Signing in... / 登录中...' : 'Sign In / 登录'}
        </button>
        <div className="rounded-2xl bg-blue-50 px-4 py-3 text-center text-xs font-bold leading-5 text-blue-800 ring-1 ring-blue-100">
          New account? / 还没有账号？<br />
          <Link href={registerHref} className="text-activeBlue hover:underline">{copy.registerCta} / {copy.registerCtaZh}</Link>
        </div>
      </form>
    </>
  );
}

export function LoginForm({ forcedContext }: { forcedContext?: LoginContext }) {
  return (
    <Suspense fallback={<div className="mt-6 rounded-2xl bg-adminBg px-4 py-3 text-sm font-semibold text-slate-600">Loading login form...</div>}>
      <LoginFormInner forcedContext={forcedContext} />
    </Suspense>
  );
}
