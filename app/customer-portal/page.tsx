export const dynamic = 'force-dynamic';

import { Customer360 } from '@/components/Customer360';
import { CustomerPortalDataLoop } from '@/components/PortalDataLoop';
import { CustomerPortalAnchors, PortalShell } from '@/components/PortalShell';

export default function Page() {
  return (
    <PortalShell type="customer">
      <CustomerPortalDataLoop />
      <Customer360 />
      <CustomerPortalAnchors />
    </PortalShell>
  );
}
