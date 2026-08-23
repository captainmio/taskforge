import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { JWT_COOKIE_NAME, JWT_SECRET } from "../config/auth.js";
import { authTokenPayloadSchema } from "../validations/auth.validation.js";

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const token = req.cookies?.[JWT_COOKIE_NAME];

  if (!token) {
    return res.status(401).json({ success: false, error: "Missing bearer token" });
  }

  try {
    const result = authTokenPayloadSchema.safeParse(
      jwt.verify(token, JWT_SECRET),
    );

    if (!result.success) {
      return res.status(401).json({ success: false, error: "Invalid token" });
    }

    req.user = { id: result.data.sub, email: result.data.email };
    req.log.setBindings({ userId: req.user.id });
    next();
  } catch {
    return res.status(401).json({ success: false, error: "Invalid or expired token" });
  }
}
