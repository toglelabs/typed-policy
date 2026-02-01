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
        lines: 75,
        functions: 75,
        branches: 75,
        statements: 75,
      },
      include: ["packages/*/src/**/*.ts"],
      exclude: [
        "node_modules/",
        "dist/",
        "**/*.d.ts",
        "**/*.test.ts",
        "examples/",
        "vitest.config.ts",
        "**/index.ts", // Re-export files don't need coverage
        "packages/core/src/context.ts", // Type definitions only
        "packages/core/src/types.ts", // Type definitions only
        "packages/core/src/infer.ts", // Type definitions only
        "packages/core/src/paths.ts", // Type definitions only
        "packages/core/src/errors.ts", // Simple error helpers
        "packages/core/src/ast.ts", // Type definitions only
        "packages/drizzle/src/mapping.ts", // Not yet tested
        "packages/drizzle/src/compile.ts", // Will be tested in integration tests
      ],
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
