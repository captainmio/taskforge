import type { RequestHandler } from "express";
import { findProjectAccessByWorkspace } from "../repositories/project.repository.js";

export const requireActiveProject: RequestHandler = async (req, res, next) => {
  const project = await findProjectAccessByWorkspace(
    Number(req.params.workspaceId),
    Number(req.params.projectId),
  );

  if (!project) {
    return res.status(404).json({ success: false, error: "Project not found" });
  }

  if (project.deletedAt) {
    return res.status(409).json({
      success: false,
      error: "Archived projects are read-only",
    });
  }

  next();
};
