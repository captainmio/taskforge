import type { Request, Response, NextFunction } from "express";
import jwt, { type JwtPayload } from "jsonwebtoken";
import { JWT_SECRET } from "../config/auth.js";
import { JWT_COOKIE_NAME } from "../config/auth.js";

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const token = req.cookies?.[JWT_COOKIE_NAME];

  if (!token) {
    return res.status(401).json({ success: false, error: "Missing bearer token" });
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET) as JwtPayload;

    if (typeof payload.sub !== "number") {
      return res.status(401).json({ success: false, error: "Invalid token" });
    }

    req.user = { id: payload.sub, email: String(payload.email) };
    next();
  } catch {
    return res.status(401).json({ success: false, error: "Invalid or expired token" });
  }
}
