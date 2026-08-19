import { prisma } from "../config/database.js";
import {
  InvitationDeliveryStatus,
  InvitationStatus,
  WorkspaceRole,
  type WorkspaceIcon,
  type WorkspaceRole as WorkspaceRoleValue,
} from "../generated/prisma/enums.js";

export interface CreateWorkspaceInvitationData {
  email: string;
  normalizedEmail: string;
  role: Exclude<WorkspaceRoleValue, "OWNER">;
  tokenHash: string;
  expiresAt: Date;
}

export interface CreateWorkspaceData {
  name: string;
  displayName: string;
  description: string;
  icon: WorkspaceIcon;
  ownerId: number;
  invitations: CreateWorkspaceInvitationData[];
}

export interface CreateWorkspaceInvitationsData {
  workspaceId: number;
  invitedById: number;
  invitations: CreateWorkspaceInvitationData[];
}

interface AcceptInvitationData {
  invitationId: number;
  workspaceId: number;
  userId: number;
  role: Exclude<WorkspaceRoleValue, "OWNER">;
}

export const createWorkspaceRecord = async (data: CreateWorkspaceData) =>
  prisma.$transaction(async (transaction) => {
    const workspace = await transaction.workspace.create({
      data: {
        name: data.name,
        displayName: data.displayName,
        description: data.description,
        icon: data.icon,
        ownerId: data.ownerId,
      },
      select: {
        id: true,
        displayName: true,
        description: true,
        icon: true,
      },
    });

    await transaction.workspaceMember.create({
      data: {
        workspaceId: workspace.id,
        userId: data.ownerId,
        role: WorkspaceRole.OWNER,
      },
    });

    const invitations =
      data.invitations.length === 0
        ? []
        : await transaction.workspaceInvitation.createManyAndReturn({
            data: data.invitations.map((invitation) => ({
              ...invitation,
              workspaceId: workspace.id,
              invitedById: data.ownerId,
            })),
            select: {
              id: true,
              email: true,
              normalizedEmail: true,
              role: true,
            },
          });

    return { workspace, invitations };
  });

export const createWorkspaceInvitationsRecord = async (
  data: CreateWorkspaceInvitationsData,
) =>
  prisma.$transaction(async (transaction) => {
    const normalizedEmails = data.invitations.map(
      ({ normalizedEmail }) => normalizedEmail,
    );
    // Check every submitted email before saving any invitations. This check and
    // the insert below use the same database transaction. When even one email
    // belongs to a current member, the function returns those matches and does
    // not save any email from the submitted list.
    const existingMembers = await transaction.workspaceMember.findMany({
      where: {
        workspaceId: data.workspaceId,
        user: { email: { in: normalizedEmails } },
      },
      select: { user: { select: { email: true } } },
    });

    if (existingMembers.length > 0) {
      return {
        workspace: null,
        invitations: [],
        existingMemberEmails: existingMembers.map(({ user }) => user.email),
      };
    }

    const workspace = await transaction.workspace.findUniqueOrThrow({
      where: { id: data.workspaceId },
      select: { displayName: true },
    });
    // Send the complete invitation list to PostgreSQL as one operation. The
    // database permits only one invitation per email in a workspace. If an
    // email was invited before, PostgreSQL rejects this operation, so the other
    // emails are not accidentally saved as a partial result.
    const invitations = await transaction.workspaceInvitation.createManyAndReturn({
      data: data.invitations.map((invitation) => ({
        ...invitation,
        workspaceId: data.workspaceId,
        invitedById: data.invitedById,
      })),
      select: {
        id: true,
        email: true,
        normalizedEmail: true,
        role: true,
      },
    });

    return { workspace, invitations, existingMemberEmails: [] };
  });

export const markInvitationsQueued = async (
  invitationIds: number[],
): Promise<void> => {
  if (invitationIds.length === 0) return;

  await prisma.workspaceInvitation.updateMany({
    where: { id: { in: invitationIds } },
    data: {
      deliveryStatus: InvitationDeliveryStatus.QUEUED,
      queuedAt: new Date(),
      lastDeliveryError: null,
    },
  });
};

export const markInvitationDeliveryCompleted = async (
  invitationId: number,
): Promise<void> => {
  await prisma.workspaceInvitation.update({
    where: { id: invitationId },
    data: {
      deliveryStatus: InvitationDeliveryStatus.COMPLETED,
      deliveredAt: new Date(),
      deliveryAttempts: { increment: 1 },
      lastDeliveryError: null,
    },
  });
};

export const recordInvitationDeliveryFailure = async (
  invitationId: number,
  message: string,
  isFinalAttempt: boolean,
): Promise<void> => {
  await prisma.workspaceInvitation.update({
    where: { id: invitationId },
    data: {
      deliveryStatus: isFinalAttempt
        ? InvitationDeliveryStatus.FAILED
        : InvitationDeliveryStatus.QUEUED,
      deliveryAttempts: { increment: 1 },
      lastDeliveryError: message.slice(0, 500),
    },
  });
};

export const findInvitationsAwaitingQueue = async (limit: number) =>
  prisma.workspaceInvitation.findMany({
    where: {
      status: InvitationStatus.PENDING,
      deliveryStatus: InvitationDeliveryStatus.PENDING,
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: "asc" },
    take: limit,
    select: {
      id: true,
      email: true,
      role: true,
      workspace: { select: { displayName: true } },
    },
  });

export const replaceInvitationToken = async (
  invitationId: number,
  tokenHash: string,
): Promise<void> => {
  await prisma.workspaceInvitation.update({
    where: { id: invitationId },
    data: {
      tokenHash,
      deliveryStatus: InvitationDeliveryStatus.PENDING,
      lastDeliveryError: null,
    },
  });
};

export const findInvitationByTokenHash = async (tokenHash: string) =>
  prisma.workspaceInvitation.findUnique({
    where: { tokenHash },
    select: {
      id: true,
      workspaceId: true,
      normalizedEmail: true,
      role: true,
      status: true,
      expiresAt: true,
      workspace: {
        select: {
          id: true,
          displayName: true,
        },
      },
    },
  });

export const findWorkspaceMembership = async (
  workspaceId: number,
  userId: number,
) =>
  prisma.workspaceMember.findUnique({
    where: {
      workspaceId_userId: { workspaceId, userId },
    },
    select: { role: true },
  });

export const findWorkspaceMembers = async (workspaceId: number) =>
  prisma.workspaceMember.findMany({
    where: { workspaceId },
    orderBy: { createdAt: "asc" },
    select: {
      role: true,
      createdAt: true,
      user: {
        select: {
          id: true,
          firstname: true,
          lastname: true,
          email: true,
        },
      },
    },
  });

export const markInvitationExpired = async (
  invitationId: number,
): Promise<void> => {
  await prisma.workspaceInvitation.updateMany({
    where: {
      id: invitationId,
      status: InvitationStatus.PENDING,
      expiresAt: { lte: new Date() },
    },
    data: { status: InvitationStatus.EXPIRED },
  });
};

export const acceptInvitationRecord = async (
  data: AcceptInvitationData,
): Promise<boolean> =>
  prisma.$transaction(async (transaction) => {
    // Claim the pending invitation first so simultaneous requests cannot both
    // complete the same acceptance flow.
    const claimedInvitation = await transaction.workspaceInvitation.updateMany({
      where: {
        id: data.invitationId,
        status: InvitationStatus.PENDING,
        expiresAt: { gt: new Date() },
      },
      data: { status: InvitationStatus.ACCEPTED },
    });

    if (claimedInvitation.count === 0) return false;

    await transaction.workspaceMember.upsert({
      where: {
        workspaceId_userId: {
          workspaceId: data.workspaceId,
          userId: data.userId,
        },
      },
      create: {
        workspaceId: data.workspaceId,
        userId: data.userId,
        role: data.role,
      },
      // If the user is already a member, keep their existing role unchanged.
      update: {},
    });

    return true;
  });
