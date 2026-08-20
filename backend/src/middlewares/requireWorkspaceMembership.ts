import type { RequestHandler } from "express";
import { findWorkspaceMembership } from "../repositories/workspace.repository.js";
import type { WorkspaceParams } from "../validations/workspace.validation.js";

export const requireWorkspaceMembership: RequestHandler<
  WorkspaceParams
> = async (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: "Authentication required",
    });
  }

  try {
    const membership = await findWorkspaceMembership(
      Number(req.params.workspaceId),
      req.user.id,
    );

    if (!membership) {
      return res.status(403).json({
        success: false,
        error: "You do not have access to this workspace",
      });
    }

    // Preserve the membership that was already loaded for authorization. Later
    // handlers can use this trusted role without repeating the same database
    // query or trying to infer the requester role from a paginated member page.
    req.workspaceMembership = membership;
    next();
  } catch (error) {
    next(error);
  }
};
