import type { CookieOptions } from "express";
import type { SignOptions } from "jsonwebtoken";
import ms, { type StringValue } from "ms";
import { env } from "./env.js";

export const BCRYPT_SALT_ROUNDS = env.BCRYPT_SALT_ROUNDS;

// The same configured duration controls both JWT expiry and cookie lifetime.
export const AUTH_SESSION_DURATION_MILLISECONDS = ms(
  env.JWT_EXPIRES_IN as StringValue,
);
export const JWT_EXPIRES_IN = env.JWT_EXPIRES_IN as NonNullable<
  SignOptions["expiresIn"]
>;
export const JWT_COOKIE_NAME = "accessToken";
export const JWT_COOKIE_OPTIONS: CookieOptions = {
  httpOnly: true,
  secure: env.NODE_ENV === "production",
  sameSite: "lax",
};

export const JWT_SECRET = env.JWT_SECRET;
