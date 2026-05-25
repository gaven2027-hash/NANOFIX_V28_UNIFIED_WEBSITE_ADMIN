import type { Metadata } from 'next';
import { RegisterShell } from './RegisterShell';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'NANOFIX Registration | NANOFIX 注册',
  description: 'Create or apply for NANOFIX customer, engineer or admin access.',
  robots: { index: false, follow: false }
};

export default function RegisterPage() {
  return <RegisterShell />;
}
