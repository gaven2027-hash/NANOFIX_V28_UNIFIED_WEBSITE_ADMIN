import type { Metadata } from 'next';
import { LoginShell } from './LoginShell';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'NANOFIX Secure Login | NANOFIX 安全登录',
  description: 'Secure NANOFIX login for Admin, Customer and Engineer portals.',
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
