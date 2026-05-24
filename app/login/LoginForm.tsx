'use client';

import { Suspense, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createBrowserClient } from '@/lib/supabase/browser';

type LoginContext = 'admin' | 'customer' | 'engineer';

const copyByContext = {
  admin: {
    title: 'Admin Management System Login',
    zh: '管理员管理系统登录',
    welcome: 'Welcome to NANOFIX Command Center.',
    welcomeZh: '欢迎使用 NANOFIX 总后台管理系统。',
    note: 'Manage customers, jobs, quotations, invoices, warranties, engineers and system operations from one secure workspace.',
    noteZh: '统一管理客户、工单、报价、发票、保修、工程师和系统运营。'
  },
  customer: {
    title: 'Premium Member Portal Login',
    zh: '高级会员管理系统登录',
    welcome: 'Welcome to the NANOFIX Premium Member Portal.',
    welcomeZh: '欢迎使用 NANOFIX 高级会员管理系统。',
    note: 'Submit repair requests, track progress and review quotations, invoices, payments and warranty records conveniently.',
    noteZh: '便捷提交报修，实时追踪维修进度，并查看报价、发票、付款和保修记录。'
  },
  engineer: {
    title: 'Engineer Management System Login',
    zh: '工程师管理系统登录',
    welcome: 'Welcome to NANOFIX Engineer Portal.',
    welcomeZh: '欢迎使用 NANOFIX 工程师管理系统。',
    note: 'Review assigned jobs, inspection tasks, field photos, job notes, completion status and customer sign-off records.',
    noteZh: '查看已分配工单、查验任务、现场照片、工单记录、完工状态和客户签名。'
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
  if (text.includes('engineer')) return 'engineer';
  return 'admin';
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
        const reviewText = profile?.review_status === 'pending_review' ? 'Your registration is pending Super Admin review. / 您的注册申请正在等待总管理员审核。' : 'This account is inactive or missing a role profile. / 此账号未启用或缺少角色档案。';
        setMessage(reviewText);
        return;
      }

      setAdminAccessCookie(data.session.access_token, data.session.expires_in);

      const defaultPath = profile.role === 'customer' ? '/customer-portal' : profile.role === 'engineer' ? '/engineer-portal' : '/dashboard';
      router.replace(requestedNext && requestedNext.startsWith('/') ? requestedNext : defaultPath);
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
        <h1 className="text-2xl font-black tracking-tight text-slate-950">{copy.title}</h1>
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
