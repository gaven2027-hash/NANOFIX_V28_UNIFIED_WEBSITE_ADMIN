import type { Metadata } from 'next';
import { RegisterShell } from '../register/RegisterShell';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'NANOFIX Internal Admin Access Request',
  robots: { index: false, follow: false }
};

export default function AdminAccessRequestPage() {
  return <RegisterShell forcedContext="admin" />;
}
