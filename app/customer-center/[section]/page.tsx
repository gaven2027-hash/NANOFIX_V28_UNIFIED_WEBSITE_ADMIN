export const dynamic = 'force-dynamic';

import { notFound } from 'next/navigation';
import { AdminShell } from '@/components/AdminShell';
import { PageHeader } from '@/components/PageHeader';
import { CustomerCenterWorkspace } from '@/components/CustomerCenterWorkspace';
import { customerCenterSections, getCustomerCenterSection } from '@/lib/nanofix/customerCenterConfig';

export function generateStaticParams() {
  return customerCenterSections.map((section) => ({ section: section.key }));
}

export default async function Page({ params }: { params: Promise<{ section: string }> }) {
  const resolvedParams = await params;
  const section = getCustomerCenterSection(resolvedParams.section);
  if (!section) notFound();

  return (
    <AdminShell>
      <PageHeader
        eyebrow="客户相关"
        title={section.title}
        description={`${section.helper} / ${section.zh} 已接入真实客户中心后台操作。`}
      />
      <CustomerCenterWorkspace section={section} />
    </AdminShell>
  );
}
