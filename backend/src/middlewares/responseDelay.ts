import type { RequestHandler } from "express";
import { env } from "../config/env.js";

export const responseDelay: RequestHandler = (_req, _res, next) => {
  if (env.API_RESPONSE_DELAY_MS === 0) {
    next();
    return;
  }

  setTimeout(next, env.API_RESPONSE_DELAY_MS);
};
