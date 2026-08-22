import { createHash, randomBytes } from "node:crypto";
import {
  deleteCachedWorkspaceOverview,
  getCachedWorkspaceOverview,
  setCachedWorkspaceOverview,
  type WorkspaceOverviewData,
} from "../cache/workspace-overview.cache.js";
import {
  deleteCachedWorkspaceMemberLists,
  getCachedWorkspaceMembers,
  setCachedWorkspaceMembers,
  type WorkspaceMemberListData,
} from "../cache/workspace-members.cache.js";
import { env } from "../config/env.js";
import {
  InvitationAcceptanceError,
  WorkspaceInvitationAlreadyExistsError,
  WorkspaceInviteLinkGenerationForbiddenError,
  WorkspaceMemberAlreadyExistsError,
  WorkspaceMemberNotFoundError,
  WorkspaceMemberRemovalForbiddenError,
  WorkspaceMemberRoleUpdateForbiddenError,
  WorkspaceMemberSelfRoleUpdateError,
  WorkspaceNameAlreadyExistsError,
  WorkspaceOwnerRemovalError,
  WorkspaceOwnerRoleUpdateError,
} from "../errors/workspace.errors.js";
import { Prisma } from "../generated/prisma/client.js";
import {
  InvitationStatus,
  WorkspaceRole,
} from "../generated/prisma/enums.js";
import {
  enqueueInvitationEmails,
  findQueuedInvitationEmail,
  type InvitationEmailJobData,
} from "../queues/invitation.queue.js";
import {
  acceptInvitationRecord,
  acceptWorkspaceInviteLinkRecord,
  createWorkspaceInvitationsRecord,
  createWorkspaceRecord,
  findInvitationByTokenHash,
  findInvitationsAwaitingQueue,
  findWorkspaceInviteLinkByTokenHash,
  findWorkspaceOverview,
  findWorkspaceMembersPage,
  markInvitationExpired,
  markInvitationsQueued,
  replaceInvitationToken,
  removeWorkspaceMemberRecord,
  updateWorkspaceMemberRoleRecord,
  upsertWorkspaceInviteLink,
  type CreateWorkspaceInvitationData,
} from "../repositories/workspace.repository.js";
import type {
  CreateWorkspaceBody,
  InviteWorkspaceMembersBody,
} from "../validations/workspace.validation.js";

const INVITATION_EXPIRY_DAYS = 7;
const RECOVERY_BATCH_SIZE = 100;

const normalizeWorkspaceName = (name: string): string =>
  name.trim().replace(/\s+/g, " ").toLowerCase();

const createInvitationToken = () => randomBytes(32).toString("base64url");

const hashInvitationToken = (token: string): string =>
  createHash("sha256").update(token).digest("hex");

const createVerificationUrl = (token: string): string => {
  const verificationUrl = new URL("/invitations/accept", env.FRONTEND_API);
  verificationUrl.searchParams.set("token", token);
  return verificationUrl.toString();
};

const createSharedInviteUrl = (token: string): string => {
  const inviteUrl = new URL("/invitations/accept", env.FRONTEND_API);
  inviteUrl.searchParams.set("token", token);
  inviteUrl.searchParams.set("type", "link");
  return inviteUrl.toString();
};

export const createWorkspace = async (
  input: CreateWorkspaceBody,
  ownerId: number,
) => {
  const displayName = input.workspaceName.trim().replace(/\s+/g, " ");
  const expiresAt = new Date(
    Date.now() + INVITATION_EXPIRY_DAYS * 24 * 60 * 60 * 1_000,
  );
  const preparedInvitations = input.invites.map((invite) => {
    const token = createInvitationToken();

    return {
      token,
      data: {
        email: invite.email,
        normalizedEmail: invite.email,
        role: invite.role,
        tokenHash: hashInvitationToken(token),
        expiresAt,
      } satisfies CreateWorkspaceInvitationData,
    };
  });

  try {
    const result = await createWorkspaceRecord({
      name: normalizeWorkspaceName(displayName),
      displayName,
      description: input.description,
      icon: input.icon,
      ownerId,
      invitations: preparedInvitations.map((invitation) => invitation.data),
    });
    const tokenByEmail = new Map(
      preparedInvitations.map((invitation) => [
        invitation.data.normalizedEmail,
        invitation.token,
      ]),
    );
    const jobs = result.invitations.flatMap((invitation) => {
      const token = tokenByEmail.get(invitation.normalizedEmail);
      if (!token) return [];

      return [{
        invitationId: invitation.id,
        email: invitation.email,
        workspaceDisplayName: result.workspace.displayName,
        role: invitation.role,
        verificationUrl: createVerificationUrl(token),
      }];
    });

    try {
      await enqueueInvitationEmails(jobs);
      await markInvitationsQueued(result.invitations.map(({ id }) => id));
    } catch (error) {
      // Workspace creation remains successful; the worker recovers pending deliveries.
      console.error("Unable to queue workspace invitations", error);
    }

    return {
      workspace: result.workspace,
      invitationCount: result.invitations.length,
    };
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw new WorkspaceNameAlreadyExistsError();
    }

    throw error;
  }
};

export const inviteWorkspaceMembers = async (
  workspaceId: number,
  invitedById: number,
  input: InviteWorkspaceMembersBody,
) => {
  const expiresAt = new Date(
    Date.now() + INVITATION_EXPIRY_DAYS * 24 * 60 * 60 * 1_000,
  );
  const preparedInvitations = input.invitations.map((invitation) => {
    const token = createInvitationToken();

    return {
      // The email link needs the original secret token, but storing that secret
      // in PostgreSQL would allow anyone with database access to use the link.
      // Store only a one-way hash in PostgreSQL and keep the original token in
      // memory just long enough to place the verification URL in the BullMQ job.
      token,
      data: {
        email: invitation.email,
        normalizedEmail: invitation.email,
        role: invitation.role,
        tokenHash: hashInvitationToken(token),
        expiresAt,
      } satisfies CreateWorkspaceInvitationData,
    };
  });

  try {
    const result = await createWorkspaceInvitationsRecord({
      workspaceId,
      invitedById,
      invitations: preparedInvitations.map(({ data }) => data),
    });

    if (result.existingMemberEmails.length > 0 || !result.workspace) {
      throw new WorkspaceMemberAlreadyExistsError();
    }

    // Invitation creation does not add a member yet, but clearing the list now
    // ensures every invitation-related workflow starts from a fresh cache state.
    await deleteCachedWorkspaceMemberLists(workspaceId);

    const tokenByEmail = new Map(
      preparedInvitations.map(({ data, token }) => [data.normalizedEmail, token]),
    );
    const jobs = result.invitations.flatMap((invitation) => {
      const token = tokenByEmail.get(invitation.normalizedEmail);
      if (!token) return [];

      return [{
        invitationId: invitation.id,
        email: invitation.email,
        workspaceDisplayName: result.workspace.displayName,
        role: invitation.role,
        verificationUrl: createVerificationUrl(token),
      }];
    });

    try {
      await enqueueInvitationEmails(jobs);
      await markInvitationsQueued(result.invitations.map(({ id }) => id));
    } catch (error) {
      // Invitation records are saved before BullMQ is contacted. If Redis or
      // BullMQ is temporarily unavailable, leave their delivery state as
      // PENDING. The invitation worker regularly searches for pending records
      // and will add them to the queue when the connection is available again.
      console.error("Unable to queue workspace invitations", error);
    }

    return { invitationCount: result.invitations.length };
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      // Prisma uses error code P2002 when PostgreSQL rejects a duplicate value.
      // In this flow it means at least one email already has an invitation for
      // this workspace. Convert the database-specific error into a clear error
      // that the controller can return to the frontend as a conflict.
      throw new WorkspaceInvitationAlreadyExistsError();
    }

    throw error;
  }
};

export const recoverPendingInvitationDeliveries = async (): Promise<number> => {
  const invitations = await findInvitationsAwaitingQueue(RECOVERY_BATCH_SIZE);
  const jobs: InvitationEmailJobData[] = [];

  for (const invitation of invitations) {
    const existingJob = await findQueuedInvitationEmail(invitation.id);
    if (existingJob) continue;

    const token = createInvitationToken();
    await replaceInvitationToken(invitation.id, hashInvitationToken(token));
    jobs.push({
      invitationId: invitation.id,
      email: invitation.email,
      workspaceDisplayName: invitation.workspace.displayName,
      role: invitation.role,
      verificationUrl: createVerificationUrl(token),
    });
  }

  await enqueueInvitationEmails(jobs);
  await markInvitationsQueued(invitations.map(({ id }) => id));

  return invitations.length;
};

export const acceptWorkspaceInvitation = async (
  token: string,
  user: { id: number; email: string },
) => {
  const invitation = await findInvitationByTokenHash(hashInvitationToken(token));

  if (!invitation) {
    throw new InvitationAcceptanceError("INVALID");
  }

  if (invitation.normalizedEmail !== user.email.trim().toLowerCase()) {
    throw new InvitationAcceptanceError("EMAIL_MISMATCH");
  }

  if (invitation.status !== InvitationStatus.PENDING) {
    throw new InvitationAcceptanceError("ALREADY_USED");
  }

  if (invitation.role === WorkspaceRole.OWNER) {
    throw new InvitationAcceptanceError("INVALID");
  }

  if (invitation.expiresAt <= new Date()) {
    await markInvitationExpired(invitation.id);
    throw new InvitationAcceptanceError("EXPIRED");
  }

  const accepted = await acceptInvitationRecord({
    invitationId: invitation.id,
    workspaceId: invitation.workspaceId,
    userId: user.id,
    role: invitation.role,
  });

  if (!accepted) {
    throw new InvitationAcceptanceError("ALREADY_USED");
  }

  // Wait until the invitation acceptance and new membership are safely saved
  // in PostgreSQL before removing the cached overview. The next overview request
  // will miss the cache, read the updated member list, and cache that fresh list.
  await deleteCachedWorkspaceOverview(invitation.workspaceId);
  await deleteCachedWorkspaceMemberLists(invitation.workspaceId);

  return invitation.workspace;
};

export const createWorkspaceInviteLink = async (
  workspaceId: number,
  createdById: number,
  actorRole: WorkspaceRole,
) => {
  if (
    actorRole !== WorkspaceRole.OWNER &&
    actorRole !== WorkspaceRole.ADMIN
  ) {
    throw new WorkspaceInviteLinkGenerationForbiddenError();
  }

  const token = createInvitationToken();
  const expiresAt = new Date(
    Date.now() + INVITATION_EXPIRY_DAYS * 24 * 60 * 60 * 1_000,
  );

  const inviteLink = await upsertWorkspaceInviteLink({
    workspaceId,
    createdById,
    tokenHash: hashInvitationToken(token),
    expiresAt,
  });

  return {
    invitationLink: createSharedInviteUrl(token),
    expiresAt: inviteLink.expiresAt.toISOString(),
  };
};

export const acceptWorkspaceInviteLink = async (
  token: string,
  userId: number,
) => {
  const inviteLink = await findWorkspaceInviteLinkByTokenHash(
    hashInvitationToken(token),
  );

  if (!inviteLink || inviteLink.revokedAt) {
    throw new InvitationAcceptanceError("INVALID");
  }

  if (inviteLink.expiresAt <= new Date()) {
    throw new InvitationAcceptanceError("EXPIRED");
  }

  await acceptWorkspaceInviteLinkRecord(inviteLink.workspaceId, userId);
  await Promise.all([
    deleteCachedWorkspaceOverview(inviteLink.workspaceId),
    deleteCachedWorkspaceMemberLists(inviteLink.workspaceId),
  ]);

  return inviteLink.workspace;
};

export const getWorkspaceOverview = async (
  workspaceId: number,
): Promise<WorkspaceOverviewData> => {
  // Cache-aside keeps repeated overview reads out of the database. A cache miss
  // continues through the repository and repopulates Redis before returning.
  const cachedWorkspaceOverview = await getCachedWorkspaceOverview(workspaceId);
  if (cachedWorkspaceOverview) return cachedWorkspaceOverview;

  const { members, projects, createdAt, ...workspace } = await findWorkspaceOverview(
    workspaceId,
  );

  // Normalize Prisma dates before caching so cache hits and database reads expose
  // the same JSON-safe response shape.
  const overview: WorkspaceOverviewData = {
    ...workspace,
    createdAt: createdAt.toISOString(),
    members: members.map(({ user, role, createdAt: joinedAt }) => ({
      ...user,
      role,
      joinedAt: joinedAt.toISOString(),
    })),
    projects: projects.map((project) => ({
      ...project,
      startDate: project.startDate?.toISOString() ?? null,
      dueDate: project.dueDate?.toISOString() ?? null,
      createdAt: project.createdAt.toISOString(),
    })),
  };

  await setCachedWorkspaceOverview(workspaceId, overview);
  return overview;
};

export const getWorkspaceMembers = async (
  workspaceId: number,
  page: number,
  pageSize: number,
): Promise<WorkspaceMemberListData> => {
  const cachedMembers = await getCachedWorkspaceMembers(
    workspaceId,
    page,
    pageSize,
  );
  if (cachedMembers) return cachedMembers;

  const { members, total } = await findWorkspaceMembersPage(
    workspaceId,
    (page - 1) * pageSize,
    pageSize,
  );
  const result: WorkspaceMemberListData = {
    members: members.map(({ user, role, createdAt }) => ({
      ...user,
      role,
      joinedAt: createdAt.toISOString(),
    })),
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    },
  };

  await setCachedWorkspaceMembers(workspaceId, result);
  return result;
};

export const removeWorkspaceMember = async (
  workspaceId: number,
  memberUserId: number,
  actorRole: WorkspaceRole,
) => {
  if (
    actorRole !== WorkspaceRole.OWNER &&
    actorRole !== WorkspaceRole.ADMIN
  ) {
    throw new WorkspaceMemberRemovalForbiddenError();
  }

  const removal = await removeWorkspaceMemberRecord(
    workspaceId,
    memberUserId,
  );

  if (removal.status === "NOT_FOUND") {
    throw new WorkspaceMemberNotFoundError();
  }

  if (removal.status === "OWNER_PROTECTED") {
    throw new WorkspaceOwnerRemovalError();
  }

  // Membership authorization reads PostgreSQL on every protected request, so
  // the removed user loses workspace access immediately after this commit.
  // Clear both cached representations before returning so no workspace page
  // continues displaying a member who no longer has access.
  await Promise.all([
    deleteCachedWorkspaceOverview(workspaceId),
    deleteCachedWorkspaceMemberLists(workspaceId),
  ]);

  return {
    memberId: memberUserId,
    previousRole: removal.previousRole,
  };
};

export const updateWorkspaceMemberRole = async (
  workspaceId: number,
  memberUserId: number,
  actorUserId: number,
  actorRole: WorkspaceRole,
  role: Exclude<WorkspaceRole, "OWNER">,
) => {
  if (
    actorRole !== WorkspaceRole.OWNER &&
    actorRole !== WorkspaceRole.ADMIN
  ) {
    throw new WorkspaceMemberRoleUpdateForbiddenError();
  }

  if (actorUserId === memberUserId) {
    throw new WorkspaceMemberSelfRoleUpdateError();
  }

  const update = await updateWorkspaceMemberRoleRecord(
    workspaceId,
    memberUserId,
    role,
  );

  if (update.status === "NOT_FOUND") {
    throw new WorkspaceMemberNotFoundError();
  }

  if (update.status === "OWNER_PROTECTED") {
    throw new WorkspaceOwnerRoleUpdateError();
  }

  await Promise.all([
    deleteCachedWorkspaceOverview(workspaceId),
    deleteCachedWorkspaceMemberLists(workspaceId),
  ]);

  return {
    member: {
      ...update.membership.user,
      role: update.membership.role,
      joinedAt: update.membership.createdAt.toISOString(),
    },
    previousRole: update.previousRole,
  };
};
