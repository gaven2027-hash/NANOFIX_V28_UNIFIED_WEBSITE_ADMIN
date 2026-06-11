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

const quickActions = [
  { title: 'Homepage editor', zh: '首页编辑', href: '/website-management#navigation-homepage' },
  { title: 'Service pages', zh: '服务页面', href: '/website-management#service-pages' },
  { title: 'Forms & submissions', zh: '表单与报修提交', href: '/website-management#forms-submissions' },
  { title: 'Media library', zh: '媒体素材库', href: '/website-management#media-library' },
  { title: 'SEO / AEO', zh: 'SEO / AEO', href: '/website-management#seo-aeo-analytics' },
  { title: 'Publish & rollback', zh: '发布与回滚', href: '/website-management#preview-publish-version' }
];

const serviceCmsItems: WorkItem[] = [
  { id: 'CMS-HOME-001', title: 'Homepage hero text, CTA and service cards', zh: '首页大图文案、CTA 与服务卡片', status: 'draft_editable', owner: 'Website Admin', href: '/website-management#navigation-homepage', tone: 'blue' },
  { id: 'CMS-SVC-006', title: 'Leak Detection service page', zh: '漏水检测服务页', status: 'needs_field_mapping', owner: 'Website Admin', href: '/website-management#service-pages', tone: 'amber' },
  { id: 'CMS-SVC-012', title: 'No-Hacking Repair service page', zh: '免敲砖维修服务页', status: 'needs_media_binding', owner: 'Website Admin', href: '/website-management#service-pages', tone: 'amber' },
  { id: 'CMS-SVC-018', title: 'Waterproofing Works service page', zh: '防水工程服务页', status: 'draft_editable', owner: 'Website Admin', href: '/website-management#service-pages', tone: 'blue' }
];

const guideItems: WorkItem[] = [
  { id: 'CMS-GUIDE-014', title: 'No-hacking repair guide article', zh: '免敲砖维修 Guide 文章', status: 'seo_review', owner: 'SEO / AEO', href: '/website-management#guide-faq-tips', tone: 'cyan' },
  { id: 'CMS-FAQ-003', title: 'Warranty FAQ block', zh: '保修 FAQ 区块', status: 'ready_to_publish', owner: 'Admin', href: '/website-management#guide-faq-tips', tone: 'green' },
  { id: 'AEO-FAQ-009', title: 'Answer-engine repair questions', zh: 'AEO 报修问答', status: 'draft_editable', owner: 'SEO / AEO', href: '/website-management#seo-aeo-analytics', tone: 'blue' }
];

const trackRecordItems: WorkItem[] = [
  { id: 'TRK-CASE-005', title: 'Residential before / after case', zh: '住宅维修前后对比案例', status: 'media_required', owner: 'Website Admin', href: '/website-management#track-record-warranty', tone: 'amber' },
  { id: 'TRK-WAR-002', title: 'Warranty terms content block', zh: '保修条款内容区块', status: 'draft_editable', owner: 'Admin', href: '/website-management#track-record-warranty', tone: 'blue' },
  { id: 'REV-TRK-009', title: 'Track Record client testimonial', zh: '案例与保修页客户见证', status: 'public_visible', owner: 'Customer Center', href: '/website-management#track-record-warranty', tone: 'green' }
];

const intakeItems: WorkItem[] = [
  { id: 'FORM-NEW-021', title: 'Public repair submission', zh: '公开报修表单提交', status: 'new', owner: 'Operations', href: '/website-management#forms-submissions', tone: 'red' },
  { id: 'UPLOAD-013', title: 'Customer uploaded leakage video', zh: '客户上传漏水视频', status: 'review_required', owner: 'Website Admin', href: '/website-management#forms-submissions', tone: 'amber' },
  { id: 'LEAD-ORG-018', title: 'Website organic enquiry', zh: '网站自然线索', status: 'qualified', owner: 'Operations', href: '/website-management#forms-submissions', tone: 'green' },
  { id: 'LEAD-PAID-007', title: 'Paid landing page enquiry', zh: '广告落地页线索', status: 'attribution_checked', owner: 'Advertising', href: '/website-management#forms-submissions', tone: 'cyan' }
];

const publishingItems: WorkItem[] = [
  { id: 'PUB-001', title: 'Preview homepage change', zh: '预览首页修改', status: 'preview_ready', owner: 'Website Admin', href: '/website-management#preview-publish-version', tone: 'blue' },
  { id: 'PUB-002', title: 'Publish approval required', zh: '需要发布审批', status: 'pending_approval', owner: 'Admin', href: '/website-management#preview-publish-version', tone: 'amber' },
  { id: 'VER-028', title: 'V28 homepage copy history', zh: 'V28 首页文案版本历史', status: 'restorable', owner: 'System', href: '/website-management#preview-publish-version', tone: 'gray' }
];

const mediaAssets = [
  { id: 'MEDIA-101', title: 'Homepage hero image', zh: '首页第一张大图', source: 'Media Library', permission: 'Website Admin + Super Admin', href: '/website-management#media-library' },
  { id: 'MEDIA-148', title: 'Customer leakage photos', zh: '客户漏水照片', source: 'Public Upload', permission: 'Operations + Customer Center', href: '/website-management#forms-submissions' },
  { id: 'MEDIA-203', title: 'Review photos with redaction', zh: '已脱敏评价图片', source: 'Customer Center', permission: 'Website Admin + Customer Center', href: '/website-management#track-record-warranty' }
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
                  <Link href={item.href} scroll={false} className="rounded-xl bg-activeBlue px-3 py-2 text-xs font-black text-white hover:bg-blue-700">Open</Link>
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
          <Link key={action.href} href={action.href} scroll={false} className="rounded-3xl bg-gradient-to-br from-sky-400 via-cyan-300 to-blue-500 p-4 text-white shadow-soft transition hover:-translate-y-0.5">
            <div className="text-sm font-black">{action.title}</div>
            <div className="mt-1 text-xs font-bold text-white/80">{action.zh}</div>
          </Link>
        ))}
      </section>

      <SectionCard title="V28.7 Website CMS Operating Map / V28.7 网站 CMS 操作地图" subtitle="The old scattered CMS entries are now merged into eight practical entries: homepage, service pages, track record, guide, forms, media, SEO/AEO and publishing. / 旧的零散 CMS 入口已合并为首页、服务页、案例、指南、表单、媒体、SEO/AEO 和发布八个真实入口。">
        <div id="navigation-homepage" className="scroll-mt-32 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {[
            { label: 'Homepage fields', zh: '首页字段', value: 'Banner / CTA / Cards', href: '/website-management#navigation-homepage', tone: 'blue' as Tone },
            { label: 'Service page fields', zh: '服务页字段', value: 'Text / FAQ / CTA', href: '/website-management#service-pages', tone: 'amber' as Tone },
            { label: 'Media binding', zh: '媒体绑定', value: 'Images / Video', href: '/website-management#media-library', tone: 'cyan' as Tone },
            { label: 'Publish control', zh: '发布控制', value: 'Preview / Rollback', href: '/website-management#preview-publish-version', tone: 'green' as Tone }
          ].map((card) => (
            <Link key={card.label} href={card.href} scroll={false} className="rounded-2xl border border-slate-200 bg-white p-4 transition hover:ring-1 hover:ring-activeBlue">
              <div className="flex items-start justify-between gap-2"><div><div className="text-sm font-black text-slate-900">{card.label}</div><div className="text-xs font-semibold text-slate-500">{card.zh}</div></div><Badge tone={card.tone}>V28.7</Badge></div>
              <div className="mt-3 text-lg font-black text-slate-950">{card.value}</div>
            </Link>
          ))}
        </div>
      </SectionCard>

      <WorkList id="service-pages" title="Service Pages Field Editor / 服务页面字段编辑" subtitle="Edit homepage and service page text, CTA, FAQ and bilingual CMS fields before the later real field editor upgrade. / 在后续真实字段编辑器升级前，先统一首页与服务页文字、CTA、FAQ 和中英文字段入口。" items={serviceCmsItems} />

      <div className="grid gap-6 xl:grid-cols-2">
        <WorkList id="track-record-warranty" title="Track Record & Warranty / 案例与保修" subtitle="Project proof, before/after media, warranty terms and client testimonials. / 工程案例、前后对比素材、保修条款和客户见证。" items={trackRecordItems} />
        <WorkList id="guide-faq-tips" title="Guide, FAQ & Tips / 指南、问答与维护建议" subtitle="Guide articles, FAQ, care tips, SEO questions and AEO answers remain human-reviewed before publishing. / Guide 文章、FAQ、维护建议、SEO 问答和 AEO 答案发布前必须人工审核。" items={guideItems} />
      </div>

      <WorkList id="forms-submissions" title="Forms & Submissions / 表单与报修提交" subtitle="No-login repair intake, public uploads, organic leads and paid landing leads are separated for attribution. / 免登录报修、公开上传、自然线索和广告落地页线索分开归因。" items={intakeItems} />

      <SectionCard title="Media Library / 媒体素材库" subtitle="Upload, compress, crop, replace and bind images or videos to website page blocks. / 上传、压缩、裁剪、替换并绑定图片或视频到网站页面区块。">
        <div id="media-library" className="scroll-mt-32 grid gap-3 md:grid-cols-3">
          {mediaAssets.map((asset) => (
            <Link key={asset.id} href={asset.href} scroll={false} className="rounded-2xl border border-slate-200 bg-white p-4 transition hover:ring-1 hover:ring-activeBlue">
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

      <SectionCard title="SEO / AEO & Analytics / SEO、AEO 与数据" subtitle="Metadata, schema, FAQ schema, keywords, page performance and AI drafts are consolidated here. / Meta、Schema、FAQ Schema、关键词、页面表现和 AI 草稿统一到这里。">
        <div id="seo-aeo-analytics" className="scroll-mt-32 grid gap-3 md:grid-cols-3">
          <Link href="/website-management#guide-faq-tips" scroll={false} className="rounded-2xl bg-slate-50 p-4 text-sm font-black text-slate-700 hover:bg-blue-50">Guide SEO Drafts / Guide SEO 草稿</Link>
          <Link href="/website-management#guide-faq-tips" scroll={false} className="rounded-2xl bg-slate-50 p-4 text-sm font-black text-slate-700 hover:bg-blue-50">FAQ Schema / FAQ 结构化数据</Link>
          <Link href="/ai-intelligence#website-ai-content" scroll={false} className="rounded-2xl bg-slate-50 p-4 text-sm font-black text-slate-700 hover:bg-blue-50">Website AI Drafts / 网站 AI 草稿</Link>
        </div>
      </SectionCard>

      <WorkList id="preview-publish-version" title="Preview, Publish Approval & Version History / 预览、发布审批与版本历史" subtitle="Preview before publish, require approval, then keep restorable version history and publish audit logs. / 发布前预览、审批后发布，并保留可恢复版本历史和发布审计。" items={publishingItems} />
    </div>
  );
}
