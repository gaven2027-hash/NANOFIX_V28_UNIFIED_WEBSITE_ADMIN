export const dynamic = 'force-dynamic';

import { notFound } from 'next/navigation';
import { AdminShell } from '@/components/AdminShell';
import { PageHeader } from '@/components/PageHeader';
import { CustomerCenterWorkspace } from '@/components/CustomerCenterWorkspace';
import { RegistrationReviewWorkspace } from '@/components/RegistrationReviewWorkspace';
import { customerCenterSections, getCustomerCenterSection } from '@/lib/nanofix/customerCenterConfig';

export function generateStaticParams() {
  return customerCenterSections.map((section) => ({ section: section.key }));
}

export default async function Page({ params }: { params: Promise<{ section: string }> }) {
  const resolvedParams = await params;
  const section = getCustomerCenterSection(resolvedParams.section);
  if (!section) notFound();

  const isRegistrationReview = section.key === 'registration-review';

  return (
    <AdminShell>
      <PageHeader
        eyebrow="客户相关"
        title={section.title}
        description={isRegistrationReview
          ? 'Review customer, engineer and admin registration requests, approve access and assign roles. / 审核客户、工程师和管理员注册申请，批准访问并分配角色。'
          : `${section.helper} / ${section.zh} 已接入真实客户中心后台操作。`}
      />
      {isRegistrationReview ? <RegistrationReviewWorkspace /> : <CustomerCenterWorkspace section={section} />}
    </AdminShell>
  );
}
