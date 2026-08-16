import { WorkspaceIcon } from "../../src/generated/prisma/enums.js";
import type { CreateWorkspaceBody } from "../../src/validations/workspace.validation.js";

export const validWorkspace: CreateWorkspaceBody = {
  workspaceName: "Engineering Team",
  description: "Builds and maintains the product.",
  icon: WorkspaceIcon.code,
  invites: [
    { email: "admin@example.com", role: "ADMIN" },
    { email: "member@example.com", role: "MEMBER" },
  ],
};
