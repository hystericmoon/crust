import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: [
      "packages/*/src/**/*.test.{ts,tsx}",
      "apps/*/src/**/*.test.{ts,tsx}",
      "apps/*/server/**/*.test.ts",
      "scripts/**/*.test.ts",
    ],
    environment: "node",
  },
});
