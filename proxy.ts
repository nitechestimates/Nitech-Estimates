import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

export async function proxy(req: NextRequest) {
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

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/estimate-builder",
    "/estimate-builder/:path*",
  ],
};
