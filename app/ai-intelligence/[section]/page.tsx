export const dynamic = 'force-dynamic';

import { notFound } from 'next/navigation';
import { AdminShell } from '@/components/AdminShell';
import { PageHeader } from '@/components/PageHeader';
import { AiIntelligenceWorkspace } from '@/components/AiIntelligenceWorkspace';
import { aiIntelligenceSections, getAiIntelligenceSection } from '@/lib/nanofix/aiIntelligenceConfig';

export function generateStaticParams() {
  return aiIntelligenceSections.map((section) => ({ section: section.key }));
}

export default async function Page({ params }: { params: Promise<{ section: string }> }) {
  const resolvedParams = await params;
  const section = getAiIntelligenceSection(resolvedParams.section);
  if (!section) notFound();

  return (
    <AdminShell>
      <PageHeader
        eyebrow="AI 智能中心"
        title={section.title}
        description={`${section.helper} / ${section.zh} 已接入真实 AI 后台操作。`}
      />
      <AiIntelligenceWorkspace section={section} />
    </AdminShell>
  );
}
