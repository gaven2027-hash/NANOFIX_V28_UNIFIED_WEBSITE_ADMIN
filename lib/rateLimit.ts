type Bucket = { count: number; resetAt: number };

const memoryBuckets = new Map<string, Bucket>();

export function hitRateLimit(key: string, limit: number, windowMs: number) {
  const now = Date.now();
  const current = memoryBuckets.get(key);

  if (!current || current.resetAt <= now) {
    memoryBuckets.set(key, { count: 1, resetAt: now + windowMs });
    return { limited: false, remaining: Math.max(limit - 1, 0), resetAt: now + windowMs };
  }

  current.count += 1;
  memoryBuckets.set(key, current);

  return {
    limited: current.count > limit,
    remaining: Math.max(limit - current.count, 0),
    resetAt: current.resetAt
  };
}
