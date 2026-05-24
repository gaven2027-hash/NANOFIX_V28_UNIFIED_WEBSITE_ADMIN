import type { Metadata } from 'next';
import { AuthPageShell } from '@/components/AuthPageShell';
import { LoginForm } from '../LoginForm';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'NANOFIX Member Login | 高级会员登录',
  robots: { index: false, follow: false }
};

export default function MemberLoginPage() {
  return (
    <AuthPageShell>
      <LoginForm forcedContext="customer" />
    </AuthPageShell>
  );
}
