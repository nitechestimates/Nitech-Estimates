import type { NextConfig } from "next";

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
        ],
      },
    ];
  },
};

export default nextConfig;
