import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { rateLimit } from "./lib/rateLimit";

// Configuration: limit and window in milliseconds
const LIMITS: Record<string, { limit: number; window: number }> = {
  "/api/estimate/save": { limit: 10, window: 60 * 1000 },      // 10 requests per minute
  "/api/generate-pdf": { limit: 5, window: 60 * 1000 },        // 5 requests per minute
  "/api/billing/generate-pdf": { limit: 5, window: 60 * 1000 }, // 5 requests per minute
  "/api/search-items": { limit: 60, window: 60 * 1000 },       // 60 requests per minute
};

// Helper to resolve limit config, including CRUD wildcards
function getLimitConfig(pathname: string): { limit: number; window: number } | null {
  if (LIMITS[pathname]) {
    return LIMITS[pathname];
  }
  if (pathname.startsWith("/api/estimate/") && pathname !== "/api/estimate/save") {
    return { limit: 30, window: 60 * 1000 }; // 30 requests/min for general/dynamic estimate CRUD
  }
  if (pathname.startsWith("/api/billing/") && pathname !== "/api/billing/generate-pdf") {
    return { limit: 30, window: 60 * 1000 }; // 30 requests/min for general/dynamic billing CRUD
  }
  if (pathname.startsWith("/api/lead-profiles")) {
    return { limit: 30, window: 60 * 1000 }; // 30 requests/min for lead profile CRUD
  }
  return null;
}

interface RequestWithIp extends NextRequest {
  ip?: string;
}

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // 1. Apply Rate Limiting first for configured endpoints
  const limitConfig = getLimitConfig(pathname);
  if (limitConfig) {
    // Resolve client IP securely to prevent spoofing in proxy environments
    const xRealIp = req.headers.get("x-real-ip");
    const xForwardedFor = req.headers.get("x-forwarded-for");
    let ip = "127.0.0.1";
    if (xRealIp) {
      ip = xRealIp.trim();
    } else if (xForwardedFor) {
      const parts = xForwardedFor.split(",");
      ip = parts[0].trim();
    } else {
      ip = (req as RequestWithIp).ip || "127.0.0.1";
    }
    const key = `${pathname}:${ip}`;

    const rate = await rateLimit(key, limitConfig.limit, limitConfig.window);
    if (!rate.success) {
      return new NextResponse(
        JSON.stringify({ error: "Too many requests. Please try again later." }),
        {
          status: 429,
          headers: {
            "Content-Type": "application/json",
            "Retry-After": Math.ceil(rate.reset / 1000).toString(),
          },
        }
      );
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
    "/api/estimate/get",
    "/api/estimate/duplicate",
    "/api/estimate/:id",
    "/api/billing/generate-pdf",
    "/api/billing/:estimateId",
    "/api/lead-profiles",
    "/api/lead-profiles/:id",
    "/api/search-items",
    "/api/generate-pdf",
  ],
};
