import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [tsconfigPaths(), react()],

  test: {
    // Environment
    environment: "jsdom",
    globals: true,

    // Setup files
    setupFiles: ["./vitest.setup.ts"],

    // Coverage
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html", "lcov"],
      exclude: [
        "node_modules/",
        "vitest.config.ts",
        "vitest.setup.ts",
        "**/*.d.ts",
        "**/*.config.*",
        "**/__mocks__/**",
        "**/__tests__/**",
        "**/types/**",
      ],
      thresholds: {
        global: {
          branches: 80,
          functions: 80,
          lines: 80,
          statements: 80,
        },
      },
    },

    // Test matching patterns
    include: [
      "src/**/*.{test,spec}.{js,jsx,ts,tsx}",
      "__tests__/**/*.{test,spec}.{js,jsx,ts,tsx}",
    ],

    exclude: ["node_modules", ".next", "coverage", "**/e2e/**"],

    // Performance 
    testTimeout: 10000,
    hookTimeout: 10000,

    // Retry flaky tests in CI
    retry: process.env.CI ? 2 : 0,

    fileParallelism: true, // Run files in parallel
    maxConcurrency: 8, // Max tests running at once

    // Mock behavior
    mockReset: true,
    restoreMocks: true,
    clearMocks: true,

    // Watch mode behavior
    watch: false,

    // Environment variables for tests
    env: {
      NODE_ENV: "test",
      NEXT_PUBLIC_TEST_MODE: "true",
    },
  },

  resolve: {
    alias: {
      "next/router": "<rootDir>/src/__mocks__/next/router.ts",
      "next/navigation": "<rootDir>/src/__mocks__/next/navigation.ts",
    },
  },
});
