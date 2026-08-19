import type { RequestHandler } from "express";
import { findWorkspaceMembership } from "../repositories/workspace.repository.js";
import type { WorkspaceOverviewParams } from "../validations/workspace.validation.js";

export const requireWorkspaceMembership: RequestHandler<
  WorkspaceOverviewParams
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

    next();
  } catch (error) {
    next(error);
  }
};
