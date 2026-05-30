export const dynamic = 'force-dynamic';

import { Suspense } from 'react';
import { CustomerPortalApprovedUploads } from '@/components/CustomerPortalApprovedUploads';
import { CustomerPortalLinkedUploader } from '@/components/CustomerPortalLinkedUploader';
import { CustomerPortalPageFrame } from '@/components/CustomerPortalPageFrame';
import { CustomerPortalShell } from '@/components/CustomerPortalShell';

export default function Page() {
  return (
    <CustomerPortalShell>
      <CustomerPortalPageFrame
        eyebrow="Upload Centre"
        title="Photos, Videos & Approved Files / 图片、视频与已批准文件"
        description="Upload site photos or videos linked to service records, and view files approved by NANOFIX for customer access. / 上传与服务记录关联的现场图片或视频，并查看 NANOFIX 已批准给客户访问的文件。"
        primaryLabel="Upload Evidence / 上传资料"
        secondaryLabel="Approved Files / 已批准文件"
      >
        <Suspense fallback={<div className="rounded-3xl bg-blue-50 p-4 text-xs font-bold text-blue-950 ring-1 ring-blue-200">Loading upload form… / 正在读取上传表单…</div>}>
          <CustomerPortalLinkedUploader />
        </Suspense>
        <CustomerPortalApprovedUploads />
      </CustomerPortalPageFrame>
    </CustomerPortalShell>
  );
}
