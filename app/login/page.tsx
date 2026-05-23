import type { Metadata } from 'next';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'NANOFIX Admin Login | NANOFIX 后台登录',
  description: 'Secure NANOFIX backend login with browser favicon logo, Supabase Auth and role-based access control.',
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

import { LoginForm } from './LoginForm';

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-adminBg p-6">
      <section className="w-full max-w-md rounded-3xl bg-white p-8 shadow-soft ring-1 ring-slate-200">
        <div className="mx-auto flex h-20 w-20 items-center justify-center overflow-hidden rounded-3xl bg-white p-1 shadow-soft ring-1 ring-slate-200">
          <img src="/icon.png" alt="NANOFIX logo" className="h-full w-full object-contain" />
        </div>
        <h1 className="mt-5 text-center text-2xl font-black text-slate-950">NANOFIX Admin Login</h1>
        <p className="mt-2 text-center text-sm text-slate-500">后台登录页面显示 NANOFIX LOGO，并接入 Supabase Auth、角色权限和路由保护。</p>
        <LoginForm />
      </section>
    </main>
  );
}
