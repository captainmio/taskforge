import { createHash } from "node:crypto";
import { Prisma } from "../../../src/generated/prisma/client.js";
import {
  InvitationStatus,
  WorkspaceIcon,
  WorkspaceRole,
} from "../../../src/generated/prisma/enums.js";
import {
  InvitationAcceptanceError,
  WorkspaceInvitationAlreadyExistsError,
  WorkspaceMemberAlreadyExistsError,
  WorkspaceNameAlreadyExistsError,
} from "../../../src/errors/workspace.errors.js";
import { deleteCachedWorkspaceOverview } from "../../../src/cache/workspace-overview.cache.js";
import {
  deleteCachedWorkspaceMemberLists,
  getCachedWorkspaceMembers,
  setCachedWorkspaceMembers,
} from "../../../src/cache/workspace-members.cache.js";
import {
  enqueueInvitationEmails,
  findQueuedInvitationEmail,
} from "../../../src/queues/invitation.queue.js";
import {
  acceptInvitationRecord,
  createWorkspaceInvitationsRecord,
  createWorkspaceRecord,
  findInvitationByTokenHash,
  findInvitationsAwaitingQueue,
  findWorkspaceMembersPage,
  markInvitationExpired,
  markInvitationsQueued,
  replaceInvitationToken,
} from "../../../src/repositories/workspace.repository.js";
import {
  acceptWorkspaceInvitation,
  createWorkspace,
  getWorkspaceMembers,
  inviteWorkspaceMembers,
  recoverPendingInvitationDeliveries,
} from "../../../src/services/workspace.service.js";
import { validWorkspace } from "../../helpers/workspace.fixture.js";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../../src/repositories/workspace.repository.js", () => ({
  acceptInvitationRecord: vi.fn(),
  createWorkspaceInvitationsRecord: vi.fn(),
  createWorkspaceRecord: vi.fn(),
  findInvitationByTokenHash: vi.fn(),
  findInvitationsAwaitingQueue: vi.fn(),
  markInvitationExpired: vi.fn(),
  markInvitationsQueued: vi.fn(),
  replaceInvitationToken: vi.fn(),
  findWorkspaceMembersPage: vi.fn(),
}));

vi.mock("../../../src/cache/workspace-members.cache.js", () => ({
  deleteCachedWorkspaceMemberLists: vi.fn(),
  getCachedWorkspaceMembers: vi.fn(),
  setCachedWorkspaceMembers: vi.fn(),
}));

vi.mock("../../../src/cache/workspace-overview.cache.js", () => ({
  deleteCachedWorkspaceOverview: vi.fn(),
  getCachedWorkspaceOverview: vi.fn(),
  setCachedWorkspaceOverview: vi.fn(),
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
    vi.mocked(deleteCachedWorkspaceMemberLists).mockResolvedValue(undefined);
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

describe("inviteWorkspaceMembers", () => {
  const persistedInvitations = {
    workspace: { displayName: "Engineering Team" },
    invitations: [
      {
        id: 40,
        email: "admin@example.com",
        normalizedEmail: "admin@example.com",
        role: "ADMIN" as const,
      },
      {
        id: 41,
        email: "member@example.com",
        normalizedEmail: "member@example.com",
        role: "MEMBER" as const,
      },
    ],
    existingMemberEmails: [],
  };

  beforeEach(() => {
    vi.mocked(createWorkspaceInvitationsRecord).mockResolvedValue(
      persistedInvitations,
    );
    vi.mocked(enqueueInvitationEmails).mockResolvedValue(undefined);
    vi.mocked(markInvitationsQueued).mockResolvedValue(undefined);
  });

  it("stores hashed tokens and queues every submitted invitation", async () => {
    await expect(
      inviteWorkspaceMembers(10, 7, {
        invitations: [
          { email: "admin@example.com", role: "ADMIN" },
          { email: "member@example.com", role: "MEMBER" },
        ],
      }),
    ).resolves.toEqual({ invitationCount: 2 });

    expect(createWorkspaceInvitationsRecord).toHaveBeenCalledWith({
      workspaceId: 10,
      invitedById: 7,
      invitations: [
        expect.objectContaining({
          email: "admin@example.com",
          normalizedEmail: "admin@example.com",
          role: "ADMIN",
          tokenHash: expect.stringMatching(/^[a-f0-9]{64}$/),
        }),
        expect.objectContaining({
          email: "member@example.com",
          normalizedEmail: "member@example.com",
          role: "MEMBER",
          tokenHash: expect.stringMatching(/^[a-f0-9]{64}$/),
        }),
      ],
    });
    expect(enqueueInvitationEmails).toHaveBeenCalledWith([
      expect.objectContaining({
        invitationId: 40,
        email: "admin@example.com",
        workspaceDisplayName: "Engineering Team",
        verificationUrl: expect.stringContaining("/invitations/accept?token="),
      }),
      expect.objectContaining({ invitationId: 41 }),
    ]);
    expect(markInvitationsQueued).toHaveBeenCalledWith([40, 41]);
    expect(deleteCachedWorkspaceMemberLists).toHaveBeenCalledWith(10);
  });

  it("rejects the complete batch without queueing when an email is already a member", async () => {
    vi.mocked(createWorkspaceInvitationsRecord).mockResolvedValue({
      workspace: null,
      invitations: [],
      existingMemberEmails: ["member@example.com"],
    });

    await expect(
      inviteWorkspaceMembers(10, 7, {
        invitations: [
          { email: "new@example.com", role: "MEMBER" },
          { email: "member@example.com", role: "ADMIN" },
        ],
      }),
    ).rejects.toBeInstanceOf(WorkspaceMemberAlreadyExistsError);
    expect(enqueueInvitationEmails).not.toHaveBeenCalled();
    expect(markInvitationsQueued).not.toHaveBeenCalled();
    expect(deleteCachedWorkspaceMemberLists).not.toHaveBeenCalled();
  });

  it("translates a previously invited email database conflict", async () => {
    vi.mocked(createWorkspaceInvitationsRecord).mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError("Unique constraint failed", {
        code: "P2002",
        clientVersion: "7.9.1",
        meta: { target: ["workspace_id", "normalized_email"] },
      }),
    );

    await expect(
      inviteWorkspaceMembers(10, 7, {
        invitations: [{ email: "invited@example.com", role: "MEMBER" }],
      }),
    ).rejects.toBeInstanceOf(WorkspaceInvitationAlreadyExistsError);
    expect(enqueueInvitationEmails).not.toHaveBeenCalled();
    expect(deleteCachedWorkspaceMemberLists).not.toHaveBeenCalled();
  });

  it("keeps saved invitations pending when Redis is temporarily unavailable", async () => {
    const queueError = new Error("Redis unavailable");
    vi.mocked(enqueueInvitationEmails).mockRejectedValue(queueError);
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);

    await expect(
      inviteWorkspaceMembers(10, 7, {
        invitations: [
          { email: "admin@example.com", role: "ADMIN" },
          { email: "member@example.com", role: "MEMBER" },
        ],
      }),
    ).resolves.toEqual({ invitationCount: 2 });
    expect(markInvitationsQueued).not.toHaveBeenCalled();
    expect(consoleError).toHaveBeenCalledWith(
      "Unable to queue workspace invitations",
      queueError,
    );
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
    vi.mocked(deleteCachedWorkspaceOverview).mockResolvedValue(undefined);
    vi.mocked(deleteCachedWorkspaceMemberLists).mockResolvedValue(undefined);
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
    expect(deleteCachedWorkspaceOverview).toHaveBeenCalledWith(10);
    expect(deleteCachedWorkspaceMemberLists).toHaveBeenCalledWith(10);
  });

  it("rejects a token that has no matching invitation", async () => {
    vi.mocked(findInvitationByTokenHash).mockResolvedValue(null);

    await expect(acceptWorkspaceInvitation(token, user)).rejects.toMatchObject({
      reason: "INVALID",
    } satisfies Partial<InvitationAcceptanceError>);
    expect(acceptInvitationRecord).not.toHaveBeenCalled();
    expect(deleteCachedWorkspaceOverview).not.toHaveBeenCalled();
  });

  it("rejects an invitation belonging to a different email address", async () => {
    await expect(
      acceptWorkspaceInvitation(token, { ...user, email: "other@example.com" }),
    ).rejects.toMatchObject({
      reason: "EMAIL_MISMATCH",
    } satisfies Partial<InvitationAcceptanceError>);
    expect(acceptInvitationRecord).not.toHaveBeenCalled();
    expect(deleteCachedWorkspaceOverview).not.toHaveBeenCalled();
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
    expect(deleteCachedWorkspaceOverview).not.toHaveBeenCalled();
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
    expect(deleteCachedWorkspaceOverview).not.toHaveBeenCalled();
  });

  it("rejects when another request claims the invitation first", async () => {
    vi.mocked(acceptInvitationRecord).mockResolvedValue(false);

    await expect(acceptWorkspaceInvitation(token, user)).rejects.toMatchObject({
      reason: "ALREADY_USED",
    } satisfies Partial<InvitationAcceptanceError>);
    expect(deleteCachedWorkspaceOverview).not.toHaveBeenCalled();
  });
});

describe("getWorkspaceMembers", () => {
  const repositoryPage = {
    members: [
      {
        user: {
          id: 8,
          firstname: "Workspace",
          lastname: "Member",
          email: "member@example.com",
        },
        role: WorkspaceRole.MEMBER,
        createdAt: new Date("2026-08-20T00:00:00.000Z"),
      },
    ],
    total: 41,
  };
  const memberPage = {
    members: [
      {
        id: 8,
        firstname: "Workspace",
        lastname: "Member",
        email: "member@example.com",
        role: WorkspaceRole.MEMBER,
        joinedAt: "2026-08-20T00:00:00.000Z",
      },
    ],
    pagination: {
      page: 2,
      pageSize: 20,
      total: 41,
      totalPages: 3,
    },
  };

  beforeEach(() => {
    vi.mocked(getCachedWorkspaceMembers).mockResolvedValue(null);
    vi.mocked(findWorkspaceMembersPage).mockResolvedValue(repositoryPage);
    vi.mocked(setCachedWorkspaceMembers).mockResolvedValue(undefined);
  });

  it("returns the requested cached page without querying PostgreSQL", async () => {
    vi.mocked(getCachedWorkspaceMembers).mockResolvedValue(memberPage);

    await expect(getWorkspaceMembers(10, 2, 20)).resolves.toEqual(memberPage);
    expect(getCachedWorkspaceMembers).toHaveBeenCalledWith(10, 2, 20);
    expect(findWorkspaceMembersPage).not.toHaveBeenCalled();
    expect(setCachedWorkspaceMembers).not.toHaveBeenCalled();
  });

  it("fetches the correct page, normalizes dates, and caches the response", async () => {
    await expect(getWorkspaceMembers(10, 2, 20)).resolves.toEqual(memberPage);
    expect(findWorkspaceMembersPage).toHaveBeenCalledWith(10, 20, 20);
    expect(setCachedWorkspaceMembers).toHaveBeenCalledWith(10, memberPage);
  });

  it("returns and caches an empty page with zero total pages", async () => {
    vi.mocked(findWorkspaceMembersPage).mockResolvedValue({
      members: [],
      total: 0,
    });
    const emptyPage = {
      members: [],
      pagination: {
        page: 3,
        pageSize: 20,
        total: 0,
        totalPages: 0,
      },
    };

    await expect(getWorkspaceMembers(10, 3, 20)).resolves.toEqual(emptyPage);
    expect(findWorkspaceMembersPage).toHaveBeenCalledWith(10, 40, 20);
    expect(setCachedWorkspaceMembers).toHaveBeenCalledWith(10, emptyPage);
  });
});
