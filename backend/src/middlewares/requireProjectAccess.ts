import type { RequestHandler } from "express";
import { WorkspaceRole } from "../generated/prisma/enums.js";
import { findProjectAccessByWorkspace } from "../repositories/project.repository.js";

export const requireProjectAccess: RequestHandler = async (
  req,
  res,
  next,
) => {
  const membership = req.workspaceMembership;
  if (!membership) {
    return res.status(403).json({
      success: false,
      error: "You do not have access to this workspace",
    });
  }

  const project = await findProjectAccessByWorkspace(
    Number(req.params.workspaceId),
    Number(req.params.projectId),
  );

  if (
    !project ||
    (project.deletedAt &&
      membership.role !== WorkspaceRole.OWNER &&
      membership.role !== WorkspaceRole.ADMIN)
  ) {
    return res.status(404).json({ success: false, error: "Project not found" });
  }

  next();
};
