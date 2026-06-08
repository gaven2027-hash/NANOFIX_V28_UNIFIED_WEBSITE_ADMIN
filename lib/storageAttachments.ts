const DEFAULT_ALLOWED_BUCKETS = [
  'repair-attachments',
  'service-request-attachments',
  'customer-attachments',
  'warranty-claim-attachments',
  'public-repair-uploads',
  'nanofix-service-uploads'
];

type AttachmentValidationResult = {
  urls: string[];
  rejected: string[];
};

function configuredSupabaseOrigins() {
  return [process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_URL]
    .filter((value): value is string => Boolean(value))
    .map((value) => {
      try {
        return new URL(value).origin;
      } catch {
        return null;
      }
    })
    .filter((value): value is string => Boolean(value));
}

function allowedBuckets() {
  return (process.env.NANOFIX_ALLOWED_ATTACHMENT_BUCKETS || DEFAULT_ALLOWED_BUCKETS.join(','))
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
}

function isSafeStoragePath(pathname: string, buckets: string[]) {
  const normalized = pathname.replace(/^\/+/, '');
  if (!normalized) return false;
  const publicPrefix = 'storage/v1/object/public/';
  const signedPrefix = 'storage/v1/object/sign/';
  const directBucket = buckets.some((bucket) => normalized.startsWith(`${bucket}/`));
  const publicBucket = buckets.some((bucket) => normalized.startsWith(`${publicPrefix}${bucket}/`));
  const signedBucket = buckets.some((bucket) => normalized.startsWith(`${signedPrefix}${bucket}/`));
  return directBucket || publicBucket || signedBucket;
}

function normalizeAttachmentUrl(value: unknown, origins: string[], buckets: string[]) {
  if (typeof value !== 'string') return { ok: false as const, value: '' };
  const input = value.trim().slice(0, 900);
  if (!input) return { ok: false as const, value: '' };

  if (input.startsWith('storage://')) {
    const storagePath = input.slice('storage://'.length).replace(/^\/+/, '');
    return isSafeStoragePath(storagePath, buckets) ? { ok: true as const, value: `storage://${storagePath}` } : { ok: false as const, value: input };
  }

  if (!/^https?:\/\//i.test(input)) {
    const path = input.replace(/^\/+/, '');
    return isSafeStoragePath(path, buckets) ? { ok: true as const, value: path } : { ok: false as const, value: input };
  }

  try {
    const url = new URL(input);
    if (!origins.includes(url.origin)) return { ok: false as const, value: input };
    return isSafeStoragePath(url.pathname, buckets) ? { ok: true as const, value: url.toString() } : { ok: false as const, value: input };
  } catch {
    return { ok: false as const, value: input };
  }
}

export function normalizeServiceAttachmentUrls(value: unknown, maxItems = 12): AttachmentValidationResult {
  if (!Array.isArray(value)) return { urls: [], rejected: [] };
  const origins = configuredSupabaseOrigins();
  const buckets = allowedBuckets();
  const urls: string[] = [];
  const rejected: string[] = [];

  for (const item of value.slice(0, maxItems)) {
    const normalized = normalizeAttachmentUrl(item, origins, buckets);
    if (normalized.ok) urls.push(normalized.value);
    else if (normalized.value) rejected.push(normalized.value);
  }

  return { urls: [...new Set(urls)], rejected };
}
