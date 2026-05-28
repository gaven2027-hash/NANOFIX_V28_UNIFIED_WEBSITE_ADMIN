import Link from 'next/link';
import { Badge } from './Badge';
import { SectionCard } from './SectionCard';
import { SocialPreview } from './SocialPreview';

type Tone = 'blue' | 'green' | 'amber' | 'red' | 'gray' | 'cyan';

type SocialItem = {
  id: string;
  title: string;
  zh: string;
  platform: string;
  status: string;
  owner: string;
  href: string;
  tone: Tone;
};

const accountItems: SocialItem[] = [
  { id: 'ACC-META-001', title: 'Meta Business account', zh: 'Meta 商业账号', platform: 'Facebook / Instagram', status: 'connected', owner: 'Social Admin', href: '/social-media#social-accounts', tone: 'green' },
  { id: 'ACC-GMB-002', title: 'Google Business Profile', zh: 'Google 商家资料', platform: 'Google', status: 'review_sync', owner: 'Website Admin', href: '/social-media#google-business-profile', tone: 'blue' },
  { id: 'ACC-TTK-003', title: 'TikTok Business account', zh: 'TikTok 商业账号', platform: 'TikTok', status: 'token_review', owner: 'Social Admin', href: '/social-media#social-accounts', tone: 'amber' },
  { id: 'ACC-XHS-004', title: 'Xiaohongshu account', zh: '小红书账号', platform: 'Xiaohongshu', status: 'manual_mode', owner: 'Social Admin', href: '/social-media#social-accounts', tone: 'gray' }
];

const inboxItems: SocialItem[] = [
  { id: 'MSG-WA-018', title: 'WhatsApp photo consult', zh: 'WhatsApp 图片咨询', platform: 'WhatsApp', status: 'ai_draft_ready', owner: 'Customer Service', href: '/social-media#whatsapp-ai-reply', tone: 'red' },
  { id: 'MSG-FB-011', title: 'Facebook comment asks for quote', zh: 'Facebook 评论询价', platform: 'Facebook', status: 'needs_human', owner: 'Operations', href: '/social-media#review-comment-management', tone: 'amber' },
  { id: 'MSG-IG-026', title: 'Instagram organic DM', zh: 'Instagram 自然私信', platform: 'Instagram', status: 'convert_to_lead', owner: 'Operations', href: '/social-media#organic-social-leads', tone: 'green' },
  { id: 'MSG-GMB-009', title: 'GMB message and review reply', zh: 'GMB 消息与评论回复', platform: 'Google Business', status: 'reply_required', owner: 'Website Admin', href: '/social-media#google-business-profile', tone: 'blue' }
];

const organicLeadItems: SocialItem[] = [
  { id: 'ORG-IG-005', title: 'Instagram profile WhatsApp click', zh: 'Instagram 主页 WhatsApp 点击', platform: 'Instagram Organic', status: 'linked_to_lead', owner: 'Operations', href: '/social-media#organic-social-leads', tone: 'green' },
  { id: 'ORG-TTK-003', title: 'TikTok comment converted', zh: 'TikTok 评论已转线索', platform: 'TikTok Organic', status: 'service_request_created', owner: 'Operations', href: '/social-media#social-organic-conversion', tone: 'cyan' },
  { id: 'ORG-XHS-002', title: 'Xiaohongshu DM asks repair price', zh: '小红书私信询价', platform: 'Xiaohongshu Organic', status: 'qualification', owner: 'Customer Service', href: '/social-media#organic-social-leads', tone: 'amber' }
];

const scheduleItems: SocialItem[] = [
  { id: 'PUB-IG-014', title: 'Before/after reel scheduled', zh: '前后对比 Reels 已排期', platform: 'Instagram', status: 'scheduled', owner: 'Social Admin', href: '/social-media#schedule-publish-approval', tone: 'blue' },
  { id: 'PUB-YT-006', title: 'YouTube Shorts needs approval', zh: 'YouTube Shorts 待审批', platform: 'YouTube Shorts', status: 'pending_approval', owner: 'Admin', href: '/social-media#multi-platform-preview-review', tone: 'amber' },
  { id: 'PUB-GMB-010', title: 'Google Business post ready', zh: 'Google 商家帖子待发布', platform: 'Google Business', status: 'ready', owner: 'Website Admin', href: '/social-media#campaign-posting-queue', tone: 'green' }
];

const quickActions = [
  { title: 'Open unified inbox', zh: '打开统一收件箱', href: '/social-media#unified-social-inbox' },
  { title: 'Edit WhatsApp AI reply', zh: '编辑 WhatsApp AI 回复', href: '/social-media#whatsapp-ai-reply' },
  { title: 'Transfer to human', zh: '转人工', href: '/social-media#transfer-to-human' },
  { title: 'Create AI social draft', zh: '创建 AI 社媒草稿', href: '/social-media#ai-social-content-studio' },
  { title: 'Multi-platform review', zh: '多平台并排审核', href: '/social-media#multi-platform-preview-review' },
  { title: 'Schedule publish approval', zh: '排期 / 发布审批', href: '/social-media#schedule-publish-approval' }
];

function SocialTable({ id, title, subtitle, items }: { id: string; title: string; subtitle: string; items: SocialItem[] }) {
  return (
    <SectionCard title={title} subtitle={subtitle}>
      <div id={id} className="scroll-mt-32 overflow-hidden rounded-2xl border border-slate-200">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="p-3">Item / 条目</th>
              <th className="p-3">Platform / 平台</th>
              <th className="p-3">Owner / 负责人</th>
              <th className="p-3">Status / 状态</th>
              <th className="p-3">Action / 操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {items.map((item) => (
              <tr key={item.id} className="bg-white hover:bg-blue-50/50">
                <td className="p-3">
                  <div className="font-black text-slate-900">{item.title}</div>
                  <div className="text-xs font-semibold text-slate-500">{item.zh}</div>
                  <div className="mt-1 text-xs font-bold text-activeBlue">{item.id}</div>
                </td>
                <td className="p-3 text-xs font-bold text-slate-600">{item.platform}</td>
                <td className="p-3 text-xs font-bold text-slate-600">{item.owner}</td>
                <td className="p-3"><Badge tone={item.tone}>{item.status}</Badge></td>
                <td className="p-3"><Link href={item.href} className="rounded-xl bg-activeBlue px-3 py-2 text-xs font-black text-white hover:bg-blue-700">Open</Link></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </SectionCard>
  );
}

export function SocialMediaManagementWorkspace() {
  return (
    <div className="space-y-6">
      <section className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
        {quickActions.map((action) => (
          <Link key={action.href} href={action.href} className="rounded-3xl bg-gradient-to-br from-sky-400 via-cyan-300 to-blue-500 p-4 text-white shadow-soft transition hover:-translate-y-0.5">
            <div className="text-sm font-black">{action.title}</div>
            <div className="mt-1 text-xs font-bold text-white/80">{action.zh}</div>
          </Link>
        ))}
      </section>

      <SectionCard title="Social Media Command Center / 社媒管理控制台" subtitle="Natural social enquiries, paid ad leads, AI replies and content approvals stay separated and auditable. / 社媒自然咨询、广告线索、AI 回复和内容审批分开处理并可审计。">
        <div id="unified-social-inbox" className="scroll-mt-32 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {[
            { label: 'Inbox', zh: '收件箱', value: '31', href: '/social-media#unified-social-inbox', tone: 'blue' as Tone },
            { label: 'Needs human', zh: '需要人工', value: '6', href: '/social-media#transfer-to-human', tone: 'red' as Tone },
            { label: 'Organic leads', zh: '自然线索', value: '11', href: '/social-media#organic-social-leads', tone: 'green' as Tone },
            { label: 'Scheduled posts', zh: '已排期帖子', value: '4', href: '/social-media#schedule-publish-approval', tone: 'amber' as Tone }
          ].map((card) => (
            <Link key={card.label} href={card.href} className="rounded-2xl border border-slate-200 bg-white p-4 transition hover:ring-1 hover:ring-activeBlue">
              <div className="flex items-start justify-between gap-2"><div><div className="text-sm font-black text-slate-900">{card.label}</div><div className="text-xs font-semibold text-slate-500">{card.zh}</div></div><Badge tone={card.tone}>Open</Badge></div>
              <div className="mt-3 text-3xl font-black text-slate-950">{card.value}</div>
            </Link>
          ))}
        </div>
      </SectionCard>

      <div className="grid gap-6 xl:grid-cols-2">
        <SocialTable id="social-accounts" title="Social Accounts & Google Business / 社媒账号与 Google 商家资料" subtitle="Connection status, token review and manual-mode accounts. / 账号连接、Token 审查和手动模式账号。" items={accountItems} />
        <SocialTable id="whatsapp-ai-reply" title="Unified Inbox, WhatsApp AI Reply & Human Transfer / 统一收件箱、WhatsApp AI 回复与转人工" subtitle="AI suggestions are editable drafts only; admin must review before sending. / AI 建议只作为可编辑草稿，发送前必须人工审核。" items={inboxItems} />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <SocialTable id="organic-social-leads" title="Organic Social Leads & Conversion / 社媒自然线索与转化" subtitle="Organic social is separated from paid ads for attribution and ROI accuracy. / 自然社媒与付费广告分开归因，避免 ROI 混乱。" items={organicLeadItems} />
        <SocialTable id="schedule-publish-approval" title="Schedule, Publish Approval & Queue / 排期、发布审批与队列" subtitle="AI cannot auto-publish. Each platform version can be edited, regenerated, approved, rejected or scheduled. / AI 不可自动发布，每个平台版本可单独编辑、重新生成、批准、驳回或排期。" items={scheduleItems} />
      </div>

      <div id="multi-platform-preview-review" className="scroll-mt-32">
        <SocialPreview />
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <SectionCard title="Review & Comment Management / 评论与留言管理" subtitle="Import, reply, hide, escalate or convert comments to leads. / 导入、回复、隐藏、升级或转化评论为线索。">
          <div id="review-comment-management" className="scroll-mt-32 space-y-2 text-sm font-bold text-slate-600">
            <Link href="/social-media#google-facebook-review-import" className="block rounded-xl bg-slate-50 p-3 hover:bg-blue-50">Google / Facebook Review Import / 评论导入</Link>
            <Link href="/customer-center#review-approval-privacy-redaction" className="block rounded-xl bg-slate-50 p-3 hover:bg-blue-50">Send testimonial to Customer Center / 发送评价到客户中心</Link>
            <Link href="/social-media#organic-social-leads" className="block rounded-xl bg-slate-50 p-3 hover:bg-blue-50">Convert comment to lead / 评论转线索</Link>
          </div>
        </SectionCard>
        <SectionCard title="AI Social Content Studio / AI 社媒内容工作室" subtitle="Create editable drafts from uploaded materials, URL imports or media library assets. / 从本地素材、URL 或媒体库生成可编辑草稿。">
          <div id="ai-social-content-studio" className="scroll-mt-32 space-y-2 text-sm font-bold text-slate-600">
            <Link href="/website-management#media-library" className="block rounded-xl bg-slate-50 p-3 hover:bg-blue-50">Choose from Media Library / 从媒体库选择</Link>
            <Link href="/social-media#multi-platform-preview-review" className="block rounded-xl bg-slate-50 p-3 hover:bg-blue-50">Generate platform drafts / 生成平台草稿</Link>
            <Link href="/ai-intelligence#ai-social-assistant" className="block rounded-xl bg-slate-50 p-3 hover:bg-blue-50">Open AI Social Assistant / 打开 AI 社媒助手</Link>
          </div>
        </SectionCard>
        <SectionCard title="Social Logs & Performance / 社媒日志与表现" subtitle="Track replies, approvals, organic reach, engagement and conversion. / 跟踪回复、审批、自然触达、互动和转化。">
          <div id="social-performance" className="scroll-mt-32 space-y-2 text-sm font-bold text-slate-600">
            <Link href="/social-media#social-logs" className="block rounded-xl bg-slate-50 p-3 hover:bg-blue-50">Social Logs / 社媒日志</Link>
            <Link href="/dashboard#channel-performance-snapshot" className="block rounded-xl bg-slate-50 p-3 hover:bg-blue-50">Dashboard Channel Snapshot / 仪表盘渠道快照</Link>
            <Link href="/customer-center#lead-source-history" className="block rounded-xl bg-slate-50 p-3 hover:bg-blue-50">Customer source history / 客户来源历史</Link>
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
