import "dotenv/config";
import { z } from "zod";

const environmentSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  LOG_LEVEL: z
    .enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"])
    .default("info"),
  LOG_FILE_ENABLED: z
    .enum(["true", "false"])
    .default("true")
    .transform((value) => value === "true"),
  LOG_FILE_PATH: z.string().trim().min(1).default("logs/application.log"),
  LOG_FILE_MAX_SIZE: z
    .string()
    .regex(/^\d+(?:\.\d+)?[kmg]$/i, "Log file size must use k, m, or g units")
    .default("10m"),
  LOG_FILE_RETENTION_COUNT: z.coerce
    .number()
    .int()
    .min(1)
    .max(365)
    .default(30),
  PORT: z.coerce.number().int().min(1).max(65_535).default(3000),
  FRONTEND_API: z.url().default("http://localhost:5173"),
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  REDIS_URL: z.url({ protocol: /^rediss?$/ }).default("redis://127.0.0.1:6379"),
  CACHE_REDIS_URL: z
    .url({ protocol: /^rediss?$/ })
    .default("redis://127.0.0.1:6379/1"),
  REDIS_CACHE_TTL_SECONDS: z.coerce
    .number()
    .int()
    .min(1)
    .max(3_600)
    .default(60),
  INVITATION_LOG_PATH: z.string().min(1).default("logs/invitations.log"),
  BCRYPT_SALT_ROUNDS: z.coerce.number().int().min(4).max(31).default(12),
  JWT_SECRET: z.string().min(1, "JWT_SECRET is required"),
});

const result = environmentSchema.safeParse(process.env);

if (!result.success) {
  const details = result.error.issues
    .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
    .join(", ");

  throw new Error(`Invalid environment configuration: ${details}`);
}

export const env = result.data;
