import type { Metadata } from 'next';
import { RegisterShell } from '../register/RegisterShell';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Customer Portal Registration / 客户门户注册 | NANOFIX',
  description: 'Customer Portal account creation for NANOFIX customers and members.',
  robots: { index: false, follow: false }
};

export default function CustomerRegisterPage() {
  return <RegisterShell forcedContext="customer" />;
}
