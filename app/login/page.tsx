import type { Metadata } from 'next';
import { LoginShell } from './LoginShell';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'NANOFIX Secure Login | NANOFIX 安全登录',
  description: 'V28.1.6 secure login for the Customer Portal and Internal Admin App. Engineer/Inspection users sign in through the Internal Admin App role group, not a separate Engineer Portal.',
  robots: { index: false, follow: false },
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/icon.png', type: 'image/png', sizes: '512x512' }
    ],
    shortcut: '/favicon.ico',
    apple: '/apple-touch-icon.png'
  }
};

export default function LoginPage() {
  return <LoginShell />;
}
