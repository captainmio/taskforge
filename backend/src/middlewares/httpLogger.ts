import { randomUUID } from "node:crypto";
import pinoHttp from "pino-http";
import { logger } from "../config/logger.js";

const SAFE_REQUEST_ID = /^[A-Za-z0-9._:-]{1,128}$/;
const getRequestPath = (url: string | undefined): string =>
  url?.split("?", 1)[0] ?? "";

export const httpLogger = pinoHttp({
  logger,
  genReqId: (req, res) => {
    const suppliedRequestId = req.headers["x-request-id"];
    const requestId =
      typeof suppliedRequestId === "string" &&
      SAFE_REQUEST_ID.test(suppliedRequestId)
        ? suppliedRequestId
        : randomUUID();

    // Returning the same identifier lets frontend reports, reverse-proxy logs,
    // and backend events be correlated without exposing internal user details.
    res.setHeader("X-Request-Id", requestId);
    return requestId;
  },
  customLogLevel: (_req, res, error) => {
    if (error || res.statusCode >= 500) return "error";
    if (res.statusCode >= 400) return "warn";
    return "info";
  },
  customSuccessMessage: (req, res) =>
    `${req.method} ${getRequestPath(req.url)} completed with ${res.statusCode}`,
  customErrorMessage: (req, res) =>
    `${req.method} ${getRequestPath(req.url)} failed with ${res.statusCode}`,
  serializers: {
    // Store only fields needed for diagnosis. In particular, omitting headers
    // and query strings prevents credentials or future URL tokens from being
    // copied into the automatic request-completion record.
    req: (req) => ({
      id: req.id,
      method: req.method,
      path: getRequestPath(req.url),
      remoteAddress: req.remoteAddress,
    }),
    res: (res) => ({ statusCode: res.statusCode }),
  },
  // Business handlers can call req.log without copying the full HTTP request
  // into every event. The automatic completion log still records request and
  // response details once, while child events carry only their request ID.
  quietReqLogger: true,
});
