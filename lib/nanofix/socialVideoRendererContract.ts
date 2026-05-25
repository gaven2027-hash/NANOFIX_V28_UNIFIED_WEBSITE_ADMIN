export type SocialVideoRendererResult = {
  ok: true;
  renderer_name: string;
  renderer_version?: string;
  render_job_id: string;
  output_video_url?: string;
  output_storage_path?: string;
  output_mime_type: string;
  output_file_size_bytes?: number;
  duration_seconds?: number;
  width?: number;
  height?: number;
  thumbnail_url?: string;
  thumbnail_storage_path?: string;
  checksum_sha256?: string;
  rendered_at: string;
  warnings?: string[];
  metadata?: Record<string, unknown>;
  admin_review_required: true;
  ai_auto_publish_allowed: false;
};

export type RendererValidationResult = {
  valid: boolean;
  errors: string[];
  normalized?: SocialVideoRendererResult;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function nonEmpty(value: unknown) {
  return typeof value === 'string' && value.trim().length > 0;
}

function optionalNumber(value: unknown) {
  return value === undefined || value === null || (typeof value === 'number' && Number.isFinite(value) && value >= 0);
}

function optionalPositiveInteger(value: unknown) {
  return value === undefined || value === null || (typeof value === 'number' && Number.isInteger(value) && value > 0);
}

function arrayOfStrings(value: unknown) {
  return value === undefined || value === null || (Array.isArray(value) && value.every((item) => typeof item === 'string'));
}

function normaliseWarnings(value: unknown) {
  return Array.isArray(value) ? value.map((item) => String(item)).filter(Boolean) : [];
}

function safeMetadata(value: unknown) {
  return isRecord(value) ? value : {};
}

export function validateSocialVideoRendererResult(value: unknown, expectedRenderJobId: string): RendererValidationResult {
  const errors: string[] = [];
  if (!isRecord(value)) return { valid: false, errors: ['Renderer result must be a JSON object.'] };

  if (value.ok !== true) errors.push('Renderer result must include ok: true.');
  if (!nonEmpty(value.renderer_name)) errors.push('renderer_name is required.');
  if (!nonEmpty(value.render_job_id)) errors.push('render_job_id is required.');
  if (String(value.render_job_id || '') !== expectedRenderJobId) errors.push('render_job_id does not match the queued job.');
  if (!nonEmpty(value.output_video_url) && !nonEmpty(value.output_storage_path)) errors.push('Either output_video_url or output_storage_path is required.');
  if (!nonEmpty(value.output_mime_type)) errors.push('output_mime_type is required.');
  if (nonEmpty(value.output_mime_type) && !String(value.output_mime_type).startsWith('video/')) errors.push('output_mime_type must be a video/* MIME type.');
  if (!optionalNumber(value.output_file_size_bytes)) errors.push('output_file_size_bytes must be a non-negative number when provided.');
  if (!optionalNumber(value.duration_seconds)) errors.push('duration_seconds must be a non-negative number when provided.');
  if (!optionalPositiveInteger(value.width)) errors.push('width must be a positive integer when provided.');
  if (!optionalPositiveInteger(value.height)) errors.push('height must be a positive integer when provided.');
  if (!nonEmpty(value.rendered_at)) errors.push('rendered_at is required.');
  if (!arrayOfStrings(value.warnings)) errors.push('warnings must be an array of strings when provided.');
  if (value.admin_review_required !== true) errors.push('admin_review_required must remain true.');
  if (value.ai_auto_publish_allowed !== false) errors.push('ai_auto_publish_allowed must remain false.');

  if (errors.length) return { valid: false, errors };

  return {
    valid: true,
    errors: [],
    normalized: {
      ok: true,
      renderer_name: String(value.renderer_name).trim(),
      renderer_version: nonEmpty(value.renderer_version) ? String(value.renderer_version).trim() : undefined,
      render_job_id: String(value.render_job_id).trim(),
      output_video_url: nonEmpty(value.output_video_url) ? String(value.output_video_url).trim() : undefined,
      output_storage_path: nonEmpty(value.output_storage_path) ? String(value.output_storage_path).trim() : undefined,
      output_mime_type: String(value.output_mime_type).trim(),
      output_file_size_bytes: typeof value.output_file_size_bytes === 'number' ? value.output_file_size_bytes : undefined,
      duration_seconds: typeof value.duration_seconds === 'number' ? value.duration_seconds : undefined,
      width: typeof value.width === 'number' ? value.width : undefined,
      height: typeof value.height === 'number' ? value.height : undefined,
      thumbnail_url: nonEmpty(value.thumbnail_url) ? String(value.thumbnail_url).trim() : undefined,
      thumbnail_storage_path: nonEmpty(value.thumbnail_storage_path) ? String(value.thumbnail_storage_path).trim() : undefined,
      checksum_sha256: nonEmpty(value.checksum_sha256) ? String(value.checksum_sha256).trim() : undefined,
      rendered_at: String(value.rendered_at).trim(),
      warnings: normaliseWarnings(value.warnings),
      metadata: safeMetadata(value.metadata),
      admin_review_required: true,
      ai_auto_publish_allowed: false
    }
  };
}

export const socialVideoRendererContractExample: SocialVideoRendererResult = {
  ok: true,
  renderer_name: 'nanofix-video-renderer',
  renderer_version: 'v1',
  render_job_id: '00000000-0000-0000-0000-000000000000',
  output_storage_path: 'rendered/social-video/example.mp4',
  output_mime_type: 'video/mp4',
  output_file_size_bytes: 12345678,
  duration_seconds: 30,
  width: 1080,
  height: 1920,
  thumbnail_storage_path: 'rendered/social-video/example.jpg',
  checksum_sha256: 'replace-with-real-sha256',
  rendered_at: '2026-05-25T00:00:00.000Z',
  warnings: [],
  metadata: { platform: 'tiktok', aspect_ratio: '9:16' },
  admin_review_required: true,
  ai_auto_publish_allowed: false
};
