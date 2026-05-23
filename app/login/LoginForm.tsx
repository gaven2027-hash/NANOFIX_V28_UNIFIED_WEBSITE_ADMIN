'use client';

import { Suspense, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createBrowserClient } from '@/lib/supabase/browser';

function LoginFormInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const setupWarning = useMemo(() => searchParams.get('setup') === 'supabase_env_missing', [searchParams]);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      const supabase = createBrowserClient();
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error || !data.user) {
        setMessage(error?.message ?? 'Login failed. / 登录失败。');
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role,is_active')
        .eq('auth_user_id', data.user.id)
        .maybeSingle();

      if (profileError || !profile?.is_active) {
        await supabase.auth.signOut();
        setMessage('This account is inactive or missing a role profile. / 此账号未启用或缺少角色档案。');
        return;
      }

      const requestedNext = searchParams.get('next');
      const defaultPath = profile.role === 'customer' ? '/customer-portal' : profile.role === 'engineer' ? '/engineer-portal' : '/dashboard';
      router.replace(requestedNext && requestedNext.startsWith('/') ? requestedNext : defaultPath);
      router.refresh();
    } catch {
      setMessage('Supabase login is not configured. Check NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY. / 请检查 Supabase 环境变量。');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="mt-6 space-y-4" onSubmit={onSubmit}>
      {setupWarning ? (
        <div className="rounded-2xl bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-900 ring-1 ring-amber-100">
          Supabase environment variables are not configured yet. Protected pages are locked until deployment variables are set. / Supabase 环境变量未配置，后台页面已被保护。
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
      <p className="text-center text-xs font-semibold leading-5 text-slate-500">
        Supabase Auth + profiles.role controls Admin, Engineer and Customer portal access. / 通过 Supabase Auth 与角色权限控制后台、工程师和客户入口。
      </p>
    </form>
  );
}

export function LoginForm() {
  return (
    <Suspense fallback={<div className="mt-6 rounded-2xl bg-adminBg px-4 py-3 text-sm font-semibold text-slate-600">Loading login form...</div>}>
      <LoginFormInner />
    </Suspense>
  );
}
