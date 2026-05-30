export const dynamic = 'force-dynamic';

import { CustomerPortalPageFrame } from '@/components/CustomerPortalPageFrame';
import { CustomerPortalShell } from '@/components/CustomerPortalShell';
import { CustomerPortalWarrantyDownloads } from '@/components/CustomerPortalWarrantyDownloads';

export default function Page() {
  return (
    <CustomerPortalShell>
      <CustomerPortalPageFrame
        eyebrow="Warranty Centre"
        title="Warranty Records & PDFs / 保修记录与PDF"
        description="View active warranty records and available PDF documents. Download buttons are available where documents have been generated. / 查看有效保修记录和可用 PDF 文件；已生成文件时会显示下载按钮。"
        primaryLabel="Warranty View / 保修查看"
        secondaryLabel="PDF Available / 可下载PDF"
      >
        <CustomerPortalWarrantyDownloads />
      </CustomerPortalPageFrame>
    </CustomerPortalShell>
  );
}
