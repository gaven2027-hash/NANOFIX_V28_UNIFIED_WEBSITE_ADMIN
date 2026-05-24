export type WebsiteSectionKey =
  | 'navigation-menu'
  | 'page-content'
  | 'home-content'
  | 'landing-pages'
  | 'guide-library'
  | 'seo-aeo-library'
  | 'ai-content-generator'
  | 'ai-draft-review'
  | 'preview'
  | 'publish'
  | 'forms'
  | 'website-leads'
  | 'media-library'
  | 'schema-faq-internal-links'
  | 'qr-display-disabled';

export type WebsiteSectionConfig = {
  key: WebsiteSectionKey;
  href: string;
  title: string;
  zh: string;
  tab: 'pages' | 'blocks' | 'publish' | 'audit';
  defaultRoutePath?: string;
  blockType?: string;
  helper: string;
};

export const websiteSections: WebsiteSectionConfig[] = [
  { key: 'navigation-menu', href: '/website-management/navigation-menu', title: 'Navigation & Menu', zh: '导航与菜单', tab: 'blocks', defaultRoutePath: '/', blockType: 'json', helper: 'Manage navigation labels, menu order and route mapping as CMS JSON blocks.' },
  { key: 'page-content', href: '/website-management/page-content', title: 'Page Content', zh: '页面内容', tab: 'pages', helper: 'Create and edit route-level website pages, title, description and metadata.' },
  { key: 'home-content', href: '/website-management/home-content', title: 'Home Content', zh: '首页内容', tab: 'blocks', defaultRoutePath: '/', blockType: 'section', helper: 'Manage homepage blocks such as hero, carousel cards, Why Choose Us and CTA copy.' },
  { key: 'landing-pages', href: '/website-management/landing-pages', title: 'Service / Landing Pages', zh: '服务/落地页', tab: 'pages', helper: 'Manage service and landing pages for Leak Detection, No-Hacking Repair and Waterproofing Works.' },
  { key: 'guide-library', href: '/website-management/guide-library', title: 'Guide Library', zh: 'Guide 内容库', tab: 'blocks', defaultRoutePath: '/guide', blockType: 'section', helper: 'Manage guide, FAQ, maintenance tips and problem diagnosis content blocks.' },
  { key: 'seo-aeo-library', href: '/website-management/seo-aeo-library', title: 'SEO / AEO Library', zh: 'SEO/AEO 内容库', tab: 'pages', helper: 'Manage SEO title, description, canonical path and AEO-friendly metadata.' },
  { key: 'ai-content-generator', href: '/website-management/ai-content-generator', title: 'AI Website Content Generator', zh: 'AI 网站内容生成', tab: 'blocks', blockType: 'json', helper: 'Create AI-assisted draft blocks. AI output stays draft until admin review and publish.' },
  { key: 'ai-draft-review', href: '/website-management/ai-draft-review', title: 'AI Draft Review', zh: 'AI 草稿审核', tab: 'blocks', blockType: 'section', helper: 'Review, edit, approve or reject AI-generated website content blocks.' },
  { key: 'preview', href: '/website-management/preview', title: 'Preview', zh: '预览', tab: 'blocks', helper: 'Preview CMS block data before publishing without changing public website layout.' },
  { key: 'publish', href: '/website-management/publish', title: 'Publish', zh: '发布', tab: 'publish', helper: 'Publish route snapshots and keep version records for rollback and audit.' },
  { key: 'forms', href: '/website-management/forms', title: 'Forms', zh: '表单', tab: 'blocks', blockType: 'form', helper: 'Manage website form copy, field schema notes and submission routing rules.' },
  { key: 'website-leads', href: '/website-management/website-leads', title: 'Website Leads', zh: '网站线索', tab: 'blocks', blockType: 'json', helper: 'Manage CMS instructions for website lead capture and intake handoff.' },
  { key: 'media-library', href: '/website-management/media-library', title: 'Media Library', zh: '媒体库', tab: 'blocks', blockType: 'json', helper: 'Manage media metadata and placement notes. Storage upload workflow can be connected in the next phase.' },
  { key: 'schema-faq-internal-links', href: '/website-management/schema-faq-internal-links', title: 'Schema / FAQ / Internal Links', zh: '结构化数据/FAQ/内链', tab: 'blocks', blockType: 'seo', helper: 'Manage FAQ schema, service schema, internal link map and AEO answer blocks.' },
  { key: 'qr-display-disabled', href: '/website-management/qr-display-disabled', title: 'QR Display Disabled on Public Website', zh: '公共网站禁止显示二维码', tab: 'blocks', blockType: 'json', helper: 'Keep public QR display disabled while allowing backend QR settings and download workflows.' }
];

export function getWebsiteSection(key: string | undefined) {
  return websiteSections.find((section) => section.key === key) || null;
}
