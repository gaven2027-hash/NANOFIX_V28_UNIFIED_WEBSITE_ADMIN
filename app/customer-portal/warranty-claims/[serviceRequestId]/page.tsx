export const dynamic = 'force-dynamic';

import { CustomerPortalShell } from '@/components/CustomerPortalShell';
import { CustomerPortalWarrantyClaimDetail } from '@/components/CustomerPortalWarrantyClaimDetail';

type PageProps = { params: Promise<{ serviceRequestId: string }> };

export default async function Page({ params }: PageProps) {
  const { serviceRequestId } = await params;
  return (
    <CustomerPortalShell>
      <CustomerPortalWarrantyClaimDetail serviceRequestId={serviceRequestId} />
    </CustomerPortalShell>
  );
}
