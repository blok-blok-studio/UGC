// Token bucket rate limiter for API requests
// Server-side only - protects fal.ai API key from abuse

interface TokenBucket {
  tokens: number;
  lastRefill: number;
}

const RATE_LIMIT_MAX_TOKENS = 10;
const RATE_LIMIT_REFILL_RATE = 10; // tokens per minute
const RATE_LIMIT_REFILL_INTERVAL = 60 * 1000; // 1 minute in ms

// In-memory store (resets on server restart - fine for single user)
const buckets = new Map<string, TokenBucket>();

export function checkRateLimit(identifier: string = "default"): {
  allowed: boolean;
  remaining: number;
  resetIn: number;
} {
  const now = Date.now();
  let bucket = buckets.get(identifier);

  if (!bucket) {
    bucket = { tokens: RATE_LIMIT_MAX_TOKENS, lastRefill: now };
    buckets.set(identifier, bucket);
  }

  // Refill tokens based on elapsed time
  const elapsed = now - bucket.lastRefill;
  const tokensToAdd = Math.floor(
    (elapsed / RATE_LIMIT_REFILL_INTERVAL) * RATE_LIMIT_REFILL_RATE
  );

  if (tokensToAdd > 0) {
    bucket.tokens = Math.min(
      RATE_LIMIT_MAX_TOKENS,
      bucket.tokens + tokensToAdd
    );
    bucket.lastRefill = now;
  }

  if (bucket.tokens > 0) {
    bucket.tokens -= 1;
    return {
      allowed: true,
      remaining: bucket.tokens,
      resetIn: 0,
    };
  }

  const resetIn = Math.ceil(
    RATE_LIMIT_REFILL_INTERVAL -
      ((now - bucket.lastRefill) % RATE_LIMIT_REFILL_INTERVAL)
  );

  return {
    allowed: false,
    remaining: 0,
    resetIn,
  };
}
