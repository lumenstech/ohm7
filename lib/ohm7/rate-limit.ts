// Tiny in-memory rate-limiter. Process-local only; replace with a real backing
// store (Redis, KV) before serving multi-instance production traffic.
//
// Usage:
//   const ok = checkRateLimit(`claim:${ip}`, 10, 60_000);
//   if (!ok) throw new Error("rate limited");

const buckets = new Map<string, { count: number; resetAt: number }>();

export function checkRateLimit(key: string, max: number, windowMs: number): boolean {
  const now = Date.now();
  const b = buckets.get(key);
  if (!b || b.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (b.count >= max) return false;
  b.count += 1;
  return true;
}

export function _resetForTests() {
  buckets.clear();
}
