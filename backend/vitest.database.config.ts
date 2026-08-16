import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    clearMocks: true,
    fileParallelism: false,
    setupFiles: ["./tests/setup-database.ts"],
    include: ["tests/**/*.database.test.ts"],
  },
});
