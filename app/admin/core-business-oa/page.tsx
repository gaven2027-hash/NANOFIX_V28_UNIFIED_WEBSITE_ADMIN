export const dynamic = 'force-dynamic';

import { AdminShell } from '@/components/AdminShell';
import { CoreBusinessLiveOperationsPanel } from '@/components/CoreBusinessLiveOperationsPanel';
import { PageHeader } from '@/components/PageHeader';

export default function Page() {
  return (
    <AdminShell>
      <PageHeader eyebrow="Phase E" title="Core Business Fully Operable OA" description="Track the required live modules for the next production-grade NANOFIX OA upgrade." />
      <CoreBusinessLiveOperationsPanel />
    </AdminShell>
  );
}
