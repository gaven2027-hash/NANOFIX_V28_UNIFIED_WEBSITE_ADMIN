export const dynamic = 'force-dynamic';

import { AdminShell } from '@/components/AdminShell';
import { PageHeader } from '@/components/PageHeader';
import { AiDraftReviewWorkspace } from '@/components/AiDraftReviewWorkspace';

export default function Page() {
  return (
    <AdminShell>
      <PageHeader
        eyebrow="AI 智能中心"
        title="AI Draft Review / AI 草稿审核"
        description="Review AI-generated drafts, risk flags and human handoff items. Dashboard links can open a specific draft directly. / 审核 AI 草稿、风险标记和转人工事项，仪表盘可直接打开指定草稿。"
      />
      <AiDraftReviewWorkspace />
    </AdminShell>
  );
}
