import type { Metadata } from 'next';
import Link from 'next/link';
import { AuthPageShell } from '@/components/AuthPageShell';
import { LoginForm } from '../LoginForm';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'NANOFIX Admin Login | 管理员登录',
  robots: { index: false, follow: false }
};

export default function AdminLoginPage() {
  return (
    <AuthPageShell>
      <LoginForm forcedContext="admin" />
      <div className="mt-4 rounded-2xl bg-slate-50 px-4 py-3 text-center text-xs font-semibold leading-5 text-slate-600 ring-1 ring-slate-100">
        Need system access? / 需要系统权限？{' '}
        <Link className="font-black text-activeBlue" href="/register/admin">Request access / 提交申请</Link>
      </div>
    </AuthPageShell>
  );
}
