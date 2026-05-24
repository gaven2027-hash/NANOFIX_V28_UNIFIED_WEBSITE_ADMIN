export const dynamic = 'force-dynamic';

import { AdminShell } from '@/components/AdminShell';
import { PageHeader } from '@/components/PageHeader';
import { AiIntelligenceWorkspace } from '@/components/AiIntelligenceWorkspace';

export default function Page() {
  return (
    <AdminShell>
      <PageHeader
        eyebrow="AI 智能中心"
        title="AI Intelligence Center"
        description="Operable AI backend connected to Supabase AI rules, drafts, logs, search logs and version snapshots. / 已连接 Supabase 真实 AI 规则、草稿、日志、搜索记录和版本快照。"
      />
      <AiIntelligenceWorkspace />
    </AdminShell>
  );
}
