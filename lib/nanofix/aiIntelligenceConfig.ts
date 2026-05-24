export type AiIntelligenceSectionKey =
  | 'global-web-search'
  | 'ai-website-assistant'
  | 'ai-social-assistant'
  | 'ai-conversation-intelligence'
  | 'lead-discovery'
  | 'ai-rules'
  | 'ai-safety-rules'
  | 'approved-faq-knowledge-base'
  | 'human-handoff-queue'
  | 'ai-logs'
  | 'usage-cost'
  | 'ai-alerts'
  | 'material-ai-suggestions'
  | 'quotation-ai-assist'
  | 'invoice-ai-assist'
  | 'ai-default-save-as-draft'
  | 'no-auto-publish-no-auto-approve';

export type AiIntelligenceSectionConfig = {
  key: AiIntelligenceSectionKey;
  href: string;
  title: string;
  zh: string;
  tab: 'records' | 'drafts' | 'logs' | 'versions' | 'search';
  category: string;
  helper: string;
};

export const aiIntelligenceSections: AiIntelligenceSectionConfig[] = [
  { key: 'global-web-search', href: '/ai-intelligence/global-web-search', title: 'Global Web Search', zh: '全网搜索中心', tab: 'search', category: 'search', helper: 'Manage external research records, keyword opportunities, competitor notes and AEO search logs.' },
  { key: 'ai-website-assistant', href: '/ai-intelligence/ai-website-assistant', title: 'AI Website Assistant', zh: 'AI 网站助手', tab: 'drafts', category: 'website', helper: 'Create and review AI-assisted website content drafts. AI output stays draft until admin review.' },
  { key: 'ai-social-assistant', href: '/ai-intelligence/ai-social-assistant', title: 'AI Social Assistant', zh: 'AI 社媒助手', tab: 'drafts', category: 'social', helper: 'Create and review AI-assisted social content drafts with no auto-publish.' },
  { key: 'ai-conversation-intelligence', href: '/ai-intelligence/ai-conversation-intelligence', title: 'AI Conversation Intelligence', zh: 'AI 对话智能', tab: 'records', category: 'conversation', helper: 'Configure conversation analysis, intent detection and escalation rules.' },
  { key: 'lead-discovery', href: '/ai-intelligence/lead-discovery', title: 'Lead Discovery', zh: '获客线索发现', tab: 'records', category: 'lead_discovery', helper: 'Manage AI-assisted lead discovery ideas, sources and conversion notes.' },
  { key: 'ai-rules', href: '/ai-intelligence/ai-rules', title: 'AI Rules', zh: 'AI 规则', tab: 'records', category: 'rules', helper: 'Manage AI operating rules, prompt constraints, approval policies and module-specific instructions.' },
  { key: 'ai-safety-rules', href: '/ai-intelligence/ai-safety-rules', title: 'AI Safety Rules', zh: 'AI 安全规则', tab: 'records', category: 'safety', helper: 'Manage safety rules, risk levels, blocked actions, no-auto-approve and no-auto-publish constraints.' },
  { key: 'approved-faq-knowledge-base', href: '/ai-intelligence/approved-faq-knowledge-base', title: 'Approved FAQ Knowledge Base', zh: '已审核 FAQ 知识库', tab: 'records', category: 'knowledge_base', helper: 'Manage approved FAQ answers and reusable knowledge snippets for website/social assistants.' },
  { key: 'human-handoff-queue', href: '/ai-intelligence/human-handoff-queue', title: 'Human Handoff Queue', zh: '转人工队列', tab: 'records', category: 'handoff', helper: 'Review AI-flagged conversations, risk notes and handoff actions requiring human review.' },
  { key: 'ai-logs', href: '/ai-intelligence/ai-logs', title: 'AI Logs', zh: 'AI 日志', tab: 'logs', category: 'logs', helper: 'Search AI logs by module, prompt type, risk level, confidence and decision.' },
  { key: 'usage-cost', href: '/ai-intelligence/usage-cost', title: 'Usage & Cost', zh: '用量与成本', tab: 'records', category: 'cost', helper: 'Record and review AI usage/cost controls, budget thresholds and optimisation notes.' },
  { key: 'ai-alerts', href: '/ai-intelligence/ai-alerts', title: 'AI Alerts', zh: 'AI 预警', tab: 'records', category: 'alerts', helper: 'Manage AI alerts, high-risk events, approval warnings and cost threshold reminders.' },
  { key: 'material-ai-suggestions', href: '/ai-intelligence/material-ai-suggestions', title: 'Material AI Suggestions', zh: '材料 AI 建议', tab: 'records', category: 'materials', helper: 'Manage AI material suggestions, supplier notes and local price/cost references.' },
  { key: 'quotation-ai-assist', href: '/ai-intelligence/quotation-ai-assist', title: 'Quotation AI Assist', zh: '报价 AI 辅助', tab: 'drafts', category: 'quotation', helper: 'Create and review quotation assistance drafts. Admin review is required before quotation use.' },
  { key: 'invoice-ai-assist', href: '/ai-intelligence/invoice-ai-assist', title: 'Invoice AI Assist', zh: '发票 AI 辅助', tab: 'drafts', category: 'invoice', helper: 'Create and review invoice wording, payment note and receipt assistance drafts.' },
  { key: 'ai-default-save-as-draft', href: '/ai-intelligence/ai-default-save-as-draft', title: 'AI Default Save as Draft', zh: 'AI 默认保存草稿', tab: 'records', category: 'policy', helper: 'Enforce AI-generated outputs to save as drafts first by default.' },
  { key: 'no-auto-publish-no-auto-approve', href: '/ai-intelligence/no-auto-publish-no-auto-approve', title: 'No Auto Publish / No Auto Approve', zh: '禁止自动发布/自动审批', tab: 'records', category: 'policy', helper: 'Manage hard policy: AI cannot auto-publish, auto-send, or auto-approve without admin action.' }
];

export function getAiIntelligenceSection(key: string | undefined) {
  return aiIntelligenceSections.find((section) => section.key === key) || null;
}
