import type {
  NextFunction,
  Request,
  RequestHandler,
  Response,
} from "express";
import type { AuthenticatedRequest } from "../types/authenticated-request.js";

type AuthenticatedHandler<TBody, TParams> = (
  req: AuthenticatedRequest<TBody, TParams>,
  res: Response,
  next: NextFunction,
) => unknown;

const hasAuthenticatedUser = <TBody, TParams>(
  req: Request<TParams, unknown, TBody>,
): req is AuthenticatedRequest<TBody, TParams> => req.user !== undefined;

export const authenticatedHandler = <
  TBody = unknown,
  TParams = Record<string, never>,
>(
  handler: AuthenticatedHandler<TBody, TParams>,
): RequestHandler<TParams, unknown, TBody> =>
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
