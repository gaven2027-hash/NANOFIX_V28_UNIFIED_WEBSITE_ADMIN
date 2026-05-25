export type SocialPublisherResult = {
  ok: true;
  publisher_name: string;
  publisher_version?: string;
  version_id: string;
  platform: string;
  external_post_id?: string;
  external_post_url?: string;
  published_at: string;
  platform_api_called: true;
  final_approval_completed_before_schedule: true;
  publish_ready_after_schedule: true;
  ai_auto_publish_allowed: false;
  metadata?: Record<string, unknown>;
  warnings?: string[];
};

export type SocialPublisherValidationResult = {
  valid: boolean;
  errors: string[];
  normalized?: SocialPublisherResult;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function nonEmpty(value: unknown) {
  return typeof value === 'string' && value.trim().length > 0;
}

function clean(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function arrayOfStrings(value: unknown) {
  return value === undefined || value === null || (Array.isArray(value) && value.every((item) => typeof item === 'string'));
}

function warnings(value: unknown) {
  return Array.isArray(value) ? value.map((item) => String(item)).filter(Boolean) : [];
}

function metadata(value: unknown) {
  return isRecord(value) ? value : {};
}

export function validateSocialPublisherResult(value: unknown, expectedVersionId: string, expectedPlatform: string): SocialPublisherValidationResult {
  const errors: string[] = [];
  if (!isRecord(value)) return { valid: false, errors: ['Publisher result must be a JSON object.'] };

  if (value.ok !== true) errors.push('Publisher result must include ok: true.');
  if (!nonEmpty(value.publisher_name)) errors.push('publisher_name is required.');
  if (!nonEmpty(value.version_id)) errors.push('version_id is required.');
  if (clean(value.version_id) !== expectedVersionId) errors.push('version_id does not match the scheduled version.');
  if (!nonEmpty(value.platform)) errors.push('platform is required.');
  if (clean(value.platform) !== expectedPlatform) errors.push('platform does not match the scheduled version.');
  if (!nonEmpty(value.external_post_id) && !nonEmpty(value.external_post_url)) errors.push('external_post_id or external_post_url is required.');
  if (!nonEmpty(value.published_at)) errors.push('published_at is required.');
  if (value.platform_api_called !== true) errors.push('platform_api_called must be true for a successful publish result.');
  if (value.final_approval_completed_before_schedule !== true) errors.push('final_approval_completed_before_schedule must remain true.');
  if (value.publish_ready_after_schedule !== true) errors.push('publish_ready_after_schedule must remain true.');
  if (value.ai_auto_publish_allowed !== false) errors.push('ai_auto_publish_allowed must remain false.');
  if (!arrayOfStrings(value.warnings)) errors.push('warnings must be an array of strings when provided.');

  if (errors.length) return { valid: false, errors };

  return {
    valid: true,
    errors: [],
    normalized: {
      ok: true,
      publisher_name: clean(value.publisher_name),
      publisher_version: nonEmpty(value.publisher_version) ? clean(value.publisher_version) : undefined,
      version_id: clean(value.version_id),
      platform: clean(value.platform),
      external_post_id: nonEmpty(value.external_post_id) ? clean(value.external_post_id) : undefined,
      external_post_url: nonEmpty(value.external_post_url) ? clean(value.external_post_url) : undefined,
      published_at: clean(value.published_at),
      platform_api_called: true,
      final_approval_completed_before_schedule: true,
      publish_ready_after_schedule: true,
      ai_auto_publish_allowed: false,
      metadata: metadata(value.metadata),
      warnings: warnings(value.warnings)
    }
  };
}

export const socialPublisherContractExample: SocialPublisherResult = {
  ok: true,
  publisher_name: 'nanofix-social-platform-publisher',
  publisher_version: 'v1',
  version_id: '00000000-0000-0000-0000-000000000000',
  platform: 'tiktok',
  external_post_id: 'platform-post-id',
  external_post_url: 'https://example.com/post/platform-post-id',
  published_at: '2026-05-25T00:00:00.000Z',
  platform_api_called: true,
  final_approval_completed_before_schedule: true,
  publish_ready_after_schedule: true,
  ai_auto_publish_allowed: false,
  metadata: { delivery: 'scheduled_worker' },
  warnings: []
};
