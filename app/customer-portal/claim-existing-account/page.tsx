import type { Metadata } from 'next';
import { ClaimExistingAccountForm } from '@/components/ClaimExistingAccountForm';

export const metadata: Metadata = {
  title: 'Claim Existing Account | NANOFIX Customer Portal',
  description: 'Claim an existing NANOFIX customer record by phone or email before accessing linked repair records, quotations, invoices and warranties.',
  robots: { index: false, follow: false }
};

export default function ClaimExistingAccountPage() {
  return (
    <main className="min-h-screen bg-adminBg px-4 py-10">
      <div className="mx-auto max-w-xl rounded-[2rem] bg-white p-6 shadow-soft ring-1 ring-slate-200 md:p-8">
        <ClaimExistingAccountForm />
      </div>
    </main>
  );
}
