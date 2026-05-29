export const dynamic = 'force-dynamic';

import { CustomerPortalApprovedUploads } from '@/components/CustomerPortalApprovedUploads';

export default function Page() {
  return (
    <main className="min-h-screen bg-slate-50">
      <CustomerPortalApprovedUploads />
    </main>
  );
}
