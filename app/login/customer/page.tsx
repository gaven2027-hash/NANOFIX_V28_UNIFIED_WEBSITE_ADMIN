import type { Metadata } from 'next';
import Link from 'next/link';
import { AuthPageShell } from '@/components/AuthPageShell';
import { LoginForm } from '../LoginForm';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'NANOFIX Customer Login | 客户会员登录',
  robots: { index: false, follow: false }
};

export default function CustomerLoginPage() {
  return (
    <AuthPageShell>
      <LoginForm forcedContext="customer" />
      <div className="mt-4 rounded-2xl bg-slate-50 px-4 py-3 text-center text-xs font-semibold leading-5 text-slate-600 ring-1 ring-slate-100">
        No account yet? / 还没有账号？{' '}
        <Link className="font-black text-activeBlue" href="/register/member">Register as premium member / 注册高级会员</Link>
      </div>
    </AuthPageShell>
  );
}
