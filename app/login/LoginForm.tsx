'use client';

import Link from 'next/link';
import { Suspense, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createBrowserClient } from '@/lib/supabase/browser';

type LoginContext = 'admin' | 'customer' | 'engineer';

const copyByContext = {
  admin: {
    eyebrow: 'NANOFIX Command Center',
    eyebrowZh: 'NANOFIX 总后台控制中心',
    title: 'Admin Management System Login',
    zh: '管理员管理系统登录',
    welcome: 'Welcome back to the NANOFIX unified operations command center.',
    welcomeZh: '欢迎回到 NANOFIX 统一运营管理中心。',
    note: 'Manage leads, customers, engineers, service orders, quotations, invoices, warranties, website content, social media and AI assistance from one secure workspace.',
    noteZh: '在一个安全工作台中统一管理线索、客户、工程师、工单、报价、发票、保修、官网内容、社媒与 AI 辅助。',
    bullets: [
      ['Unified business dashboard', '统一业务数据看板'],
      ['Secure role-based admin access', '安全的角色权限管理'],
      ['Real-time operations control', '实时业务流程管控']
    ],
    footer: 'For authorised NANOFIX administrators only.',
    footerZh: '仅限已授权的 NANOFIX 管理员使用。',
    registerCta: 'Request Admin Access',
    registerCtaZh: '申请管理员权限'
  },
  customer: {
    eyebrow: 'NANOFIX Premium Member Portal',
    eyebrowZh: 'NANOFIX 高级会员中心',
    title: 'Premium Member Portal Login',
    zh: '高级会员管理系统登录',
    welcome: 'Welcome to your NANOFIX premium member workspace.',
    welcomeZh: '欢迎进入您的 NANOFIX 高级会员专属空间。',
    note: 'Submit repair requests, upload leakage photos, track repair progress and review quotations, invoices, payments and warranty records conveniently.',
    noteZh: '便捷提交报修、上传漏水照片、实时追踪维修进度，并查看报价、发票、付款和保修记录。',
    bullets: [
      ['Track every repair step online', '在线追踪每一步维修进度'],
      ['View quotes, invoices and warranty', '查看报价、发票与保修资料'],
      ['Keep your service records organised', '集中保存您的服务记录']
    ],
    footer: 'Designed for NANOFIX customers and premium members.',
    footerZh: '专为 NANOFIX 客户与高级会员使用。',
    registerCta: 'Create Premium Member Account',
    registerCtaZh: '注册高级会员账号'
  },
  engineer: {
    eyebrow: 'NANOFIX Field Engineer Portal',
    eyebrowZh: 'NANOFIX 工程师现场管理中心',
    title: 'Engineer Management System Login',
    zh: '工程师管理系统登录',
    welcome: 'Welcome to the NANOFIX field engineer operations portal.',
    welcomeZh: '欢迎进入 NANOFIX 工程师现场作业管理系统。',
    note: 'Review assigned jobs, site inspection tasks, customer information, field photos, job notes, completion status and sign-off records in one mobile-friendly workspace.',
    noteZh: '在一个适合手机操作的工作台中查看已分配工单、现场查验任务、客户资料、现场照片、施工记录、完工状态与签收记录。',
    bullets: [
      ['See assigned jobs clearly', '清楚查看已分配任务'],
      ['Update inspection and work status', '更新查验与施工状态'],
      ['Upload site notes and photos', '上传现场记录与照片']
    ],
    footer: 'For approved NANOFIX engineers and field teams.',
    footerZh: '仅限已审核通过的 NANOFIX 工程师和现场团队使用。',
    registerCta: 'Apply for Engineer Access',
    registerCtaZh: '申请工程师账号'
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
  const registerHref = useMemo(() => `/register?role=${context}`, [context]);

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
          New to this portal? / 还没有账号？<br />
          <Link href={registerHref} className="text-activeBlue hover:underline">{copy.registerCta} / {copy.registerCtaZh}</Link>
        </div>
        <p className="text-center text-[11px] font-bold leading-5 text-slate-500">
          {copy.footer}<br />{copy.footerZh}
        </p>
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
