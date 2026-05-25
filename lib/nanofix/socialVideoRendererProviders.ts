export type SocialVideoRendererProviderKey =
  | 'nanofix_internal_remotion_ffmpeg'
  | 'creatomate_api'
  | 'runway_api'
  | 'custom_webhook_renderer'
  | 'manual_final_video_upload';

export type SocialVideoRendererProvider = {
  key: SocialVideoRendererProviderKey;
  label: string;
  label_zh: string;
  display_label: string;
  display_label_zh: string;
  short_note: string;
  short_note_zh: string;
  priority: number;
  category: 'internal' | 'third_party_api' | 'custom' | 'manual';
  default_render_type: string;
  endpoint_env?: string;
  token_env?: string;
  supports_worker: boolean;
  requires_external_endpoint: boolean;
  recommended_for: string[];
  description: string;
};

export const SOCIAL_VIDEO_RENDERER_PROVIDERS: SocialVideoRendererProvider[] = [
  {
    key: 'nanofix_internal_remotion_ffmpeg',
    label: 'NANOFIX Internal Renderer - Remotion + FFmpeg',
    label_zh: 'NANOFIX 内部渲染器 - Remotion + FFmpeg',
    display_label: 'NANOFIX Internal Renderer - Remotion + FFmpeg · Best for automated branded video generation',
    display_label_zh: 'NANOFIX 内部渲染器 - Remotion + FFmpeg · 适合自动化品牌视频生成',
    short_note: 'Best for automated branded video generation',
    short_note_zh: '适合自动化品牌视频生成',
    priority: 1,
    category: 'internal',
    default_render_type: 'short_video',
    endpoint_env: 'NANOFIX_INTERNAL_VIDEO_RENDERER_ENDPOINT',
    token_env: 'NANOFIX_INTERNAL_VIDEO_RENDERER_TOKEN',
    supports_worker: true,
    requires_external_endpoint: true,
    recommended_for: ['Main default', 'TikTok', 'Instagram Reels', 'YouTube Shorts', 'brand templates', 'subtitles', 'watermark'],
    description: 'Recommended default provider. Use NANOFIX-owned templates, subtitles, logo watermark, CTA and multi-aspect output through a controlled Remotion/FFmpeg renderer.'
  },
  {
    key: 'creatomate_api',
    label: 'Creatomate API',
    label_zh: 'Creatomate API 模板视频生成',
    display_label: 'Creatomate API · Best for template-based batch videos and ads',
    display_label_zh: 'Creatomate API · 适合模板化批量视频和广告',
    short_note: 'Best for template-based batch videos and ads',
    short_note_zh: '适合模板化批量视频和广告',
    priority: 2,
    category: 'third_party_api',
    default_render_type: 'short_video',
    endpoint_env: 'NANOFIX_CREATOMATE_RENDERER_ENDPOINT',
    token_env: 'NANOFIX_CREATOMATE_RENDERER_TOKEN',
    supports_worker: true,
    requires_external_endpoint: true,
    recommended_for: ['template batch videos', 'ads', 'standardised campaign creatives'],
    description: 'Optional template-video provider for batch social ads and standardised campaign videos. Use through a NANOFIX-controlled wrapper endpoint.'
  },
  {
    key: 'runway_api',
    label: 'Runway API',
    label_zh: 'Runway API AI 视频辅助',
    display_label: 'Runway API · Best for AI creative clips and visual extension',
    display_label_zh: 'Runway API · 适合 AI 创意片段和视觉延展',
    short_note: 'Best for AI creative clips and visual extension',
    short_note_zh: '适合 AI 创意片段和视觉延展',
    priority: 3,
    category: 'third_party_api',
    default_render_type: 'short_video',
    endpoint_env: 'NANOFIX_RUNWAY_RENDERER_ENDPOINT',
    token_env: 'NANOFIX_RUNWAY_RENDERER_TOKEN',
    supports_worker: true,
    requires_external_endpoint: true,
    recommended_for: ['AI creative assistance', 'style extension', 'generated supporting clips'],
    description: 'Optional AI video provider for generated or assisted clips. It should not replace NANOFIX-owned source footage for factual repair proof.'
  },
  {
    key: 'custom_webhook_renderer',
    label: 'Custom Webhook Renderer',
    label_zh: '自定义 Webhook 渲染器',
    display_label: 'Custom Webhook Renderer · Best for custom automation or third-party wrappers',
    display_label_zh: '自定义 Webhook 渲染器 · 适合自定义自动化接口或第三方封装',
    short_note: 'Best for custom automation or third-party wrappers',
    short_note_zh: '适合自定义自动化接口或第三方封装',
    priority: 4,
    category: 'custom',
    default_render_type: 'short_video',
    endpoint_env: 'NANOFIX_CUSTOM_VIDEO_RENDERER_ENDPOINT',
    token_env: 'NANOFIX_CUSTOM_VIDEO_RENDERER_TOKEN',
    supports_worker: true,
    requires_external_endpoint: true,
    recommended_for: ['future Docker worker', 'Cloud Run', 'Supabase Edge Function', 'third-party wrapper'],
    description: 'Custom endpoint for a future worker or third-party wrapper. Must return the NANOFIX renderer contract response.'
  },
  {
    key: 'manual_final_video_upload',
    label: 'Manual Final Video Upload',
    label_zh: '人工上传最终视频',
    display_label: 'Manual Final Video Upload · Best for self-editing with CapCut, Canva or agency videos',
    display_label_zh: '人工上传最终视频 · 适合自己用剪映/Canva/外包剪辑后上传',
    short_note: 'Best for self-editing with CapCut, Canva or agency videos',
    short_note_zh: '适合自己用剪映/Canva/外包剪辑后上传',
    priority: 5,
    category: 'manual',
    default_render_type: 'short_video',
    supports_worker: false,
    requires_external_endpoint: false,
    recommended_for: ['CapCut', 'Canva', 'manual editing', 'agency edited final video'],
    description: 'Manual fallback. Admin uploads the final edited video and then runs normal review, final approval and scheduling. The worker must not call an external renderer for this provider.'
  }
];

export const DEFAULT_SOCIAL_VIDEO_RENDERER_PROVIDER: SocialVideoRendererProviderKey = 'nanofix_internal_remotion_ffmpeg';

export function normaliseRendererProvider(value: unknown): SocialVideoRendererProviderKey {
  const key = String(value || '').trim() as SocialVideoRendererProviderKey;
  return SOCIAL_VIDEO_RENDERER_PROVIDERS.some((provider) => provider.key === key) ? key : DEFAULT_SOCIAL_VIDEO_RENDERER_PROVIDER;
}

export function getSocialVideoRendererProvider(value: unknown): SocialVideoRendererProvider {
  const key = normaliseRendererProvider(value);
  return SOCIAL_VIDEO_RENDERER_PROVIDERS.find((provider) => provider.key === key) || SOCIAL_VIDEO_RENDERER_PROVIDERS[0];
}

export function getRendererEndpointForProvider(providerKey: unknown) {
  const provider = getSocialVideoRendererProvider(providerKey);
  const endpoint = provider.endpoint_env ? String(process.env[provider.endpoint_env] || '').trim() : '';
  const token = provider.token_env ? String(process.env[provider.token_env] || '').trim() : '';
  return { provider, endpoint, token };
}

export function rendererProviderOptionsForClient() {
  return SOCIAL_VIDEO_RENDERER_PROVIDERS.map((provider) => ({
    key: provider.key,
    label: provider.label,
    label_zh: provider.label_zh,
    display_label: provider.display_label,
    display_label_zh: provider.display_label_zh,
    short_note: provider.short_note,
    short_note_zh: provider.short_note_zh,
    priority: provider.priority,
    category: provider.category,
    default_render_type: provider.default_render_type,
    supports_worker: provider.supports_worker,
    requires_external_endpoint: provider.requires_external_endpoint,
    recommended_for: provider.recommended_for,
    description: provider.description
  }));
}
