export type SocialMaterialPack = {
  script_keywords?: string;
  source_video_urls?: string[];
  reference_video_urls?: string[];
  video_clip_urls?: string[];
  cover_image_url?: string;
  image_urls?: string[];
  service_area?: string;
  cta?: string;
  reference_notes?: string;
  notes?: string;
  uploaded_materials?: Array<Record<string, unknown>>;
};

export type RenderSettings = {
  output_format?: string;
  aspect_ratio?: string;
  duration_seconds?: number;
  include_subtitles?: boolean;
  include_logo_watermark?: boolean;
  voiceover_required?: boolean;
  background_music_note?: string;
  admin_review_required?: boolean;
  ai_auto_publish_allowed?: boolean;
  render_type?: string;
  [key: string]: unknown;
};

const platformDefaults: Record<string, { aspect_ratio: string; duration_seconds: number; render_type: string; safe_title_area: string }> = {
  tiktok: { aspect_ratio: '9:16', duration_seconds: 30, render_type: 'short_video', safe_title_area: 'top 15% and bottom 18% clear for UI overlays' },
  youtube_shorts: { aspect_ratio: '9:16', duration_seconds: 30, render_type: 'short_video', safe_title_area: 'bottom 20% clear for Shorts UI' },
  instagram: { aspect_ratio: '9:16', duration_seconds: 30, render_type: 'reel', safe_title_area: 'top 12% and bottom 18% clear for Reels UI' },
  facebook: { aspect_ratio: '4:5', duration_seconds: 35, render_type: 'reel', safe_title_area: 'center text safe zone' },
  xiaohongshu: { aspect_ratio: '3:4', duration_seconds: 45, render_type: 'short_video', safe_title_area: 'cover-title friendly center area' },
  linkedin: { aspect_ratio: '1:1', duration_seconds: 45, render_type: 'long_video', safe_title_area: 'professional caption-safe center area' },
  carousell_services: { aspect_ratio: '1:1', duration_seconds: 30, render_type: 'listing_video', safe_title_area: 'listing thumbnail center safe zone' },
  website_blog: { aspect_ratio: '16:9', duration_seconds: 60, render_type: 'blog_embed', safe_title_area: 'landscape blog embed safe zone' },
  default: { aspect_ratio: '9:16', duration_seconds: 30, render_type: 'short_video', safe_title_area: 'mobile safe zone' }
};

function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.map((item) => String(item || '').trim()).filter(Boolean) : [];
}

function normalisePack(value: unknown): SocialMaterialPack {
  const pack = value && typeof value === 'object' ? value as Record<string, unknown> : {};
  return {
    script_keywords: String(pack.script_keywords || '').trim(),
    source_video_urls: asStringArray(pack.source_video_urls),
    reference_video_urls: asStringArray(pack.reference_video_urls),
    video_clip_urls: asStringArray(pack.video_clip_urls),
    cover_image_url: String(pack.cover_image_url || '').trim(),
    image_urls: asStringArray(pack.image_urls),
    service_area: String(pack.service_area || 'Singapore').trim(),
    cta: String(pack.cta || 'WhatsApp NANOFIX for photo consultation').trim(),
    reference_notes: String(pack.reference_notes || '').trim(),
    notes: String(pack.notes || '').trim(),
    uploaded_materials: Array.isArray(pack.uploaded_materials) ? pack.uploaded_materials as Array<Record<string, unknown>> : []
  };
}

function normaliseSettings(value: unknown): RenderSettings {
  return value && typeof value === 'object' ? value as RenderSettings : {};
}

function deriveAssets(pack: SocialMaterialPack) {
  return {
    primary_source_videos: pack.source_video_urls || [],
    reference_videos: pack.reference_video_urls || [],
    editable_video_clips: pack.video_clip_urls || [],
    cover_image: pack.cover_image_url || null,
    supporting_images: pack.image_urls || [],
    uploaded_materials: pack.uploaded_materials || []
  };
}

function buildTimeline(pack: SocialMaterialPack, duration: number) {
  const clips = pack.video_clip_urls || [];
  const sourceVideos = pack.source_video_urls || [];
  const images = pack.image_urls || [];
  const hasClips = clips.length > 0;
  const hasSource = sourceVideos.length > 0;
  const timeline = [];

  timeline.push({ segment: 'hook', start_second: 0, end_second: Math.min(4, duration), source: hasClips ? clips[0] : hasSource ? sourceVideos[0] : images[0] || null, overlay: 'Problem hook + service pain point' });
  timeline.push({ segment: 'diagnosis', start_second: Math.min(4, duration), end_second: Math.min(12, duration), source: hasClips ? clips[1] || clips[0] : hasSource ? sourceVideos[0] : images[1] || images[0] || null, overlay: 'Leak source / inspection proof' });
  timeline.push({ segment: 'repair_process', start_second: Math.min(12, duration), end_second: Math.min(Math.max(duration - 7, 13), duration), source: hasClips ? clips[2] || clips[0] : hasSource ? sourceVideos[0] : images[2] || images[0] || null, overlay: 'No-hacking repair process / method proof' });
  timeline.push({ segment: 'result_cta', start_second: Math.min(Math.max(duration - 7, 0), duration), end_second: duration, source: pack.cover_image_url || images[0] || (hasClips ? clips[0] : hasSource ? sourceVideos[0] : null), overlay: pack.cta || 'Contact NANOFIX' });

  return timeline.filter((item) => item.start_second < item.end_second);
}

function buildWarnings(pack: SocialMaterialPack) {
  const warnings: string[] = [];
  if (!pack.source_video_urls?.length && !pack.video_clip_urls?.length) warnings.push('No source video or video clips provided. Add NANOFIX-owned footage before rendering.');
  if (pack.reference_video_urls?.length && !pack.reference_notes) warnings.push('Reference videos are provided but reference_notes is empty. Explain what style, pacing or caption approach should be learned.');
  if (!pack.cover_image_url && !pack.image_urls?.length) warnings.push('No cover/supporting image provided. Add a cover image for better platform thumbnails.');
  if (!pack.script_keywords) warnings.push('script_keywords is empty. Add keywords to improve hook, subtitle and title generation.');
  return warnings;
}

export function buildSocialVideoRenderPlan(input: { platform?: string; title?: string; material_pack?: unknown; render_settings?: unknown }) {
  const platform = String(input.platform || 'default');
  const defaults = platformDefaults[platform] || platformDefaults.default;
  const pack = normalisePack(input.material_pack);
  const settings = normaliseSettings(input.render_settings);
  const duration = Number(settings.duration_seconds || defaults.duration_seconds);
  const warnings = buildWarnings(pack);

  return {
    plan_version: 'v28.1.3-render-plan-1',
    plan_status: warnings.length ? 'needs_material_review' : 'ready_for_worker',
    platform,
    title: String(input.title || 'NANOFIX video render plan'),
    render_type: String(settings.render_type || defaults.render_type),
    output: {
      output_format: String(settings.output_format || 'mp4'),
      aspect_ratio: String(settings.aspect_ratio || defaults.aspect_ratio),
      duration_seconds: duration,
      safe_title_area: defaults.safe_title_area
    },
    assets: deriveAssets(pack),
    timeline: buildTimeline(pack, duration),
    text_layers: {
      hook_keywords: pack.script_keywords || '',
      service_area: pack.service_area || 'Singapore',
      cta: pack.cta || 'WhatsApp NANOFIX for photo consultation',
      subtitles_required: settings.include_subtitles !== false,
      logo_watermark_required: settings.include_logo_watermark !== false,
      voiceover_required: settings.voiceover_required === true,
      background_music_note: String(settings.background_music_note || '')
    },
    reference_guidance: {
      reference_video_urls: pack.reference_video_urls || [],
      reference_notes: pack.reference_notes || '',
      usage_rule: 'Reference videos are style references only and must not be treated as directly reusable NANOFIX source footage.'
    },
    safety: {
      admin_review_required: true,
      ai_auto_publish_allowed: false,
      requires_final_human_approval: true
    },
    warnings,
    created_at: new Date().toISOString()
  };
}
