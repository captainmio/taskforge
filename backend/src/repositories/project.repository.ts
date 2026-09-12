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

export interface UpdateProjectData {
  name: string;
  description: string;
  icon: ProjectIcon;
  status: ProjectStatus;
  startDate: Date | null;
  dueDate: Date | null;
  defaultView: ProjectDefaultView;
}

export const createProjectRecord = async (data: CreateProjectData) =>
  prisma.$transaction(async (transaction) => {
    const project = await transaction.project.create({
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

    await transaction.workspaceActivity.create({
      data: {
        workspaceId: data.workspaceId,
        actorUserId: data.createdById,
        action: "project_created",
        details: { projectId: project.id, name: project.name },
      },
    });

    return project;
  });

export const findProjectsByWorkspace = async (workspaceId: number) =>
  prisma.project.findMany({
    where: { workspaceId, deletedAt: null },
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
      deletedAt: true,
    },
  });

export const findArchivedProjectsByWorkspace = async (workspaceId: number) =>
  prisma.project.findMany({
    where: { workspaceId, deletedAt: { not: null } },
    orderBy: [{ deletedAt: "desc" }, { id: "desc" }],
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

export const restoreProjectRecord = async (
  workspaceId: number,
  projectId: number,
  actorUserId: number,
) =>
  prisma.$transaction(async (transaction) => {
    const project = await transaction.project.findFirst({
      where: { id: projectId, workspaceId, deletedAt: { not: null } },
      select: { name: true },
    });
    if (!project) return { count: 0 };

    const restoration = await transaction.project.updateMany({
      where: { id: projectId, workspaceId, deletedAt: { not: null } },
      data: { deletedAt: null },
    });
    if (restoration.count === 0) return restoration;

    await transaction.workspaceActivity.create({
      data: {
        workspaceId,
        actorUserId,
        action: "project_restored",
        details: { projectId, name: project.name },
      },
    });

    return restoration;
  });

export const findProjectByWorkspace = async (
  workspaceId: number,
  projectId: number,
) =>
  prisma.project.findFirst({
    where: { id: projectId, workspaceId },
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
      deletedAt: true,
    },
  });

export const findProjectAccessByWorkspace = async (
  workspaceId: number,
  projectId: number,
) =>
  prisma.project.findFirst({
    where: { id: projectId, workspaceId },
    select: { deletedAt: true },
  });

export const deleteProjectRecord = async (
  workspaceId: number,
  projectId: number,
  actorUserId?: number,
): Promise<{ count: number; projectName?: string }> => {
  if (actorUserId === undefined) {
    return prisma.project.updateMany({
      where: { id: projectId, workspaceId, deletedAt: null },
      data: { deletedAt: new Date() },
    });
  }

  return prisma.$transaction(async (transaction) => {
    const project = await transaction.project.findFirst({
      where: { id: projectId, workspaceId, deletedAt: null },
      select: { name: true },
    });
    if (!project) return { count: 0 };

    const deletion = await transaction.project.updateMany({
      where: { id: projectId, workspaceId, deletedAt: null },
      data: { deletedAt: new Date() },
    });
    if (deletion.count === 0) return deletion;

    await transaction.workspaceActivity.create({
      data: {
        workspaceId,
        actorUserId,
        action: "project_deleted",
        details: { projectId, name: project.name },
      },
    });

    return { ...deletion, projectName: project.name };
  });
};

export const updateProjectRecord = async (
  workspaceId: number,
  projectId: number,
  data: UpdateProjectData,
) =>
  prisma.project.updateMany({
    where: { id: projectId, workspaceId, deletedAt: null },
    data,
  });
