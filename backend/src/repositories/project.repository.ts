import { prisma } from "../config/database.js";
import type {
  ProjectDefaultView,
  ProjectIcon,
  ProjectStatus,
} from "../generated/prisma/enums.js";

export interface CreateProjectData {
  workspaceId: number;
  createdById: number;
  name: string;
  description: string;
  icon: ProjectIcon;
  status: ProjectStatus;
  startDate: Date | null;
  dueDate: Date | null;
  defaultView: ProjectDefaultView;
}

export const createProjectRecord = async (data: CreateProjectData) =>
  prisma.project.create({
    data,
    select: {
      id: true,
      workspaceId: true,
      name: true,
      description: true,
      icon: true,
      status: true,
      startDate: true,
      dueDate: true,
      defaultView: true,
      createdById: true,
      createdAt: true,
    },
  });

export const findProjectsByWorkspace = async (workspaceId: number) =>
  prisma.project.findMany({
    where: { workspaceId },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    select: {
      id: true,
      name: true,
      description: true,
      icon: true,
      status: true,
      startDate: true,
      dueDate: true,
      defaultView: true,
      createdAt: true,
    },
  });
