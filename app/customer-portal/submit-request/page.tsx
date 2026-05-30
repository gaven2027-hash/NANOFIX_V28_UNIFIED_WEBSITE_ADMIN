export const dynamic = 'force-dynamic';

import { CustomerPortalPageFrame } from '@/components/CustomerPortalPageFrame';
import { CustomerPortalRequestAndFeedbackPanel } from '@/components/CustomerPortalRequestAndFeedbackPanel';
import { CustomerPortalShell } from '@/components/CustomerPortalShell';

export default function Page() {
  return (
    <CustomerPortalShell>
      <CustomerPortalPageFrame
        eyebrow="Submit Repair Request"
        title="Book Repair or Send Follow-up / 提交维修或反馈"
        description="Submit a new repair request or send follow-up information to NANOFIX. Uploaded details will enter the service request workflow. / 提交新的维修申请或补充反馈，资料会进入 NANOFIX 服务流程。"
        primaryLabel="Submit Request / 提交申请"
        secondaryLabel="Service Workflow / 服务流程"
      >
        <CustomerPortalRequestAndFeedbackPanel />
      </CustomerPortalPageFrame>
    </CustomerPortalShell>
  );
}
