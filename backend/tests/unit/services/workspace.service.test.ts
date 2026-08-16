import { createHash } from "node:crypto";
import { Prisma } from "../../../src/generated/prisma/client.js";
import {
  InvitationStatus,
  WorkspaceIcon,
  WorkspaceRole,
} from "../../../src/generated/prisma/enums.js";
import {
  InvitationAcceptanceError,
  WorkspaceNameAlreadyExistsError,
} from "../../../src/errors/workspace.errors.js";
import {
  enqueueInvitationEmails,
  findQueuedInvitationEmail,
} from "../../../src/queues/invitation.queue.js";
import {
  acceptInvitationRecord,
  createWorkspaceRecord,
  findInvitationByTokenHash,
  findInvitationsAwaitingQueue,
  markInvitationExpired,
  markInvitationsQueued,
  replaceInvitationToken,
} from "../../../src/repositories/workspace.repository.js";
import {
  acceptWorkspaceInvitation,
  createWorkspace,
  recoverPendingInvitationDeliveries,
} from "../../../src/services/workspace.service.js";
import { validWorkspace } from "../../helpers/workspace.fixture.js";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../../src/repositories/workspace.repository.js", () => ({
  acceptInvitationRecord: vi.fn(),
  createWorkspaceRecord: vi.fn(),
  findInvitationByTokenHash: vi.fn(),
  findInvitationsAwaitingQueue: vi.fn(),
  markInvitationExpired: vi.fn(),
  markInvitationsQueued: vi.fn(),
  replaceInvitationToken: vi.fn(),
}));

vi.mock("../../../src/queues/invitation.queue.js", () => ({
  enqueueInvitationEmails: vi.fn(),
  findQueuedInvitationEmail: vi.fn(),
}));

const persistedWorkspace = {
  workspace: {
    id: 10,
    displayName: "Engineering Team",
    description: validWorkspace.description,
    icon: WorkspaceIcon.code,
  },
  invitations: [
    {
      id: 20,
      email: "admin@example.com",
      normalizedEmail: "admin@example.com",
      role: "ADMIN" as const,
    },
    {
      id: 21,
      email: "member@example.com",
      normalizedEmail: "member@example.com",
      role: "MEMBER" as const,
    },
  ],
};

describe("createWorkspace", () => {
  beforeEach(() => {
    vi.mocked(createWorkspaceRecord).mockResolvedValue(persistedWorkspace);
    vi.mocked(enqueueInvitationEmails).mockResolvedValue(undefined);
    vi.mocked(markInvitationsQueued).mockResolvedValue(undefined);
    vi.mocked(findInvitationsAwaitingQueue).mockResolvedValue([]);
    vi.mocked(findQueuedInvitationEmail).mockResolvedValue(undefined);
    vi.mocked(replaceInvitationToken).mockResolvedValue(undefined);
  });

  it("stores normalized workspace data and queues every invitation", async () => {
    const result = await createWorkspace(
      { ...validWorkspace, workspaceName: "  Engineering   Team  " },
      7,
    );

    expect(createWorkspaceRecord).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "engineering team",
        displayName: "Engineering Team",
        ownerId: 7,
        invitations: expect.arrayContaining([
          expect.objectContaining({
            normalizedEmail: "admin@example.com",
            tokenHash: expect.stringMatching(/^[a-f0-9]{64}$/),
          }),
        ]),
      }),
    );
    expect(enqueueInvitationEmails).toHaveBeenCalledWith([
      expect.objectContaining({
        invitationId: 20,
        email: "admin@example.com",
        verificationUrl: expect.stringContaining("/invitations/accept?token="),
      }),
      expect.objectContaining({ invitationId: 21 }),
    ]);
    expect(markInvitationsQueued).toHaveBeenCalledWith([20, 21]);
    expect(result).toEqual({
      workspace: persistedWorkspace.workspace,
      invitationCount: 2,
    });
  });

  it("keeps workspace creation successful when Redis is temporarily unavailable", async () => {
    const queueError = new Error("Redis unavailable");
    vi.mocked(enqueueInvitationEmails).mockRejectedValue(queueError);
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);

    await expect(createWorkspace(validWorkspace, 7)).resolves.toEqual({
      workspace: persistedWorkspace.workspace,
      invitationCount: 2,
    });
    expect(markInvitationsQueued).not.toHaveBeenCalled();
    expect(consoleError).toHaveBeenCalledWith(
      "Unable to queue workspace invitations",
      queueError,
    );
  });

  it("translates a duplicate workspace name database error", async () => {
    vi.mocked(createWorkspaceRecord).mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError("Unique constraint failed", {
        code: "P2002",
        clientVersion: "7.9.1",
        meta: { target: ["name"] },
      }),
    );

    await expect(createWorkspace(validWorkspace, 7)).rejects.toBeInstanceOf(
      WorkspaceNameAlreadyExistsError,
    );
  });
});

describe("recoverPendingInvitationDeliveries", () => {
  it("creates a fresh verification token and queues pending database records", async () => {
    vi.mocked(findInvitationsAwaitingQueue).mockResolvedValue([
      {
        id: 30,
        email: "pending@example.com",
        role: "MEMBER",
        workspace: { displayName: "Engineering Team" },
      },
    ]);
    vi.mocked(findQueuedInvitationEmail).mockResolvedValue(undefined);
    vi.mocked(replaceInvitationToken).mockResolvedValue(undefined);
    vi.mocked(enqueueInvitationEmails).mockResolvedValue(undefined);
    vi.mocked(markInvitationsQueued).mockResolvedValue(undefined);

    await expect(recoverPendingInvitationDeliveries()).resolves.toBe(1);
    expect(replaceInvitationToken).toHaveBeenCalledWith(
      30,
      expect.stringMatching(/^[a-f0-9]{64}$/),
    );
    expect(enqueueInvitationEmails).toHaveBeenCalledWith([
      expect.objectContaining({
        invitationId: 30,
        verificationUrl: expect.stringContaining("/invitations/accept?token="),
      }),
    ]);
    expect(markInvitationsQueued).toHaveBeenCalledWith([30]);
  });
});

describe("acceptWorkspaceInvitation", () => {
  const token = "workspace-invitation-token";
  const user = { id: 8, email: "member@example.com" };
  const pendingInvitation = {
    id: 20,
    workspaceId: 10,
    normalizedEmail: user.email,
    role: WorkspaceRole.MEMBER,
    status: InvitationStatus.PENDING,
    expiresAt: new Date(Date.now() + 60_000),
    workspace: { id: 10, displayName: "Engineering Team" },
  };

  beforeEach(() => {
    vi.mocked(findInvitationByTokenHash).mockResolvedValue(pendingInvitation);
    vi.mocked(acceptInvitationRecord).mockResolvedValue(true);
    vi.mocked(markInvitationExpired).mockResolvedValue(undefined);
  });

  it("adds the matching user with the invitation role and returns the workspace", async () => {
    await expect(acceptWorkspaceInvitation(token, user)).resolves.toEqual(
      pendingInvitation.workspace,
    );
    expect(findInvitationByTokenHash).toHaveBeenCalledWith(
      createHash("sha256").update(token).digest("hex"),
    );
    expect(acceptInvitationRecord).toHaveBeenCalledWith({
      invitationId: 20,
      workspaceId: 10,
      userId: 8,
      role: WorkspaceRole.MEMBER,
    });
  });

  it("rejects a token that has no matching invitation", async () => {
    vi.mocked(findInvitationByTokenHash).mockResolvedValue(null);

    await expect(acceptWorkspaceInvitation(token, user)).rejects.toMatchObject({
      reason: "INVALID",
    } satisfies Partial<InvitationAcceptanceError>);
    expect(acceptInvitationRecord).not.toHaveBeenCalled();
  });

  it("rejects an invitation belonging to a different email address", async () => {
    await expect(
      acceptWorkspaceInvitation(token, { ...user, email: "other@example.com" }),
    ).rejects.toMatchObject({
      reason: "EMAIL_MISMATCH",
    } satisfies Partial<InvitationAcceptanceError>);
    expect(acceptInvitationRecord).not.toHaveBeenCalled();
  });

  it("marks an expired invitation before rejecting it", async () => {
    vi.mocked(findInvitationByTokenHash).mockResolvedValue({
      ...pendingInvitation,
      expiresAt: new Date(Date.now() - 60_000),
    });

    await expect(acceptWorkspaceInvitation(token, user)).rejects.toMatchObject({
      reason: "EXPIRED",
    } satisfies Partial<InvitationAcceptanceError>);
    expect(markInvitationExpired).toHaveBeenCalledWith(20);
    expect(acceptInvitationRecord).not.toHaveBeenCalled();
  });

  it("rejects an invitation that has already been accepted", async () => {
    vi.mocked(findInvitationByTokenHash).mockResolvedValue({
      ...pendingInvitation,
      status: InvitationStatus.ACCEPTED,
    });

    await expect(acceptWorkspaceInvitation(token, user)).rejects.toMatchObject({
      reason: "ALREADY_USED",
    } satisfies Partial<InvitationAcceptanceError>);
    expect(acceptInvitationRecord).not.toHaveBeenCalled();
  });

  it("rejects when another request claims the invitation first", async () => {
    vi.mocked(acceptInvitationRecord).mockResolvedValue(false);

    await expect(acceptWorkspaceInvitation(token, user)).rejects.toMatchObject({
      reason: "ALREADY_USED",
    } satisfies Partial<InvitationAcceptanceError>);
  });
});
