import { describe, expect, it } from "vitest";
import {
  RateLimitMisconfiguredError,
  resolveRateLimiter,
} from "@/lib/dht/rate-limit";

describe("resolveRateLimiter", () => {
  it("defaults to memory in development", () => {
    const r = resolveRateLimiter({ NODE_ENV: "development" });
    expect(r.name).toBe("memory");
  });

  it("throws in production when unset", () => {
    expect(() => resolveRateLimiter({ NODE_ENV: "production" })).toThrow(
      RateLimitMisconfiguredError,
    );
  });

  it("blocks memory in production without explicit override", () => {
    expect(() =>
      resolveRateLimiter({ NODE_ENV: "production", DHT_RATE_LIMIT_PROVIDER: "memory" }),
    ).toThrow(RateLimitMisconfiguredError);
  });

  it("allows memory in production with the explicit escape hatch", () => {
    const r = resolveRateLimiter({
      NODE_ENV: "production",
      DHT_RATE_LIMIT_PROVIDER: "memory",
      DHT_ALLOW_MEMORY_RATE_LIMIT_IN_PRODUCTION: "true",
    });
    expect(r.name).toBe("memory");
  });

  it("returns a disabled limiter when mode=disabled", async () => {
    const r = resolveRateLimiter({ NODE_ENV: "production", DHT_RATE_LIMIT_PROVIDER: "disabled" });
    expect(r.name).toBe("disabled");
    for (let i = 0; i < 100; i++) {
      expect(await r.check("k", 1, 60_000)).toBe(true);
    }
  });

  it("redis throws without REDIS_URL", () => {
    expect(() =>
      resolveRateLimiter({ NODE_ENV: "production", DHT_RATE_LIMIT_PROVIDER: "redis" }),
    ).toThrow(RateLimitMisconfiguredError);
  });

  it("memory limiter actually enforces the limit", async () => {
    const r = resolveRateLimiter({ NODE_ENV: "test", DHT_RATE_LIMIT_PROVIDER: "memory" });
    expect(await r.check("k", 2, 60_000)).toBe(true);
    expect(await r.check("k", 2, 60_000)).toBe(true);
    expect(await r.check("k", 2, 60_000)).toBe(false);
  });

  it("memory limiter scopes per key", async () => {
    const r = resolveRateLimiter({ NODE_ENV: "test", DHT_RATE_LIMIT_PROVIDER: "memory" });
    expect(await r.check("a", 1, 60_000)).toBe(true);
    expect(await r.check("b", 1, 60_000)).toBe(true);
    expect(await r.check("a", 1, 60_000)).toBe(false);
  });
});
