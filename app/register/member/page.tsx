import type { Metadata } from 'next';
import { AuthPageShell } from '@/components/AuthPageShell';
import { RegisterForm } from '@/components/RegisterForm';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'NANOFIX Member Registration | 高级会员注册',
  robots: { index: false, follow: false }
};

export default function MemberRegisterPage() {
  return (
    <AuthPageShell>
      <RegisterForm defaultRole="customer" />
    </AuthPageShell>
  );
}
