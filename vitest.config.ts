import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    alias: {
      "@": path.resolve(__dirname, "./"),
    },
    exclude: [
      "**/node_modules/**",
      "**/dist-desktop/**",
      "**/.next/**",
      "**/out/**",
      "**/build/**",
      "**/e2e/**",
    ],
  },
});
