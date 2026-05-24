import type { Metadata } from 'next';
import { AuthPageShell } from '@/components/AuthPageShell';
import { RegisterForm } from '@/components/RegisterForm';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'NANOFIX Customer Registration | 客户会员注册',
  robots: { index: false, follow: false }
};

export default function CustomerRegisterPage() {
  return (
    <AuthPageShell>
      <RegisterForm defaultRole="customer" />
    </AuthPageShell>
  );
}
