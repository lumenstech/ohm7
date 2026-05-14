// Rate-limit provider abstraction.
//
// Selection is explicit via DHT_RATE_LIMIT_PROVIDER:
//   memory   — process-local, fine for local dev, NOT multi-instance-safe.
//   redis    — placeholder interface; needs REDIS_URL. Throws at boot until
//              wired (we never silently fake a Redis call).
//   disabled — no-op limiter; allows everything. Useful for tests.
//
// In production, picking "memory" without DHT_ALLOW_MEMORY_RATE_LIMIT_IN_PRODUCTION
// fails loudly so an operator doesn't run a multi-instance deployment with a
// per-pod bucket.

export type RateLimitMode = "memory" | "redis" | "disabled";

export type RateLimitEnv = {
  NODE_ENV?: string;
  DHT_RATE_LIMIT_PROVIDER?: string;
  DHT_ALLOW_MEMORY_RATE_LIMIT_IN_PRODUCTION?: string;
  REDIS_URL?: string;
};

export class RateLimitMisconfiguredError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RateLimitMisconfiguredError";
  }
}

export interface RateLimiter {
  name: string;
  /** Returns true if the request is allowed; false if it should be rejected. */
  check(key: string, max: number, windowMs: number): Promise<boolean>;
  reset(): void;
}

class MemoryRateLimiter implements RateLimiter {
  name = "memory";
  private buckets = new Map<string, { count: number; resetAt: number }>();
  async check(key: string, max: number, windowMs: number): Promise<boolean> {
    const now = Date.now();
    const b = this.buckets.get(key);
    if (!b || b.resetAt < now) {
      this.buckets.set(key, { count: 1, resetAt: now + windowMs });
      return true;
    }
    if (b.count >= max) return false;
    b.count += 1;
    return true;
  }
  reset() { this.buckets.clear(); }
}

class DisabledRateLimiter implements RateLimiter {
  name = "disabled";
  async check(): Promise<boolean> { return true; }
  reset() { /* no state */ }
}

class RedisRateLimiter implements RateLimiter {
  name = "redis";
  constructor(env: RateLimitEnv) {
    if (!env.REDIS_URL) {
      throw new RateLimitMisconfiguredError(
        "DHT_RATE_LIMIT_PROVIDER=redis but REDIS_URL is not set",
      );
    }
    // TODO(prod-redis): connect to env.REDIS_URL with ioredis or @upstash/redis
    // and use INCR + EXPIRE per key. Failing loud here instead of silently
    // skipping rate limits.
  }
  async check(): Promise<never> {
    throw new RateLimitMisconfiguredError(
      "Redis rate limiter not implemented in this build. Wire INCR/EXPIRE before shipping.",
    );
  }
  reset() { /* nothing local */ }
}

function resolveMode(env: RateLimitEnv): RateLimitMode {
  const raw = (env.DHT_RATE_LIMIT_PROVIDER ?? "").trim().toLowerCase();
  if (raw === "memory" || raw === "redis" || raw === "disabled") return raw;
  if (env.NODE_ENV === "production") {
    throw new RateLimitMisconfiguredError(
      "DHT_RATE_LIMIT_PROVIDER is not set. Choose 'redis', 'memory' (single-instance only), or 'disabled' in production.",
    );
  }
  return "memory";
}

export function resolveRateLimiter(env: RateLimitEnv = process.env): RateLimiter {
  const mode = resolveMode(env);
  switch (mode) {
    case "disabled":
      return new DisabledRateLimiter();
    case "redis":
      return new RedisRateLimiter(env);
    case "memory": {
      if (env.NODE_ENV === "production" && env.DHT_ALLOW_MEMORY_RATE_LIMIT_IN_PRODUCTION !== "true") {
        throw new RateLimitMisconfiguredError(
          "DHT_RATE_LIMIT_PROVIDER=memory in production. Use 'redis' or 'disabled', or explicitly set DHT_ALLOW_MEMORY_RATE_LIMIT_IN_PRODUCTION=true (single-instance deployments only).",
        );
      }
      return new MemoryRateLimiter();
    }
  }
}

let _cached: RateLimiter | null = null;

export function rateLimit(): RateLimiter {
  if (!_cached) _cached = resolveRateLimiter();
  return _cached;
}

/** Test helper — clears the cache so each test resolves independently. */
export function _resetRateLimiterForTests() {
  if (_cached) _cached.reset();
  _cached = null;
}
