import type { Metadata } from 'next';
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
    </AuthPageShell>
  );
}
