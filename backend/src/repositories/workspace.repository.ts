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

interface UpsertWorkspaceInviteLinkData {
  workspaceId: number;
  createdById: number;
  tokenHash: string;
  expiresAt: Date;
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

    // An accepted invitation can outlive its membership when a member is
    // removed. Clear that used record so the same email can be invited again
    // without violating the workspace/email unique constraint. The membership
    // check above prevents this cleanup for anyone who is still a member.
    await transaction.workspaceInvitation.deleteMany({
      where: {
        workspaceId: data.workspaceId,
        normalizedEmail: { in: normalizedEmails },
        status: InvitationStatus.ACCEPTED,
      },
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
  
// update and insert
export const upsertWorkspaceInviteLink = async (
  data: UpsertWorkspaceInviteLinkData,
) =>
  prisma.workspaceInviteLink.upsert({
    where: { workspaceId: data.workspaceId },
    create: data,
    update: {
      createdById: data.createdById,
      tokenHash: data.tokenHash,
      expiresAt: data.expiresAt,
      revokedAt: null,
    },
    select: { expiresAt: true },
  });

export const findWorkspaceInviteLinkByTokenHash = async (tokenHash: string) =>
  prisma.workspaceInviteLink.findUnique({
    where: { tokenHash },
    select: {
      workspaceId: true,
      expiresAt: true,
      revokedAt: true,
      workspace: {
        select: {
          id: true,
          displayName: true,
        },
      },
    },
  });

export const acceptWorkspaceInviteLinkRecord = async (
  workspaceId: number,
  userId: number,
): Promise<void> => {
  await prisma.workspaceMember.upsert({
    where: {
      workspaceId_userId: { workspaceId, userId },
    },
    create: {
      workspaceId,
      userId,
      role: WorkspaceRole.MEMBER,
    },
    // Shared links are idempotent and never downgrade an existing member.
    update: {},
  });
};

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

export const findWorkspaceMembersPage = async (
  workspaceId: number,
  skip: number,
  take: number,
) => {
  const [total, members] = await prisma.$transaction([
    prisma.workspaceMember.count({ where: { workspaceId } }),
    prisma.workspaceMember.findMany({
      where: { workspaceId },
      // Pagination requires a stable database order. These fields only keep page
      // boundaries consistent; user-selected sorting remains in the frontend.
      orderBy: [{ createdAt: "asc" }, { userId: "asc" }],
      skip,
      take,
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
    }),
  ]);

  return { members, total };
};

export const removeWorkspaceMemberRecord = async (
  workspaceId: number,
  memberUserId: number,
) =>
  prisma.$transaction(async (transaction) => {
    const membership = await transaction.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId,
          userId: memberUserId,
        },
      },
      select: { role: true },
    });

    if (!membership) return { status: "NOT_FOUND" as const };
    if (membership.role === WorkspaceRole.OWNER) {
      return { status: "OWNER_PROTECTED" as const };
    }

    // Keep the OWNER condition in the delete itself, even though the role was
    // checked above. This prevents a future concurrent role update from
    // removing the owner between the read and delete statements.
    const deletion = await transaction.workspaceMember.deleteMany({
      where: {
        workspaceId,
        userId: memberUserId,
        role: { not: WorkspaceRole.OWNER },
      },
    });

    if (deletion.count === 0) {
      // A simultaneous request may have deleted the membership after the first
      // read, while a future role-management flow could have promoted it to the
      // protected owner role. Read once more so callers receive the correct
      // not-found or owner-protected result for either race.
      const currentMembership = await transaction.workspaceMember.findUnique({
        where: {
          workspaceId_userId: {
            workspaceId,
            userId: memberUserId,
          },
        },
        select: { role: true },
      });

      return currentMembership?.role === WorkspaceRole.OWNER
        ? { status: "OWNER_PROTECTED" as const }
        : { status: "NOT_FOUND" as const };
    }

    return {
      status: "REMOVED" as const,
      previousRole: membership.role,
    };
  });

export const updateWorkspaceMemberRoleRecord = async (
  workspaceId: number,
  memberUserId: number,
  role: Exclude<WorkspaceRoleValue, "OWNER">,
) =>
  prisma.$transaction(async (transaction) => {
    const membership = await transaction.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId,
          userId: memberUserId,
        },
      },
      select: { role: true },
    });

    if (!membership) return { status: "NOT_FOUND" as const };
    if (membership.role === WorkspaceRole.OWNER) {
      return { status: "OWNER_PROTECTED" as const };
    }

    // Keep owner protection in the write predicate so a concurrent membership
    // change cannot overwrite the protected role after the initial read.
    const update = await transaction.workspaceMember.updateMany({
      where: {
        workspaceId,
        userId: memberUserId,
        role: { not: WorkspaceRole.OWNER },
      },
      data: { role },
    });

    if (update.count === 0) {
      const currentMembership = await transaction.workspaceMember.findUnique({
        where: {
          workspaceId_userId: {
            workspaceId,
            userId: memberUserId,
          },
        },
        select: { role: true },
      });

      return currentMembership?.role === WorkspaceRole.OWNER
        ? { status: "OWNER_PROTECTED" as const }
        : { status: "NOT_FOUND" as const };
    }

    const updatedMembership = await transaction.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId,
          userId: memberUserId,
        },
      },
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

    if (!updatedMembership) return { status: "NOT_FOUND" as const };

    return {
      status: "UPDATED" as const,
      previousRole: membership.role,
      membership: updatedMembership,
    };
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
