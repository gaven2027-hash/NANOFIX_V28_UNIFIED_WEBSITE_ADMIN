export const dynamic = 'force-dynamic';

import { notFound } from 'next/navigation';
import { AdminShell } from '@/components/AdminShell';
import { PageHeader } from '@/components/PageHeader';
import { ServiceOperationsWorkspace } from '@/components/ServiceOperationsWorkspace';
import { getOperationModule, operationModules, type OperationModuleKey } from '@/lib/nanofix/operationsConfig';

export function generateStaticParams() {
  return operationModules.map((module) => ({ module: module.key }));
}

export default async function Page({ params }: { params: Promise<{ module: string }> }) {
  const resolvedParams = await params;
  const config = getOperationModule(resolvedParams.module);
  if (!config) notFound();

  return (
    <AdminShell>
      <PageHeader
        eyebrow="业务订单处理"
        title={`${config.title} / ${config.zh}`}
        description="Real Supabase CRUD workspace with table list, search, filters, details, create, edit, status transitions and audit log. / 真实 Supabase 后台操作页：列表、搜索、筛选、详情、新增、编辑、状态流转和审计日志。"
      />
      <ServiceOperationsWorkspace moduleKey={config.key as OperationModuleKey} mode="module" />
    </AdminShell>
  );
}
