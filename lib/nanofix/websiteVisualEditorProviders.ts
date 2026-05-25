export type WebsiteVisualEditorProviderKey =
  | 'nanofix_internal_visual_gif_editor'
  | 'canva_brand_template_editor'
  | 'adobe_firefly_express'
  | 'creatomate_visual_gif_api'
  | 'runway_image_gif_assist'
  | 'custom_visual_webhook_editor'
  | 'manual_final_asset_upload';

export type WebsiteVisualEditorProvider = {
  key: WebsiteVisualEditorProviderKey;
  label: string;
  label_zh: string;
  display_label: string;
  display_label_zh: string;
  short_note: string;
  short_note_zh: string;
  priority: number;
  category: 'internal' | 'third_party_api' | 'template' | 'custom' | 'manual';
  supports_worker: boolean;
  supports_gif: boolean;
  supports_text_image: boolean;
  requires_external_endpoint: boolean;
  endpoint_env?: string;
  token_env?: string;
  recommended_for: string[];
  description: string;
};

export const WEBSITE_VISUAL_EDITOR_PROVIDERS: WebsiteVisualEditorProvider[] = [
  {
    key: 'nanofix_internal_visual_gif_editor',
    label: 'NANOFIX Internal Website Visual/GIF Editor',
    label_zh: 'NANOFIX 内部官网图文/GIF 编辑器',
    display_label: 'NANOFIX Internal Website Visual/GIF Editor · Best for automated website graphics and GIFs',
    display_label_zh: 'NANOFIX 内部官网图文/GIF 编辑器 · 适合自动化官网图文和 GIF 生成',
    short_note: 'Best for automated website graphics and GIFs',
    short_note_zh: '适合自动化官网图文和 GIF 生成',
    priority: 1,
    category: 'internal',
    supports_worker: true,
    supports_gif: true,
    supports_text_image: true,
    requires_external_endpoint: true,
    endpoint_env: 'NANOFIX_INTERNAL_WEBSITE_VISUAL_EDITOR_ENDPOINT',
    token_env: 'NANOFIX_INTERNAL_WEBSITE_VISUAL_EDITOR_TOKEN',
    recommended_for: ['homepage hero graphics', 'service section images', 'CTA images', 'before/after website GIFs', 'brand consistent assets'],
    description: 'Recommended default provider. Uses NANOFIX brand-safe layouts, orange/grey website style, watermarks, CTA overlays and same-position preview data.'
  },
  {
    key: 'canva_brand_template_editor',
    label: 'Canva Brand Template Editor',
    label_zh: 'Canva 品牌模板编辑',
    display_label: 'Canva Brand Template Editor · Best for self-editing, brand templates and layout polish',
    display_label_zh: 'Canva 品牌模板编辑 · 适合自己编辑、品牌模板和排版优化',
    short_note: 'Best for self-editing, brand templates and layout polish',
    short_note_zh: '适合自己编辑、品牌模板和排版优化',
    priority: 2,
    category: 'template',
    supports_worker: false,
    supports_gif: true,
    supports_text_image: true,
    requires_external_endpoint: false,
    recommended_for: ['manual website images', 'template-based banners', 'brand layouts', 'staff edited assets'],
    description: 'Manual/template option for admin-edited website graphics. The final asset should be uploaded back into the CMS for preview and approval.'
  },
  {
    key: 'adobe_firefly_express',
    label: 'Adobe Firefly / Express',
    label_zh: 'Adobe Firefly / Express',
    display_label: 'Adobe Firefly / Express · Best for high-quality AI images and commercial-safe visual style',
    display_label_zh: 'Adobe Firefly / Express · 适合高质量 AI 图片和商业安全视觉风格',
    short_note: 'Best for high-quality AI images and commercial-safe visual style',
    short_note_zh: '适合高质量 AI 图片和商业安全视觉风格',
    priority: 3,
    category: 'third_party_api',
    supports_worker: true,
    supports_gif: false,
    supports_text_image: true,
    requires_external_endpoint: true,
    endpoint_env: 'NANOFIX_ADOBE_WEBSITE_VISUAL_EDITOR_ENDPOINT',
    token_env: 'NANOFIX_ADOBE_WEBSITE_VISUAL_EDITOR_TOKEN',
    recommended_for: ['high quality image generation', 'commercial visual style', 'article hero images', 'service explainer graphics'],
    description: 'Optional AI image provider for polished still images. Use through a NANOFIX-controlled wrapper endpoint.'
  },
  {
    key: 'creatomate_visual_gif_api',
    label: 'Creatomate Visual/GIF API',
    label_zh: 'Creatomate 图文/GIF 模板 API',
    display_label: 'Creatomate Visual/GIF API · Best for template-based batch graphics and GIFs',
    display_label_zh: 'Creatomate 图文/GIF 模板 API · 适合模板化批量图文和 GIF',
    short_note: 'Best for template-based batch graphics and GIFs',
    short_note_zh: '适合模板化批量图文和 GIF',
    priority: 4,
    category: 'third_party_api',
    supports_worker: true,
    supports_gif: true,
    supports_text_image: true,
    requires_external_endpoint: true,
    endpoint_env: 'NANOFIX_CREATOMATE_WEBSITE_VISUAL_EDITOR_ENDPOINT',
    token_env: 'NANOFIX_CREATOMATE_WEBSITE_VISUAL_EDITOR_TOKEN',
    recommended_for: ['batch website banners', 'campaign graphics', 'template GIFs', 'same-layout variations'],
    description: 'Template-based option for batch website graphics/GIFs. Use through a NANOFIX-controlled wrapper endpoint.'
  },
  {
    key: 'runway_image_gif_assist',
    label: 'Runway Image/GIF Assist',
    label_zh: 'Runway 图片/GIF AI 辅助',
    display_label: 'Runway Image/GIF Assist · Best for AI motion, GIF ideas and visual extension',
    display_label_zh: 'Runway 图片/GIF AI 辅助 · 适合 AI 动图创意和视觉延展',
    short_note: 'Best for AI motion, GIF ideas and visual extension',
    short_note_zh: '适合 AI 动图创意和视觉延展',
    priority: 5,
    category: 'third_party_api',
    supports_worker: true,
    supports_gif: true,
    supports_text_image: false,
    requires_external_endpoint: true,
    endpoint_env: 'NANOFIX_RUNWAY_WEBSITE_VISUAL_EDITOR_ENDPOINT',
    token_env: 'NANOFIX_RUNWAY_WEBSITE_VISUAL_EDITOR_TOKEN',
    recommended_for: ['AI GIF assistance', 'motion idea generation', 'creative visual extension'],
    description: 'Optional AI motion provider for GIF concepts or supporting animation. It should not replace factual NANOFIX project photos when proof is required.'
  },
  {
    key: 'custom_visual_webhook_editor',
    label: 'Custom Visual Webhook Editor',
    label_zh: '自定义图文/GIF Webhook 编辑器',
    display_label: 'Custom Visual Webhook Editor · Best for custom automation or third-party wrappers',
    display_label_zh: '自定义图文/GIF Webhook 编辑器 · 适合自定义自动化接口或第三方封装',
    short_note: 'Best for custom automation or third-party wrappers',
    short_note_zh: '适合自定义自动化接口或第三方封装',
    priority: 6,
    category: 'custom',
    supports_worker: true,
    supports_gif: true,
    supports_text_image: true,
    requires_external_endpoint: true,
    endpoint_env: 'NANOFIX_CUSTOM_WEBSITE_VISUAL_EDITOR_ENDPOINT',
    token_env: 'NANOFIX_CUSTOM_WEBSITE_VISUAL_EDITOR_TOKEN',
    recommended_for: ['future image worker', 'Cloud Run', 'Supabase Edge Function', 'third-party wrapper'],
    description: 'Custom endpoint for a future website visual editor worker. Must return safe asset output and preview metadata.'
  },
  {
    key: 'manual_final_asset_upload',
    label: 'Manual Final Image/GIF Upload',
    label_zh: '人工上传最终图片/GIF',
    display_label: 'Manual Final Image/GIF Upload · Best for self-edited final images or GIFs',
    display_label_zh: '人工上传最终图片/GIF · 适合自己编辑好图片/GIF 后上传',
    short_note: 'Best for self-edited final images or GIFs',
    short_note_zh: '适合自己编辑好图片/GIF 后上传',
    priority: 7,
    category: 'manual',
    supports_worker: false,
    supports_gif: true,
    supports_text_image: true,
    requires_external_endpoint: false,
    recommended_for: ['self-edited website images', 'agency final assets', 'Canva exported GIFs', 'approved project photos'],
    description: 'Manual fallback. Admin uploads the final edited asset into the CMS and previews it in the same website position before approval and publishing.'
  }
];

export const DEFAULT_WEBSITE_VISUAL_EDITOR_PROVIDER: WebsiteVisualEditorProviderKey = 'nanofix_internal_visual_gif_editor';

export function normaliseWebsiteVisualEditorProvider(value: unknown): WebsiteVisualEditorProviderKey {
  const key = String(value || '').trim() as WebsiteVisualEditorProviderKey;
  return WEBSITE_VISUAL_EDITOR_PROVIDERS.some((provider) => provider.key === key) ? key : DEFAULT_WEBSITE_VISUAL_EDITOR_PROVIDER;
}

export function getWebsiteVisualEditorProvider(value: unknown): WebsiteVisualEditorProvider {
  const key = normaliseWebsiteVisualEditorProvider(value);
  return WEBSITE_VISUAL_EDITOR_PROVIDERS.find((provider) => provider.key === key) || WEBSITE_VISUAL_EDITOR_PROVIDERS[0];
}

export function websiteVisualEditorOptionsForClient() {
  return WEBSITE_VISUAL_EDITOR_PROVIDERS.map((provider) => ({
    key: provider.key,
    label: provider.label,
    label_zh: provider.label_zh,
    display_label: provider.display_label,
    display_label_zh: provider.display_label_zh,
    short_note: provider.short_note,
    short_note_zh: provider.short_note_zh,
    priority: provider.priority,
    category: provider.category,
    supports_worker: provider.supports_worker,
    supports_gif: provider.supports_gif,
    supports_text_image: provider.supports_text_image,
    requires_external_endpoint: provider.requires_external_endpoint,
    endpoint_env: provider.endpoint_env || '',
    recommended_for: provider.recommended_for,
    description: provider.description
  }));
}
