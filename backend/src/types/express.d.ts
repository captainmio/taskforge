import type { AuthenticatedUser } from "./authenticated-request.js";

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

export {};
