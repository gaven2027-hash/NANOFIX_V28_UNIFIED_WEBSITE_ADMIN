import type { Metadata } from 'next';
import { LoginShell } from '../login/LoginShell';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Customer Portal Login / 客户门户登录 | NANOFIX',
  description: 'Customer Portal login for NANOFIX customers and members.',
  robots: { index: false, follow: false }
};

export default function CustomerLoginPage() {
  return <LoginShell forcedContext="customer" />;
}
