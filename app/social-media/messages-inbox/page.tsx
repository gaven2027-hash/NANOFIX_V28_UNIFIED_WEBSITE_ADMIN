export const dynamic = 'force-dynamic';

import { AdminShell } from '@/components/AdminShell';
import { PageHeader } from '@/components/PageHeader';
import { SocialMessagesWorkspace } from '@/components/SocialMessagesWorkspace';

export default function Page() {
  return (
    <AdminShell>
      <PageHeader
        eyebrow="社媒管理"
        title="Messages Inbox / 消息收件箱"
        description="Review social, Google Business Profile, WhatsApp and website channel messages. Dashboard links can open a specific message directly. / 查看社媒、Google 商家资料、WhatsApp 和网站渠道消息，仪表盘可直接打开指定消息。"
      />
      <SocialMessagesWorkspace />
    </AdminShell>
  );
}
