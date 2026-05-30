export const dynamic = 'force-dynamic';

import { CustomerPortalPageFrame } from '@/components/CustomerPortalPageFrame';
import { CustomerPortalShell } from '@/components/CustomerPortalShell';
import { CustomerPortalWarrantyClaimDetail } from '@/components/CustomerPortalWarrantyClaimDetail';

type PageProps = { params: Promise<{ serviceRequestId: string }> };

export default async function Page({ params }: PageProps) {
  const { serviceRequestId } = await params;
  return (
    <CustomerPortalShell>
      <CustomerPortalPageFrame
        eyebrow="Warranty Claim Detail"
        title="Warranty Repair Tracking / 保修维修跟踪"
        description="View the warranty claim timeline, linked documents, messages, attachments and satisfaction confirmation in a single read-only workspace. / 在一个只读工作区查看保修维修时间线、关联文件、留言、附件和满意确认。"
        primaryLabel="Claim Progress / 申请进度"
        secondaryLabel="Read-Only Detail / 只读详情"
      >
        <CustomerPortalWarrantyClaimDetail serviceRequestId={serviceRequestId} />
      </CustomerPortalPageFrame>
    </CustomerPortalShell>
  );
}
