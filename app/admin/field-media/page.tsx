import type { Metadata } from 'next';
import Link from 'next/link';
import { FieldMediaCenterWorkspace } from '@/components/FieldMediaCenterWorkspace';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'NANOFIX Field Media Center | NANOFIX 现场素材中心',
  description: 'Unified media upload and attachment center for customers, service requests, jobs and engineer inspections.',
  robots: { index: false, follow: false }
};

export default function FieldMediaCenterPage() {
  return (
    <main className="min-h-screen bg-adminBg px-4 py-6 text-slate-900 md:px-8">
      <div className="mx-auto max-w-7xl space-y-5">
        <header className="rounded-3xl bg-white p-5 shadow-soft ring-1 ring-slate-200">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="text-xs font-black uppercase tracking-[0.18em] text-activeBlue">NANOFIX Field Media Center / 现场素材中心</div>
              <h1 className="mt-2 text-3xl font-black text-slate-950">Customer, Service Request & Engineer Uploads / 客户、报修与工程师上传</h1>
              <p className="mt-2 max-w-4xl text-sm font-semibold leading-7 text-slate-600">
                Upload or select field media from local computer, URL import or backend media library, then link it to customers, leads, service requests, jobs, inspections, quotations, invoices, payments or warranties.
                / 从本地电脑、URL 或后台素材库上传/选择现场素材，并关联到客户、线索、报修单、工单、查验、报价、发票、付款或保修。
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link href="/admin" className="rounded-2xl bg-slate-900 px-4 py-2 text-sm font-black text-white hover:bg-slate-700">Back Admin / 返回后台</Link>
              <Link href="/admin/publish-center" className="rounded-2xl bg-white px-4 py-2 text-sm font-black text-activeBlue ring-1 ring-blue-100 hover:bg-blue-50">Publish Center / 发布中心</Link>
            </div>
          </div>
        </header>
        <FieldMediaCenterWorkspace />
      </div>
    </main>
  );
}
