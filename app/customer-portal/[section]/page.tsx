export const dynamic = 'force-dynamic';

import { notFound } from 'next/navigation';
import { AdminShell } from '@/components/AdminShell';
import { PageHeader } from '@/components/PageHeader';
import { CustomerPortalWorkspace } from '@/components/CustomerPortalWorkspace';
import { customerPortalSections, getCustomerPortalSection } from '@/lib/nanofix/customerPortalConfig';

export function generateStaticParams() {
  return customerPortalSections.map((section) => ({ section: section.key }));
}

export default async function Page({ params }: { params: Promise<{ section: string }> }) {
  const resolvedParams = await params;
  const section = getCustomerPortalSection(resolvedParams.section);
  if (!section) notFound();

  return (
    <AdminShell>
      <PageHeader
        eyebrow="客户会员中心入口"
        title={section.title}
        description={`${section.helper} / ${section.zh} 已接入真实客户门户后台操作。`}
      />
      <CustomerPortalWorkspace section={section} />
    </AdminShell>
  );
}
