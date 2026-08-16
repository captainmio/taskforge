import { createHash, randomBytes } from "node:crypto";
import { env } from "../config/env.js";
import {
  InvitationAcceptanceError,
  WorkspaceNameAlreadyExistsError,
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
  createWorkspaceRecord,
  findInvitationByTokenHash,
  findInvitationsAwaitingQueue,
  markInvitationExpired,
  markInvitationsQueued,
  replaceInvitationToken,
  type CreateWorkspaceInvitationData,
} from "../repositories/workspace.repository.js";
import type { CreateWorkspaceBody } from "../validations/workspace.validation.js";

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

  return invitation.workspace;
};
