import type { Metadata } from 'next';
import { AuthPageShell } from '@/components/AuthPageShell';
import { RegisterForm } from '@/components/RegisterForm';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'NANOFIX Engineer Registration | 工程师注册',
  robots: { index: false, follow: false }
};

export default function EngineerRegisterPage() {
  return (
    <AuthPageShell>
      <RegisterForm defaultRole="engineer" />
    </AuthPageShell>
  );
}
