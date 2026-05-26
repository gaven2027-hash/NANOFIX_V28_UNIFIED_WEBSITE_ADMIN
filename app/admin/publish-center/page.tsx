import type { Metadata } from 'next';
import Link from 'next/link';
import { PublishCenterWorkspace } from '@/components/PublishCenterWorkspace';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'NANOFIX Publish Center | NANOFIX 发布中心',
  description: 'Unified human-controlled Website and Social Publish Center for NANOFIX.',
  robots: {
    index: false,
    follow: false
  }
};

export default function AdminPublishCenterPage() {
  return (
    <main className="min-h-screen bg-adminBg px-4 py-6 text-slate-900 md:px-8">
      <div className="mx-auto max-w-7xl space-y-5">
        <header className="rounded-3xl bg-white p-5 shadow-soft ring-1 ring-slate-200">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="text-xs font-black uppercase tracking-[0.18em] text-activeBlue">NANOFIX Unified Publish Center / 统一发布中心</div>
              <h1 className="mt-2 text-3xl font-black text-slate-950">Website & Social Final Publishing Outlet / 官网与社媒最终发布出口</h1>
              <p className="mt-2 max-w-4xl text-sm font-semibold leading-7 text-slate-600">
                AI can assist generation, editing and preview, but final publishing remains human-controlled. Approval must be completed before scheduling; scheduled items are considered publish-ready.
                / AI 可以辅助生成、编辑和预览，但最终发布必须人工控制。审批必须在排期前完成，排期后即代表已符合发布要求。
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link href="/admin/publish-center/media-package" className="rounded-2xl bg-activeBlue px-4 py-2 text-sm font-black text-white hover:bg-blue-700">Media Package / 发布素材包</Link>
              <Link href="/admin" className="rounded-2xl bg-slate-900 px-4 py-2 text-sm font-black text-white hover:bg-slate-700">Back Admin / 返回后台</Link>
              <Link href="/" className="rounded-2xl bg-white px-4 py-2 text-sm font-black text-activeBlue ring-1 ring-blue-100 hover:bg-blue-50">Open Website / 打开官网</Link>
            </div>
          </div>
        </header>
        <PublishCenterWorkspace />
      </div>
    </main>
  );
}
