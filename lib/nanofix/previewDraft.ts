export type WebsitePreviewDraftPayload = {
  route_path: string;
  block_key: string;
  locale?: string;
  content_json?: unknown;
  visual_output_url?: string;
  visual_output_storage_path?: string;
  visual_asset_type?: string;
  visual_alt_text?: string;
  injected_at?: string;
};

export function buildPreviewDraftPayload(input: Partial<WebsitePreviewDraftPayload>): WebsitePreviewDraftPayload {
  return {
    route_path: String(input.route_path || '/'),
    block_key: String(input.block_key || 'main'),
    locale: String(input.locale || 'en'),
    content_json: input.content_json || {},
    visual_output_url: input.visual_output_url || '',
    visual_output_storage_path: input.visual_output_storage_path || '',
    visual_asset_type: input.visual_asset_type || 'image',
    visual_alt_text: input.visual_alt_text || '',
    injected_at: new Date().toISOString()
  };
}

export function encodePreviewDraft(payload: WebsitePreviewDraftPayload) {
  return Buffer.from(JSON.stringify(payload)).toString('base64url');
}

export function decodePreviewDraft(value?: string | null): WebsitePreviewDraftPayload | null {
  if (!value) return null;
  try {
    const decoded = Buffer.from(value, 'base64url').toString('utf-8');
    const parsed = JSON.parse(decoded);
    if (!parsed || typeof parsed !== 'object') return null;
    return parsed as WebsitePreviewDraftPayload;
  } catch {
    return null;
  }
}
