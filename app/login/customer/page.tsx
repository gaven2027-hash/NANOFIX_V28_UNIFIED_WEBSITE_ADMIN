import type { Metadata } from 'next';
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
    </AuthPageShell>
  );
}
