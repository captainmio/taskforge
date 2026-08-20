import pino, { type LoggerOptions, type TransportTargetOptions } from "pino";
import { env } from "./env.js";

const loggerOptions: LoggerOptions = {
  // Automated tests intentionally suppress request logs so their output stays
  // focused on failures. Every other environment uses the configured minimum
  // level, with INFO as the safe production default.
  level: env.NODE_ENV === "test" ? "silent" : env.LOG_LEVEL,
  base: {
    service: "taskforge-api",
    environment: env.NODE_ENV,
  },
  timestamp: pino.stdTimeFunctions.isoTime,
  // Redaction is a final safety net for accidental object logging. Feature logs
  // should still include only the identifiers needed to investigate an event.
  redact: {
    paths: [
      "req.headers.authorization",
      "req.headers.cookie",
      "authorization",
      "cookie",
      "password",
      "token",
      "*.password",
      "*.token",
    ],
    remove: true,
  },
};

const createLogTransport = () => {
  // Tests use a silent in-process logger and never create files or worker
  // threads. File output can also be disabled when a deployment platform
  // already provides durable stdout retention.
  if (env.NODE_ENV === "test" || !env.LOG_FILE_ENABLED) return undefined;

  const targets: TransportTargetOptions[] = [
    {
      target: "pino/file",
      options: { destination: 1 },
    },
    {
      target: "pino-roll",
      options: {
        file: env.LOG_FILE_PATH,
        frequency: "daily",
        size: env.LOG_FILE_MAX_SIZE,
        dateFormat: "yyyy-MM-dd",
        mkdir: true,
        // Keep a bounded history so diagnostic logs remain available without
        // allowing the application to consume disk space indefinitely.
        limit: { count: env.LOG_FILE_RETENTION_COUNT },
      },
    },
  ];

  // Both destinations run in Pino's worker thread. Requests only enqueue the
  // structured record instead of waiting for terminal and file I/O to finish.
  return pino.transport({ targets });
};

const transport = createLogTransport();

export const logger = transport
  ? pino(loggerOptions, transport)
  : pino(loggerOptions);
