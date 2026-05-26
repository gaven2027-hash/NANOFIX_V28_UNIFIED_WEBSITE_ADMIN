import type { Metadata } from 'next';
import Link from 'next/link';
import { PublishCenterMediaPackageWorkspace } from '@/components/PublishCenterMediaPackageWorkspace';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'NANOFIX Publish Media Package | NANOFIX 发布素材包',
  description: 'Bind final media packages to NANOFIX Website and Social publish items.',
  robots: { index: false, follow: false }
};

export default function PublishCenterMediaPackagePage() {
  return (
    <main className="min-h-screen bg-adminBg px-4 py-6 text-slate-900 md:px-8">
      <div className="mx-auto max-w-7xl space-y-5">
        <header className="rounded-3xl bg-white p-5 shadow-soft ring-1 ring-slate-200">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="text-xs font-black uppercase tracking-[0.18em] text-activeBlue">Publish Center Media Package / 发布中心素材包</div>
              <h1 className="mt-2 text-3xl font-black text-slate-950">Final Publish Assets / 最终发布素材绑定</h1>
              <p className="mt-2 max-w-4xl text-sm font-semibold leading-7 text-slate-600">
                Bind images, GIFs, videos, PDFs and thumbnails to Website or Social publish items using local upload, URL import or the backend media library.
                / 使用本地上传、URL 导入或后台素材库，为官网或社媒发布项绑定图片、GIF、视频、PDF 和封面素材。
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link href="/admin/publish-center" className="rounded-2xl bg-slate-900 px-4 py-2 text-sm font-black text-white hover:bg-slate-700">Back Publish Center / 返回发布中心</Link>
              <Link href="/admin" className="rounded-2xl bg-white px-4 py-2 text-sm font-black text-activeBlue ring-1 ring-blue-100 hover:bg-blue-50">Back Admin / 返回后台</Link>
            </div>
          </div>
        </header>
        <PublishCenterMediaPackageWorkspace />
      </div>
    </main>
  );
}
