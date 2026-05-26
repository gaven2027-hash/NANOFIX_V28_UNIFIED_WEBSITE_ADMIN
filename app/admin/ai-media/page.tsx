import type { Metadata } from 'next';
import Link from 'next/link';
import { AiMediaCenterWorkspace } from '@/components/AiMediaCenterWorkspace';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'NANOFIX AI Media Center | NANOFIX AI 素材中心',
  description: 'Unified media attachment center for NANOFIX AI analysis, reports, quotations and material suggestions.',
  robots: { index: false, follow: false }
};

export default function AiMediaCenterPage() {
  return (
    <main className="min-h-screen bg-adminBg px-4 py-6 text-slate-900 md:px-8">
      <div className="mx-auto max-w-7xl space-y-5">
        <header className="rounded-3xl bg-white p-5 shadow-soft ring-1 ring-slate-200">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="text-xs font-black uppercase tracking-[0.18em] text-activeBlue">NANOFIX AI Media Center / AI 素材中心</div>
              <h1 className="mt-2 text-3xl font-black text-slate-950">AI Reports, Materials & Quotation Attachments / AI 报告、材料与报价附件</h1>
              <p className="mt-2 max-w-4xl text-sm font-semibold leading-7 text-slate-600">
                Upload or select AI evidence photos, inspection videos, material references, price sheets, reports and SEO/social sources from local computer, URL import or backend media library. Admin approval controls whether AI can use each asset.
                / 从本地电脑、URL 或后台素材库上传/选择 AI 证据照片、查验视频、材料参考、价格表、报告和 SEO/社媒来源，并由管理员控制是否允许 AI 使用。
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link href="/admin" className="rounded-2xl bg-slate-900 px-4 py-2 text-sm font-black text-white hover:bg-slate-700">Back Admin / 返回后台</Link>
              <Link href="/admin/field-media" className="rounded-2xl bg-white px-4 py-2 text-sm font-black text-activeBlue ring-1 ring-blue-100 hover:bg-blue-50">Field Media / 现场素材</Link>
            </div>
          </div>
        </header>
        <AiMediaCenterWorkspace />
      </div>
    </main>
  );
}
