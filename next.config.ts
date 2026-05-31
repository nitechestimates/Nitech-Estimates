import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    qualities: [75, 90],
  },
  // Tell Turbopack/webpack NOT to bundle these packages — let Node.js require()
  // them natively at runtime. This is required for packages with native binaries
  // (like mongodb) in packaged Electron apps, otherwise Turbopack renames them
  // to internal hashed identifiers that can't be found at runtime.
  serverExternalPackages: ["mongodb", "@mongodb-js/saslprep", "mongodb-client-encryption"],
};

export default nextConfig;
