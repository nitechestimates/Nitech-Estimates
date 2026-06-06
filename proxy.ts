import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

// In-memory rate limiting map.
const rateLimitMap = new Map<string, number[]>();

// Configuration: limit and window in milliseconds
const LIMITS: Record<string, { limit: number; window: number }> = {
  "/api/estimate/save": { limit: 10, window: 60 * 1000 },      // 10 requests per minute
  "/api/generate-pdf": { limit: 5, window: 60 * 1000 },        // 5 requests per minute
  "/api/search-items": { limit: 60, window: 60 * 1000 },       // 60 requests per minute
};

interface RequestWithIp extends NextRequest {
  ip?: string;
}

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // 1. Apply Rate Limiting first for configured endpoints
  const limitConfig = LIMITS[pathname];
  if (limitConfig) {
    const ip = req.headers.get("x-forwarded-for") || (req as RequestWithIp).ip || "127.0.0.1";
    const key = `${pathname}:${ip}`;

    const now = Date.now();
    if (!rateLimitMap.has(key)) {
      rateLimitMap.set(key, []);
    }

    const timestamps = rateLimitMap.get(key) || [];
    const validTimestamps = timestamps.filter(ts => now - ts < limitConfig.window);

    if (validTimestamps.length >= limitConfig.limit) {
      return new NextResponse(
        JSON.stringify({ error: "Too many requests. Please try again later." }),
        {
          status: 429,
          headers: {
            "Content-Type": "application/json",
            "Retry-After": Math.ceil((limitConfig.window - (now - validTimestamps[0])) / 1000).toString(),
          },
        }
      );
    }

    validTimestamps.push(now);
    rateLimitMap.set(key, validTimestamps);

    // Prune cache periodically to avoid memory leaks
    if (rateLimitMap.size > 1000) {
      for (const [mapKey, times] of rateLimitMap.entries()) {
        const filtered = times.filter(ts => now - ts < 60 * 1000);
        if (filtered.length === 0) {
          rateLimitMap.delete(mapKey);
        } else {
          rateLimitMap.set(mapKey, filtered);
        }
      }
    }
  }

  // 2. Auth check for /estimate-builder routes
  if (pathname.startsWith("/estimate-builder")) {
    const token = await getToken({
      req,
      secret: process.env.NEXTAUTH_SECRET,
      cookieName: "next-auth.session-token", // Explicitly match cookie name in lib/auth.js
    });

    if (!token) {
      // Redirect to login page if unauthenticated
      const loginUrl = new URL("/", req.url);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/estimate-builder",
    "/estimate-builder/:path*",
    "/api/estimate/save",
    "/api/search-items",
    "/api/generate-pdf",
  ],
};
