import type { Metadata } from 'next';
import Link from 'next/link';
import { AuthPageShell } from '@/components/AuthPageShell';
import { LoginForm } from '../LoginForm';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'NANOFIX Engineer Login | 工程师登录',
  robots: { index: false, follow: false }
};

export default function EngineerLoginPage() {
  return (
    <AuthPageShell>
      <LoginForm forcedContext="engineer" />
      <div className="mt-4 rounded-2xl bg-slate-50 px-4 py-3 text-center text-xs font-semibold leading-5 text-slate-600 ring-1 ring-slate-100">
        Engineer account not ready? / 还没有工程师账号？{' '}
        <Link className="font-black text-activeBlue" href="/register/engineer">Apply for engineer account / 申请工程师账号</Link>
      </div>
    </AuthPageShell>
  );
}
