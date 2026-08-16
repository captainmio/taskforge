import "dotenv/config";
export const BCRYPT_SALT_ROUNDS = Number(
  process.env.BCRYPT_SALT_ROUNDS ?? 12
);

const jwtSecret = process.env.JWT_SECRET;
export const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN ?? "1d";
export const JWT_COOKIE_NAME = "accessToken";

if (!jwtSecret) {
  throw new Error("JWT_SECRET is not configured");
}

export const JWT_SECRET: string = jwtSecret;
