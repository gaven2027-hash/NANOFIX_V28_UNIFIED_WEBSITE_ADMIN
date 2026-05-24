import type { Metadata } from 'next';
import { AuthPageShell } from '@/components/AuthPageShell';
import { RegisterForm } from '@/components/RegisterForm';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'NANOFIX Admin Registration | 管理员注册申请',
  robots: { index: false, follow: false }
};

export default function AdminRegisterPage() {
  return (
    <AuthPageShell>
      <RegisterForm defaultRole="admin" />
    </AuthPageShell>
  );
}
