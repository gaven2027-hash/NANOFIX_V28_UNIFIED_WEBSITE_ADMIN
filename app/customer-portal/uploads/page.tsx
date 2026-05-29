export const dynamic = 'force-dynamic';

import { Suspense } from 'react';
import { CustomerPortalApprovedUploads } from '@/components/CustomerPortalApprovedUploads';
import { CustomerPortalLinkedUploader } from '@/components/CustomerPortalLinkedUploader';
import { CustomerPortalShell } from '@/components/CustomerPortalShell';

export default function Page() {
  return (
    <CustomerPortalShell>
      <div className="space-y-6">
        <Suspense fallback={<div className="rounded-3xl bg-blue-50 p-4 text-xs font-bold text-blue-950 ring-1 ring-blue-200">Loading upload form… / 正在读取上传表单…</div>}>
          <CustomerPortalLinkedUploader />
        </Suspense>
        <CustomerPortalApprovedUploads />
      </div>
    </CustomerPortalShell>
  );
}
