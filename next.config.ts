import type { NextConfig } from "next";
import { z } from "zod";

// Validate environment variables on startup
const envSchema = z.object({
  MONGODB_URI: z.string().refine(
    (val) => val.startsWith("mongodb://") || val.startsWith("mongodb+srv://"),
    { message: "MONGODB_URI must be a valid connection string starting with mongodb:// or mongodb+srv://" }
  ),
  NEXTAUTH_SECRET: z.string().min(1, "NEXTAUTH_SECRET is required"),
  GOOGLE_CLIENT_ID: z.string().min(1, "GOOGLE_CLIENT_ID is required"),
  GOOGLE_CLIENT_SECRET: z.string().min(1, "GOOGLE_CLIENT_SECRET is required"),
});

const envResult = envSchema.safeParse(process.env);
if (!envResult.success) {
  console.error("❌ Environment validation failed:", envResult.error.format());
  // Do not throw if we are in non-production build to avoid breaking CI steps, but log a warning.
  if (process.env.NODE_ENV === "production") {
    throw new Error("Invalid environment variables in production build.");
  }
}

const nextConfig: NextConfig = {
  poweredByHeader: false,
  images: {
    qualities: [75, 90],
  },
  // Tell Turbopack/webpack NOT to bundle these packages — let Node.js require()
  // them natively at runtime. This is required for packages with native binaries
  // (like mongodb) in packaged Electron apps, otherwise Turbopack renames them
  // to internal hashed identifiers that can't be found at runtime.
  serverExternalPackages: ["mongodb", "@mongodb-js/saslprep", "mongodb-client-encryption"],

  async headers() {
    const isProd = process.env.NODE_ENV === "production";
    const cspValue = isProd
      ? "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self';"
      : "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self' ws: http: https:;";

    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-XSS-Protection", value: "1; mode=block" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          {
            key: "Content-Security-Policy",
            value: cspValue,
          },
        ],
      },
    ];
  },
};

export default nextConfig;
