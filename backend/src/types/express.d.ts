import type { AuthenticatedUser } from "./authenticated-request.js";
import type { WorkspaceRole } from "../generated/prisma/enums.js";

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
      workspaceMembership?: { role: WorkspaceRole };
    }
  }
}

export {};
