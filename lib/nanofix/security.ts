import { createHmac, timingSafeEqual } from "node:crypto";

export type RateLimitOptions = {
  windowMs: number;
  max: number;
  namespace: string;
};

const memoryBuckets = new Map<string, { count: number; resetAt: number }>();

export function clientIpFromRequest(request: Request) {
  const forwardedFor = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const realIp = request.headers.get("x-real-ip")?.trim();
  const cfIp = request.headers.get("cf-connecting-ip")?.trim();
  return cfIp || forwardedFor || realIp || "unknown";
}

export function checkRateLimit(request: Request, options: RateLimitOptions) {
  const now = Date.now();
  const ip = clientIpFromRequest(request);
  const key = `${options.namespace}:${ip}`;
  const bucket = memoryBuckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    memoryBuckets.set(key, { count: 1, resetAt: now + options.windowMs });
    return { limited: false, remaining: options.max - 1, retryAfterSeconds: 0, key };
  }

  bucket.count += 1;
  const retryAfterSeconds = Math.ceil((bucket.resetAt - now) / 1000);

  if (bucket.count > options.max) {
    return { limited: true, remaining: 0, retryAfterSeconds, key };
  }

  return { limited: false, remaining: options.max - bucket.count, retryAfterSeconds: 0, key };
}

export type UploadValidationOptions = {
  maxFiles: number;
  maxFileSizeBytes: number;
  allowedMimeTypes: string[];
};

export function validateUploadFiles(files: File[], options: UploadValidationOptions) {
  if (files.length > options.maxFiles) {
    return `Too many files. Maximum ${options.maxFiles} files are allowed.`;
  }

  for (const file of files) {
    if (file.size > options.maxFileSizeBytes) {
      return `File ${file.name || "upload"} is too large. Maximum size is ${Math.round(
        options.maxFileSizeBytes / 1024 / 1024
      )}MB.`;
    }

    if (file.type && !options.allowedMimeTypes.includes(file.type)) {
      return `File type ${file.type} is not allowed.`;
    }
  }

  return null;
}

function normalizeSignature(signature: string | null) {
  if (!signature) return null;
  return signature.replace(/^sha256=/i, "").trim();
}

export function verifyWebhookSignature(rawBody: string, request: Request, secret: string) {
  const signature = normalizeSignature(
    request.headers.get("x-nanofix-signature") ||
      request.headers.get("x-hub-signature-256") ||
      request.headers.get("x-signature")
  );

  if (!signature) return false;

  const timestamp = request.headers.get("x-nanofix-timestamp") || request.headers.get("x-timestamp");
  if (timestamp) {
    const timestampNumber = Number(timestamp);
    const maxSkewMs = 5 * 60 * 1000;
    if (!Number.isFinite(timestampNumber) || Math.abs(Date.now() - timestampNumber) > maxSkewMs) {
      return false;
    }
  }

  const signedPayload = timestamp ? `${timestamp}.${rawBody}` : rawBody;
  const expected = createHmac("sha256", secret).update(signedPayload).digest("hex");

  try {
    const expectedBuffer = Buffer.from(expected, "hex");
    const actualBuffer = Buffer.from(signature, "hex");
    return actualBuffer.length === expectedBuffer.length && timingSafeEqual(actualBuffer, expectedBuffer);
  } catch {
    return false;
  }
}
