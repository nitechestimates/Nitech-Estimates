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

function rateLimitMemory(key, limit, windowMs) {
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

/**
 * Hybrid rate limiter.
 * Uses Upstash Redis REST API if environment variables are set,
 * falling back to local in-memory rate limiter.
 *
 * @param {string} key - Unique identifier
 * @param {number} limit - Max requests allowed in the window
 * @param {number} windowMs - Window duration in milliseconds (default 1 minute)
 * @returns {Promise<{ success: boolean, count: number, reset: number }>}
 */
export async function rateLimit(key, limit = 60, windowMs = 60000) {
  const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
  const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (redisUrl && redisToken) {
    try {
      const windowSeconds = Math.ceil(windowMs / 1000);
      const url = redisUrl.endsWith("/") ? redisUrl.slice(0, -1) : redisUrl;
      const rateKey = `rl:${key}`;

      // Pipeline INCR and TTL to minimize latency
      const res = await fetch(`${url}/pipeline`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${redisToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify([
          ["INCR", rateKey],
          ["TTL", rateKey]
        ]),
        signal: AbortSignal.timeout(2000) // 2s timeout limit
      });

      if (!res.ok) {
        throw new Error(`Upstash returned status ${res.status}`);
      }

      const data = await res.json();
      if (Array.isArray(data) && data.length === 2) {
        const count = data[0].result;
        let ttl = data[1].result;

        // Set expiry if key was just created or TTL is missing
        if (count === 1 || ttl === -1) {
          await fetch(`${url}/expire`, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${redisToken}`,
              "Content-Type": "application/json"
            },
            body: JSON.stringify([rateKey, windowSeconds]),
            signal: AbortSignal.timeout(1000)
          }).catch(err => console.warn("Failed to set Redis expire:", err));
          ttl = windowSeconds;
        }

        const resetMs = ttl > 0 ? ttl * 1000 : windowMs;
        if (count > limit) {
          return { success: false, count, reset: resetMs };
        }
        return { success: true, count, reset: resetMs };
      }
    } catch (err) {
      console.warn("Upstash Redis error, falling back to local memory:", err.message);
    }
  }

  // Fallback to in-memory rate limiting
  return rateLimitMemory(key, limit, windowMs);
}
