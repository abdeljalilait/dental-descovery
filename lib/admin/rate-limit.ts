/**
 * Fixed-window throttle for the admin login form.
 *
 * This is defence in depth against online password guessing, not a replacement
 * for a strong password. It is an in-process `Map`, so it resets on deploy and
 * is per-instance — on a single PM2 instance (this project's deployment) that is
 * exactly the right scope. Behind multiple instances or a serverless runtime,
 * put a real limiter in the reverse proxy instead.
 */

interface Window {
  count: number;
  resetAt: number;
}

const attempts = new Map<string, Window>();

/** Five tries per IP per fifteen minutes. */
const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000;

/**
 * Prune expired entries before counting, so a long-running process does not
 * accumulate one stale window per IP that ever touched the login form.
 */
function prune(now: number): void {
  for (const [key, window] of attempts) {
    if (window.resetAt <= now) attempts.delete(key);
  }
}

/** Record a failed attempt. Returns false once the caller is over the limit. */
export function recordFailedAttempt(key: string): boolean {
  const now = Date.now();
  prune(now);

  const window = attempts.get(key);
  if (!window || window.resetAt <= now) {
    attempts.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return true;
  }

  window.count += 1;
  return window.count <= MAX_ATTEMPTS;
}

/**
 * Consume an attempt without recording a failure. Called before verifying the
 * password so a correct guess is also blocked once the window is exhausted.
 */
export function isThrottled(key: string): boolean {
  const now = Date.now();
  prune(now);

  const window = attempts.get(key);
  if (!window) return false;
  return window.count >= MAX_ATTEMPTS;
}

/** Clear the counter after a successful login so the operator is not penalised. */
export function clearAttempts(key: string): void {
  attempts.delete(key);
}