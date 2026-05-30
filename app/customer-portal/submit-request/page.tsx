export const dynamic = 'force-dynamic';

import { CustomerPortalRequestForm } from '@/components/CustomerPortalRequestForm';
import { CustomerPortalShell } from '@/components/CustomerPortalShell';

export default function Page() {
  return (
    <CustomerPortalShell>
      <CustomerPortalRequestForm />
    </CustomerPortalShell>
  );
}
