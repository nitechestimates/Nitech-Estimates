const rateLimitMap = new Map();
let lastCleanup = Date.now();

// Cleanup expired entries to avoid memory leaks
function cleanup() {
  const now = Date.now();
  for (const [key, value] of rateLimitMap.entries()) {
    if (now > value.resetTime) {
      rateLimitMap.delete(key);
    }
  }
  lastCleanup = now;
}

/**
 * Simple in-memory rate limiter.
 *
 * @param {string} key - Unique identifier (e.g., IP address or user ID)
 * @param {number} limit - Max requests allowed in the window
 * @param {number} windowMs - Window duration in milliseconds (default 1 minute)
 * @returns {{ success: boolean, count: number, reset: number }}
 */
export function rateLimit(key, limit = 60, windowMs = 60000) {
  const now = Date.now();

  // Run cleanup every 5 minutes or if the map size is too large
  if (now - lastCleanup > 300000 || rateLimitMap.size > 10000) {
    cleanup();
  }

  if (!rateLimitMap.has(key)) {
    rateLimitMap.set(key, { count: 1, resetTime: now + windowMs });
    return { success: true, count: 1, reset: windowMs };
  }

  const rateData = rateLimitMap.get(key);

  if (now > rateData.resetTime) {
    // Window has expired, reset count and window
    rateData.count = 1;
    rateData.resetTime = now + windowMs;
    return { success: true, count: 1, reset: windowMs };
  }

  rateData.count += 1;
  const resetRemaining = Math.max(0, rateData.resetTime - now);

  if (rateData.count > limit) {
    return { success: false, count: rateData.count, reset: resetRemaining };
  }

  return { success: true, count: rateData.count, reset: resetRemaining };
}
