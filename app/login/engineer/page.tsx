import type { Metadata } from 'next';
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
    </AuthPageShell>
  );
}
