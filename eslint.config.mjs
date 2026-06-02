import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Build artifacts (Electron packaged output) — not source
    "dist-desktop/**",
    // Standalone Node.js scripts (Electron main + Excel converters) — not part of the Next.js build
    "main.js",
    "convert.mjs",
    "convert-leads.mjs",
  ]),
]);

export default eslintConfig;
