import "server-only";

type Bucket = { tokens: number; updatedAt: number };

/**
 * In-memory token bucket. Good for a single self-hosted instance.
 * capacity = burst size, refillPerMinute = sustained rate.
 */
export function createRateLimiter(capacity: number, refillPerMinute: number) {
  const buckets = new Map<string, Bucket>();
  const refillPerMs = refillPerMinute / 60_000;

  function sweep(now: number) {
    if (buckets.size < 10_000) return;
    for (const [key, b] of buckets) {
      if (now - b.updatedAt > 3_600_000) buckets.delete(key);
    }
  }

  return {
    take(key: string, cost = 1): { ok: boolean; retryAfterSeconds: number } {
      const now = Date.now();
      sweep(now);
      const b = buckets.get(key) ?? { tokens: capacity, updatedAt: now };
      b.tokens = Math.min(capacity, b.tokens + (now - b.updatedAt) * refillPerMs);
      b.updatedAt = now;
      if (b.tokens >= cost) {
        b.tokens -= cost;
        buckets.set(key, b);
        return { ok: true, retryAfterSeconds: 0 };
      }
      buckets.set(key, b);
      return { ok: false, retryAfterSeconds: Math.ceil((cost - b.tokens) / refillPerMs / 1000) };
    },
    reset(key: string) {
      buckets.delete(key);
    },
  };
}

// 5 attempts burst, then 1 per minute, per IP + email.
export const loginLimiter = createRateLimiter(5, 1);
export const signupLimiter = createRateLimiter(5, 2);
export const formLimiter = createRateLimiter(5, 3);
export const chatLimiter = createRateLimiter(12, 6);
