export const dynamic = 'force-dynamic';

import { EngineerPortalAnchors, PortalShell } from '@/components/PortalShell';
import { WorkflowBoard } from '@/components/WorkflowBoard';
import { EngineerPortalDataLoop } from '@/components/PortalDataLoop';

export default function Page() {
  return (
    <PortalShell type="engineer">
      <EngineerPortalDataLoop />
      <WorkflowBoard />
      <EngineerPortalAnchors />
    </PortalShell>
  );
}
