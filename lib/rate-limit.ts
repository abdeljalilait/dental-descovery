/**
 * In-process fixed-window rate limiter.
 *
 * Scope caveat, same as the admin login throttle it replaced in spirit: state
 * lives in a per-instance `Map`, so it resets on deploy and does not coordinate
 * across replicas. That is the right scope for this project's single-container
 * deployment; behind multiple instances, move the limit to a shared store or
 * enforce it at the reverse proxy.
 *
 * Keying caveat: callers derive the key from request headers (`clientKey`),
 * which a client can spoof whenever the app port is reachable directly. It
 * raises the cost of abuse but is not a hard boundary — do not expose port 3000
 * to the internet without a proxy that overwrites `X-Forwarded-For`.
 */

export interface RateLimitState {
  allowed: boolean;
  /** Attempts left in the current window, floored at zero. */
  remaining: number;
  resetAt: number;
}

interface Bucket {
  count: number;
  resetAt: number;
}

export interface RateLimiter {
  /** Count this call against the key and report the resulting state. */
  check(key: string): RateLimitState;
  /** Report the key's state without counting this call. */
  peek(key: string): RateLimitState;
  /** Clear a key, e.g. after a successful login. */
  reset(key: string): void;
}

export function createRateLimiter({ limit, windowMs }: { limit: number; windowMs: number }): RateLimiter {
  const buckets = new Map<string, Bucket>();

  /** Drop expired buckets so a long-running process does not grow unbounded. */
  function prune(now: number): void {
    for (const [key, bucket] of buckets) {
      if (bucket.resetAt <= now) buckets.delete(key);
    }
  }

  function tally(key: string, increment: boolean): RateLimitState {
    const now = Date.now();
    prune(now);

    const bucket = buckets.get(key);
    if (!bucket || bucket.resetAt <= now) {
      const count = increment ? 1 : 0;
      const resetAt = now + windowMs;
      if (increment) buckets.set(key, { count, resetAt });
      return { allowed: true, remaining: limit - count, resetAt };
    }

    if (increment) bucket.count += 1;
    return {
      allowed: bucket.count <= limit,
      remaining: Math.max(0, limit - bucket.count),
      resetAt: bucket.resetAt,
    };
  }

  return {
    check: (key) => tally(key, true),
    peek: (key) => tally(key, false),
    reset: (key) => {
      buckets.delete(key);
    },
  };
}

/**
 * Best-effort caller identity for rate limiting.
 *
 * `x-forwarded-for` is set by the platform proxy and its left-most entry is the
 * original client. A request with no forwarding headers still gets a shared
 * bucket rather than being exempt from the limit.
 */
export function clientKey(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  return (
    forwarded?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}
