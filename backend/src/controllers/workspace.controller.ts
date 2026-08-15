import type { Request, Response } from "express";

export const createWorkspace = (_req: Request, res: Response) => {
  // Database creation will be implemented after the frontend flow is finalized.
  return res.status(200).json({
    success: true,
    message: "CREATING WORKSPACE",
  });
};
