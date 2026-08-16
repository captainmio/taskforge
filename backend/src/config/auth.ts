import type { CookieOptions } from "express";
import { env } from "./env.js";

export const BCRYPT_SALT_ROUNDS = env.BCRYPT_SALT_ROUNDS;

export const AUTH_SESSION_DURATION_SECONDS = 24 * 60 * 60;
export const JWT_COOKIE_NAME = "accessToken";
export const JWT_COOKIE_OPTIONS: CookieOptions = {
  httpOnly: true,
  secure: env.NODE_ENV === "production",
  sameSite: "lax",
};

export const JWT_SECRET = env.JWT_SECRET;
