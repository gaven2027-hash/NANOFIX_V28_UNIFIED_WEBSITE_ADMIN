import Link from 'next/link';
import { Badge } from './Badge';
import { SectionCard } from './SectionCard';

type Tone = 'blue' | 'green' | 'amber' | 'red' | 'gray' | 'cyan';

type WorkItem = {
  id: string;
  title: string;
  zh: string;
  status: string;
  owner: string;
  href: string;
  tone: Tone;
};

const cmsItems: WorkItem[] = [
  { id: 'CMS-HOME-001', title: 'Homepage hero text and CTA', zh: '首页大图文案与 CTA', status: 'editable', owner: 'Website Admin', href: '/website-management#homepage-content', tone: 'blue' },
  { id: 'CMS-SVC-006', title: 'Leak Detection service page', zh: '漏水检测服务页', status: 'draft', owner: 'Website Admin', href: '/website-management#service-page-content', tone: 'amber' },
  { id: 'CMS-GUIDE-014', title: 'No-hacking repair guide article', zh: '免敲砖维修 Guide 文章', status: 'seo_review', owner: 'SEO / AEO', href: '/website-management#guide-library', tone: 'cyan' },
  { id: 'CMS-FAQ-003', title: 'Warranty FAQ block', zh: '保修 FAQ 区块', status: 'ready_to_publish', owner: 'Admin', href: '/website-management#faq-tips', tone: 'green' }
];

const reviewItems: WorkItem[] = [
  { id: 'REV-HOME-005', title: 'Approved review for homepage carousel', zh: '首页滚动区已批准评价', status: 'featured', owner: 'Customer Center', href: '/website-management#customer-review-carousel', tone: 'green' },
  { id: 'REV-SVC-002', title: 'Service page testimonial block', zh: '服务页评价区块', status: 'needs_selection', owner: 'Website Admin', href: '/website-management#service-testimonials-block', tone: 'amber' },
  { id: 'REV-TRK-009', title: 'Track Record client testimonial', zh: '案例与保修页客户见证', status: 'public_visible', owner: 'Customer Center', href: '/website-management#client-testimonials-display', tone: 'blue' }
];

const intakeItems: WorkItem[] = [
  { id: 'FORM-NEW-021', title: 'Public repair submission', zh: '公开报修表单提交', status: 'new', owner: 'Operations', href: '/website-management#public-form-submissions', tone: 'red' },
  { id: 'UPLOAD-013', title: 'Customer uploaded leakage video', zh: '客户上传漏水视频', status: 'review_required', owner: 'Website Admin', href: '/website-management#public-upload-review', tone: 'amber' },
  { id: 'LEAD-ORG-018', title: 'Website organic enquiry', zh: '网站自然线索', status: 'qualified', owner: 'Operations', href: '/website-management#website-organic-leads', tone: 'green' },
  { id: 'LEAD-PAID-007', title: 'Paid landing page enquiry', zh: '广告落地页线索', status: 'attribution_checked', owner: 'Advertising', href: '/website-management#website-paid-landing-leads', tone: 'cyan' }
];

const publishingItems: WorkItem[] = [
  { id: 'PUB-001', title: 'Preview homepage change', zh: '预览首页修改', status: 'preview_ready', owner: 'Website Admin', href: '/website-management#preview', tone: 'blue' },
  { id: 'PUB-002', title: 'Publish approval required', zh: '需要发布审批', status: 'pending_approval', owner: 'Admin', href: '/website-management#publish-approval', tone: 'amber' },
  { id: 'VER-028', title: 'V28 homepage copy history', zh: 'V28 首页文案版本历史', status: 'restorable', owner: 'System', href: '/website-management#version-history', tone: 'gray' }
];

const mediaAssets = [
  { id: 'MEDIA-101', title: 'Homepage hero image', zh: '首页第一张大图', source: 'Media Library', permission: 'Website Admin + Super Admin', href: '/website-management#media-library' },
  { id: 'MEDIA-148', title: 'Customer leakage photos', zh: '客户漏水照片', source: 'Public Upload', permission: 'Operations + Customer Center', href: '/website-management#public-upload-review' },
  { id: 'MEDIA-203', title: 'Review photos with redaction', zh: '已脱敏评价图片', source: 'Customer Center', permission: 'Website Admin + Customer Center', href: '/website-management#customer-review-carousel' }
];

const quickActions = [
  { title: 'Edit website content', zh: '编辑网站内容', href: '/website-management#page-content' },
  { title: 'Review public forms', zh: '审核公开表单', href: '/website-management#public-form-submissions' },
  { title: 'Open media library', zh: '打开媒体库', href: '/website-management#media-library' },
  { title: 'Preview website', zh: '预览网站', href: '/website-management#preview' },
  { title: 'Approve publish', zh: '审批发布', href: '/website-management#publish-approval' },
  { title: 'View version history', zh: '查看版本历史', href: '/website-management#version-history' }
];

function WorkList({ title, subtitle, items, id }: { title: string; subtitle: string; items: WorkItem[]; id: string }) {
  return (
    <SectionCard title={title} subtitle={subtitle}>
      <div id={id} className="scroll-mt-32 overflow-hidden rounded-2xl border border-slate-200">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="p-3">Item / 条目</th>
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
                <td className="p-3 text-xs font-bold text-slate-600">{item.owner}</td>
                <td className="p-3"><Badge tone={item.tone}>{item.status}</Badge></td>
                <td className="p-3">
                  <Link href={item.href} className="rounded-xl bg-activeBlue px-3 py-2 text-xs font-black text-white hover:bg-blue-700">Open</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </SectionCard>
  );
}

export function WebsiteManagementWorkspace() {
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

      <SectionCard title="Website Management Control Panel / 网站后台控制台" subtitle="Editable CMS fields, public intake, media, reviews, preview and publish approval stay inside AdminShell. / CMS、公开入口、素材、评价、预览和发布审批都留在总后台内操作。">
        <div id="navigation-menu" className="scroll-mt-32 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {[
            { label: 'Editable pages', zh: '可编辑页面', value: '26', href: '/website-management#page-content', tone: 'blue' as Tone },
            { label: 'Pending forms', zh: '待处理表单', value: '5', href: '/website-management#public-form-submissions', tone: 'red' as Tone },
            { label: 'Media assets', zh: '媒体素材', value: '148', href: '/website-management#media-library', tone: 'cyan' as Tone },
            { label: 'Publish approvals', zh: '发布审批', value: '3', href: '/website-management#publish-approval', tone: 'amber' as Tone }
          ].map((card) => (
            <Link key={card.label} href={card.href} className="rounded-2xl border border-slate-200 bg-white p-4 transition hover:ring-1 hover:ring-activeBlue">
              <div className="flex items-start justify-between gap-2"><div><div className="text-sm font-black text-slate-900">{card.label}</div><div className="text-xs font-semibold text-slate-500">{card.zh}</div></div><Badge tone={card.tone}>Open</Badge></div>
              <div className="mt-3 text-3xl font-black text-slate-950">{card.value}</div>
            </Link>
          ))}
        </div>
      </SectionCard>

      <WorkList id="homepage-content" title="Website Content Editor / 网站内容编辑" subtitle="Homepage, service pages, guide, FAQ and SEO/AEO blocks are editable English/Chinese CMS records. / 首页、服务页、Guide、FAQ 和 SEO/AEO 区块均为可编辑中英 CMS 记录。" items={cmsItems} />

      <div className="grid gap-6 xl:grid-cols-2">
        <WorkList id="customer-review-carousel" title="Reviews & Testimonials Display / 客户评价与见证展示" subtitle="Only approved, consented and redacted reviews can be displayed on homepage, service pages and Track Record pages. / 只有已批准、已授权、已脱敏评价可展示到首页、服务页和案例页。" items={reviewItems} />
        <WorkList id="public-form-submissions" title="Public Forms, Uploads & Leads / 公开表单、上传与线索" subtitle="No-login repair intake, public uploads, organic leads and paid landing leads are separated for attribution. / 免登录报修、公开上传、自然线索和广告落地页线索分开归因。" items={intakeItems} />
      </div>

      <SectionCard title="Media Library / 媒体素材库" subtitle="All upload/edit modules can choose files from local computer, URL upload or backend Media Library with role-based access. / 所有上传与编辑模块支持本地上传、URL 上传、后台素材库选择，并受角色权限控制。">
        <div id="media-library" className="scroll-mt-32 grid gap-3 md:grid-cols-3">
          {mediaAssets.map((asset) => (
            <Link key={asset.id} href={asset.href} className="rounded-2xl border border-slate-200 bg-white p-4 transition hover:ring-1 hover:ring-activeBlue">
              <div className="text-xs font-black text-activeBlue">{asset.id}</div>
              <div className="mt-2 text-sm font-black text-slate-900">{asset.title}</div>
              <div className="text-xs font-semibold text-slate-500">{asset.zh}</div>
              <div className="mt-3 rounded-xl bg-slate-50 p-3 text-xs font-bold text-slate-600">
                <div>Source: {asset.source}</div>
                <div className="mt-1">Permission: {asset.permission}</div>
              </div>
            </Link>
          ))}
        </div>
      </SectionCard>

      <WorkList id="preview" title="Preview, Publish Approval & Version History / 预览、发布审批与版本历史" subtitle="Preview before publish, require approval, then keep restorable version history and publish audit logs. / 发布前预览、审批后发布，并保留可恢复版本历史和发布审计。" items={publishingItems} />

      <div className="grid gap-6 xl:grid-cols-3">
        <SectionCard title="Service Page Testimonials / 服务页评价区" subtitle="Match approved reviews by service category and property type. / 按服务类型和物业类型匹配已批准评价。">
          <div id="service-testimonials-block" className="scroll-mt-32 space-y-2 text-sm font-bold text-slate-600">
            <Link href="/customer-center#review-display-locations" className="block rounded-xl bg-slate-50 p-3 hover:bg-blue-50">Leak Detection testimonials / 漏水检测评价</Link>
            <Link href="/customer-center#review-display-locations" className="block rounded-xl bg-slate-50 p-3 hover:bg-blue-50">No-Hacking Repair testimonials / 免敲砖维修评价</Link>
            <Link href="/customer-center#review-display-locations" className="block rounded-xl bg-slate-50 p-3 hover:bg-blue-50">Waterproofing Works testimonials / 防水工程评价</Link>
          </div>
        </SectionCard>
        <SectionCard title="Track Record & Warranty Content / 案例与保修内容" subtitle="Project proof, warranty terms and public testimonials. / 工程案例、保修条款和公开客户见证。">
          <div id="track-record-warranty-content" className="scroll-mt-32 space-y-2 text-sm font-bold text-slate-600">
            <Link href="/website-management#client-testimonials-display" className="block rounded-xl bg-slate-50 p-3 hover:bg-blue-50">Client Testimonials / 客户见证</Link>
            <Link href="/website-management#page-content" className="block rounded-xl bg-slate-50 p-3 hover:bg-blue-50">Warranty Terms / 保修条款</Link>
            <Link href="/website-management#media-library" className="block rounded-xl bg-slate-50 p-3 hover:bg-blue-50">Before/After Assets / 前后对比素材</Link>
          </div>
        </SectionCard>
        <SectionCard title="SEO / AEO & AI Drafts / SEO/AEO 与 AI 草稿" subtitle="AI generated content remains editable and must be reviewed before publish. / AI 生成内容可编辑，发布前必须审核。">
          <div id="seo-aeo-library" className="scroll-mt-32 space-y-2 text-sm font-bold text-slate-600">
            <Link href="/website-management#ai-website-content-generator" className="block rounded-xl bg-slate-50 p-3 hover:bg-blue-50">AI Website Content Generator / AI 网站内容生成</Link>
            <Link href="/website-management#guide-library" className="block rounded-xl bg-slate-50 p-3 hover:bg-blue-50">Guide Library / Guide 内容库</Link>
            <Link href="/website-management#faq-tips" className="block rounded-xl bg-slate-50 p-3 hover:bg-blue-50">FAQ & Tips / FAQ 与维护建议</Link>
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
