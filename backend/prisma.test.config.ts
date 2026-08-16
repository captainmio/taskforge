import { defineConfig, env } from "prisma/config";
import { loadTestEnvironment } from "./tests/helpers/test-environment.js";

loadTestEnvironment();

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: env("DATABASE_URL"),
  },
});
