import { createRateLimiter } from "@/lib/rate-limit";

/**
 * Fixed-window throttle for the admin login form.
 *
 * Defence in depth against online password guessing, not a replacement for a
 * strong password: five tries per key (the caller's IP) per fifteen minutes.
 * The limiter's storage caveats — per-instance, resets on deploy — are
 * documented in `lib/rate-limit.ts`.
 */
const limiter = createRateLimiter({ limit: 5, windowMs: 15 * 60 * 1000 });

/** Record a failed attempt. Returns false once the caller is over the limit. */
export function recordFailedAttempt(key: string): boolean {
  return limiter.check(key).allowed;
}

/**
 * Whether the key has no attempts left. Checked before verifying the password
 * so a correct guess is also blocked once the window is exhausted.
 */
export function isThrottled(key: string): boolean {
  return limiter.peek(key).remaining === 0;
}

/** Clear the counter after a successful login so the operator is not penalised. */
export function clearAttempts(key: string): void {
  limiter.reset(key);
}
