import type {
  NextFunction,
  Request,
  RequestHandler,
  Response,
} from "express";
import type { AuthenticatedRequest } from "../types/authenticated-request.js";

type AuthenticatedHandler<TBody> = (
  req: AuthenticatedRequest<TBody>,
  res: Response,
  next: NextFunction,
) => unknown;

const hasAuthenticatedUser = <TBody>(
  req: Request<Record<string, never>, unknown, TBody>,
): req is AuthenticatedRequest<TBody> => req.user !== undefined;

export const authenticatedHandler = <TBody = unknown>(
  handler: AuthenticatedHandler<TBody>,
): RequestHandler<Record<string, never>, unknown, TBody> =>
  async (req, res, next) => {
    if (!hasAuthenticatedUser(req)) {
      res.status(401).json({
        success: false,
        error: "Authentication required",
      });
      return;
    }

    try {
      await handler(req, res, next);
    } catch (error) {
      next(error);
    }
  };
