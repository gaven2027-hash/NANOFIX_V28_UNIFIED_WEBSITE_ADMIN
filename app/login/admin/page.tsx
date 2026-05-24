import type { Metadata } from 'next';
import { AuthPageShell } from '@/components/AuthPageShell';
import { LoginForm } from '../LoginForm';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'NANOFIX System Login | 系统登录',
  robots: { index: false, follow: false }
};

export default function AdminLoginPage() {
  return (
    <AuthPageShell>
      <LoginForm forcedContext="admin" />
      <div className="mt-4 rounded-2xl bg-slate-50 px-4 py-3 text-center text-xs font-semibold leading-5 text-slate-600 ring-1 ring-slate-100">
        System access is assigned internally. / 系统权限由内部统一分配。
      </div>
    </AuthPageShell>
  );
}
