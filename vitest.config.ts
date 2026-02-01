import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["packages/**/*.test.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "lcov"],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 80,
        statements: 80,
      },
      exclude: ["node_modules/", "dist/", "**/*.d.ts", "**/*.test.ts", "examples/"],
    },
  },
  resolve: {
    alias: {
      "@typed-policy/core": path.resolve(__dirname, "packages/core/src/index.ts"),
      "@typed-policy/eval": path.resolve(__dirname, "packages/eval/src/index.ts"),
      "@typed-policy/drizzle": path.resolve(__dirname, "packages/drizzle/src/index.ts"),
    },
  },
});
