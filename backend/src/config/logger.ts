import pino, { type LoggerOptions } from "pino";
import { dirname } from "node:path";
import { env } from "./env.js";
import { UserLogStream } from "./userLogStream.js";

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

  return pino.multistream([
    { stream: process.stdout },
    {
      stream: new UserLogStream({
        baseDirectory: dirname(env.LOG_FILE_PATH),
        retentionCount: env.LOG_FILE_RETENTION_COUNT,
      }),
    },
  ]);
};

const transport = createLogTransport();

export const logger = transport
  ? pino(loggerOptions, transport)
  : pino(loggerOptions);
