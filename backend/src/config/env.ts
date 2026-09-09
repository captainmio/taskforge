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
  API_RESPONSE_DELAY_MS: z.coerce
    .number()
    .int()
    .min(0)
    .default(0),
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
  SMTP_HOST: z.string().min(1, "SMTP_HOST is required"),
  SMTP_PORT: z.coerce
    .number()
    .int()
    .min(1)
    .max(65_535)
    .default(2525),
  SMTP_USERNAME: z
    .string()
    .min(1, "SMTP_USERNAME is required"),
  SMTP_PASSWORD: z
    .string()
    .min(1, "SMTP_PASSWORD is required"),
  SMTP_TOKEN: z.string().min(1).optional(),
  EMAIL_FROM_ADDRESS: z.string().min(1, "EMAIL_FROM_ADDRESS is required"),
  BACKEND_PUBLIC_URL: z.url().default("http://localhost:3000"),
  ACCOUNT_VERIFICATION_TOKEN_TTL_HOURS: z.coerce
    .number()
    .int()
    .min(1)
    .max(168)
    .default(24),
  ACCOUNT_VERIFICATION_RESEND_COOLDOWN_SECONDS: z.coerce
    .number()
    .int()
    .min(1)
    .max(3_600)
    .default(60),
  EMAIL_DELIVERY_LOG_PATH: z.string().min(1).default("logs/email-delivery.log"),
  BCRYPT_SALT_ROUNDS: z.coerce.number().int().min(4).max(31).default(12),
  JWT_SECRET: z.string().min(1, "JWT_SECRET is required"),
  JWT_EXPIRES_IN: z
    .string()
    .regex(/^\d+(?:s|m|h|d)$/, "JWT_EXPIRES_IN must use s, m, h, or d units")
    .default("1d"),
});

const result = environmentSchema.safeParse(process.env);

if (!result.success) {
  const details = result.error.issues
    .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
    .join(", ");

  throw new Error(`Invalid environment configuration: ${details}`);
}

export const env = result.data;
