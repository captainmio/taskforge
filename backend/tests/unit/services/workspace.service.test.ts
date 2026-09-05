import { createHash } from "node:crypto";
import { Prisma } from "../../../src/generated/prisma/client.js";
import {
  InvitationStatus,
  ProjectDefaultView,
  ProjectIcon,
  ProjectStatus,
  TaskStatus,
  WorkspaceIcon,
  WorkspaceRole,
} from "../../../src/generated/prisma/enums.js";
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
} from "../../../src/errors/workspace.errors.js";
import {
  deleteCachedWorkspaceOverview,
  getCachedWorkspaceOverview,
  setCachedWorkspaceOverview,
} from "../../../src/cache/workspace-overview.cache.js";
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
  acceptWorkspaceInviteLinkRecord,
  createWorkspaceInvitationsRecord,
  createWorkspaceRecord,
  findInvitationByTokenHash,
  findInvitationsAwaitingQueue,
  findWorkspaceInviteLinkByTokenHash,
  findWorkspaceMyTasks,
  findWorkspaceOverview,
  findWorkspaceProjectTaskCounts,
  findWorkspaceRecentTaskHistory,
  findWorkspaceMembersPage,
  markInvitationExpired,
  markInvitationsQueued,
  replaceInvitationToken,
  removeWorkspaceMemberRecord,
  updateWorkspaceMemberRoleRecord,
  upsertWorkspaceInviteLink,
} from "../../../src/repositories/workspace.repository.js";
import {
  acceptWorkspaceInviteLink,
  acceptWorkspaceInvitation,
  createWorkspaceInviteLink,
  createWorkspace,
  getWorkspaceOverview,
  getWorkspaceMyTasks,
  getWorkspaceMembers,
  inviteWorkspaceMembers,
  recoverPendingInvitationDeliveries,
  removeWorkspaceMember,
  updateWorkspaceMemberRole,
} from "../../../src/services/workspace.service.js";
import { validWorkspace } from "../../helpers/workspace.fixture.js";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../../src/repositories/workspace.repository.js", () => ({
  acceptInvitationRecord: vi.fn(),
  acceptWorkspaceInviteLinkRecord: vi.fn(),
  createWorkspaceInvitationsRecord: vi.fn(),
  createWorkspaceRecord: vi.fn(),
  findInvitationByTokenHash: vi.fn(),
  findInvitationsAwaitingQueue: vi.fn(),
  findWorkspaceInviteLinkByTokenHash: vi.fn(),
  findWorkspaceMyTasks: vi.fn(),
  findWorkspaceOverview: vi.fn(),
  findWorkspaceRecentTaskHistory: vi.fn(),
  findWorkspaceProjectTaskCounts: vi.fn(),
  markInvitationExpired: vi.fn(),
  markInvitationsQueued: vi.fn(),
  replaceInvitationToken: vi.fn(),
  findWorkspaceMembersPage: vi.fn(),
  removeWorkspaceMemberRecord: vi.fn(),
  updateWorkspaceMemberRoleRecord: vi.fn(),
  upsertWorkspaceInviteLink: vi.fn(),
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

describe("getWorkspaceMyTasks", () => {
  it("returns assigned tasks with an empty due date when no due date is set", async () => {
    vi.mocked(findWorkspaceMyTasks).mockResolvedValue({
      tasks: [
        {
          id: 18,
          title: "Document release process",
          description: "Capture the handoff steps.",
          status: "todo",
          priority: "medium",
          dueDate: null,
          timeEstimate: null,
          project: { id: 5, name: "Release" },
          assignees: [
            {
              user: {
                id: 7,
                firstname: "Workspace",
                lastname: "Owner",
                email: "owner@example.com",
              },
            },
          ],
        },
      ],
      nextCursor: null,
    } as never);

    await expect(getWorkspaceMyTasks(42, 7, undefined, 20)).resolves.toEqual({
      tasks: [
        expect.objectContaining({
          id: 18,
          dueDate: "",
          assignees: [expect.objectContaining({ id: 7 })],
        }),
      ],
      nextCursor: null,
    });
    expect(findWorkspaceMyTasks).toHaveBeenCalledWith(
      42,
      7,
      undefined,
      20,
      "due_asc",
    );
  });
});

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

describe("createWorkspaceInviteLink", () => {
  const persistedExpiry = new Date("2026-08-29T00:00:00.000Z");

  beforeEach(() => {
    vi.mocked(upsertWorkspaceInviteLink).mockResolvedValue({
      expiresAt: persistedExpiry,
    });
  });

  it.each([WorkspaceRole.OWNER, WorkspaceRole.ADMIN])(
    "generates a hashed seven-day link for a %s",
    async (actorRole) => {
      const beforeGeneration = Date.now();
      const result = await createWorkspaceInviteLink(10, 7, actorRole);
      const afterGeneration = Date.now();
      const invitationUrl = new URL(result.invitationLink);
      const token = invitationUrl.searchParams.get("token");

      expect(token).toBeTruthy();
      expect(invitationUrl.pathname).toBe("/invitations/accept");
      expect(invitationUrl.searchParams.get("type")).toBe("link");
      expect(result.expiresAt).toBe(persistedExpiry.toISOString());
      expect(upsertWorkspaceInviteLink).toHaveBeenCalledWith({
        workspaceId: 10,
        createdById: 7,
        tokenHash: createHash("sha256").update(token ?? "").digest("hex"),
        expiresAt: expect.any(Date),
      });

      const upsertInput = vi.mocked(upsertWorkspaceInviteLink).mock.calls[0]?.[0];
      expect(upsertInput?.expiresAt.getTime()).toBeGreaterThanOrEqual(
        beforeGeneration + 7 * 24 * 60 * 60 * 1_000,
      );
      expect(upsertInput?.expiresAt.getTime()).toBeLessThanOrEqual(
        afterGeneration + 7 * 24 * 60 * 60 * 1_000,
      );
    },
  );

  it("rejects a member without writing an invitation link", async () => {
    await expect(
      createWorkspaceInviteLink(10, 7, WorkspaceRole.MEMBER),
    ).rejects.toBeInstanceOf(WorkspaceInviteLinkGenerationForbiddenError);
    expect(upsertWorkspaceInviteLink).not.toHaveBeenCalled();
  });
});

describe("acceptWorkspaceInviteLink", () => {
  const token = "shared-workspace-link-token";
  const activeLink = {
    workspaceId: 10,
    expiresAt: new Date(Date.now() + 60_000),
    revokedAt: null,
    workspace: { id: 10, displayName: "Engineering Team" },
  };

  beforeEach(() => {
    vi.mocked(findWorkspaceInviteLinkByTokenHash).mockResolvedValue(activeLink);
    vi.mocked(acceptWorkspaceInviteLinkRecord).mockResolvedValue(undefined);
    vi.mocked(deleteCachedWorkspaceOverview).mockResolvedValue(undefined);
    vi.mocked(deleteCachedWorkspaceMemberLists).mockResolvedValue(undefined);
  });

  it("adds the authenticated user and clears both workspace caches", async () => {
    await expect(acceptWorkspaceInviteLink(token, 8)).resolves.toEqual(
      activeLink.workspace,
    );
    expect(findWorkspaceInviteLinkByTokenHash).toHaveBeenCalledWith(
      createHash("sha256").update(token).digest("hex"),
    );
    expect(acceptWorkspaceInviteLinkRecord).toHaveBeenCalledWith(10, 8);
    expect(deleteCachedWorkspaceOverview).toHaveBeenCalledWith(10);
    expect(deleteCachedWorkspaceMemberLists).toHaveBeenCalledWith(10);
  });

  it("rejects an unknown token without adding a member", async () => {
    vi.mocked(findWorkspaceInviteLinkByTokenHash).mockResolvedValue(null);

    await expect(acceptWorkspaceInviteLink(token, 8)).rejects.toMatchObject({
      reason: "INVALID",
    } satisfies Partial<InvitationAcceptanceError>);
    expect(acceptWorkspaceInviteLinkRecord).not.toHaveBeenCalled();
  });

  it("rejects a revoked link without adding a member", async () => {
    vi.mocked(findWorkspaceInviteLinkByTokenHash).mockResolvedValue({
      ...activeLink,
      revokedAt: new Date(),
    });

    await expect(acceptWorkspaceInviteLink(token, 8)).rejects.toMatchObject({
      reason: "INVALID",
    } satisfies Partial<InvitationAcceptanceError>);
    expect(acceptWorkspaceInviteLinkRecord).not.toHaveBeenCalled();
  });

  it("rejects an expired link without adding a member", async () => {
    vi.mocked(findWorkspaceInviteLinkByTokenHash).mockResolvedValue({
      ...activeLink,
      expiresAt: new Date(Date.now() - 60_000),
    });

    await expect(acceptWorkspaceInviteLink(token, 8)).rejects.toMatchObject({
      reason: "EXPIRED",
    } satisfies Partial<InvitationAcceptanceError>);
    expect(acceptWorkspaceInviteLinkRecord).not.toHaveBeenCalled();
  });
});

describe("getWorkspaceOverview", () => {
  const repositoryOverview = {
    id: 10,
    displayName: "Engineering Team",
    description: "Builds and maintains the product.",
    icon: WorkspaceIcon.code,
    createdAt: new Date("2026-08-18T00:00:00.000Z"),
    _count: { members: 1 },
    projects: [
      {
        id: 25,
        name: "Website Redesign",
        description: "Refresh the marketing site.",
        icon: ProjectIcon.desktop,
        status: ProjectStatus.planning,
        startDate: new Date("2026-09-01T00:00:00.000Z"),
        dueDate: new Date("2026-10-01T00:00:00.000Z"),
        defaultView: ProjectDefaultView.board,
        createdAt: new Date("2026-08-22T00:00:00.000Z"),
      },
    ],
  };
  const normalizedOverview = {
    id: 10,
    displayName: "Engineering Team",
    description: "Builds and maintains the product.",
    icon: WorkspaceIcon.code,
    createdAt: "2026-08-18T00:00:00.000Z",
    memberCount: 1,
    recentUpdates: [],
    taskSummary: {
      todo: 3,
      inProgress: 4,
      inReview: 1,
      done: 2,
    },
    projects: [
      {
        id: 25,
        name: "Website Redesign",
        description: "Refresh the marketing site.",
        icon: ProjectIcon.desktop,
        status: ProjectStatus.planning,
        startDate: "2026-09-01T00:00:00.000Z",
        dueDate: "2026-10-01T00:00:00.000Z",
        defaultView: ProjectDefaultView.board,
        createdAt: "2026-08-22T00:00:00.000Z",
        taskCount: 10,
        completedTaskCount: 2,
      },
    ],
  };

  beforeEach(() => {
    vi.mocked(getCachedWorkspaceOverview).mockResolvedValue(null);
    vi.mocked(findWorkspaceOverview).mockResolvedValue(repositoryOverview);
    vi.mocked(findWorkspaceProjectTaskCounts).mockResolvedValue([
      { projectId: 25, status: TaskStatus.todo, _count: { _all: 3 } },
      { projectId: 25, status: TaskStatus.in_progress, _count: { _all: 4 } },
      { projectId: 25, status: TaskStatus.in_review, _count: { _all: 1 } },
      { projectId: 25, status: TaskStatus.done, _count: { _all: 2 } },
    ] as never);
    vi.mocked(findWorkspaceRecentTaskHistory).mockResolvedValue([] as never);
    vi.mocked(setCachedWorkspaceOverview).mockResolvedValue(undefined);
  });

  it("returns a cached overview without querying PostgreSQL", async () => {
    vi.mocked(getCachedWorkspaceOverview).mockResolvedValue(normalizedOverview);

    await expect(getWorkspaceOverview(10)).resolves.toEqual(normalizedOverview);
    expect(getCachedWorkspaceOverview).toHaveBeenCalledWith(10);
    expect(findWorkspaceOverview).not.toHaveBeenCalled();
    expect(findWorkspaceProjectTaskCounts).not.toHaveBeenCalled();
    expect(setCachedWorkspaceOverview).not.toHaveBeenCalled();
  });

  it("aggregates project task status counts and normalizes dates before caching the overview", async () => {
    await expect(getWorkspaceOverview(10)).resolves.toEqual(normalizedOverview);
    expect(findWorkspaceOverview).toHaveBeenCalledWith(10);
    expect(findWorkspaceProjectTaskCounts).toHaveBeenCalledWith(10);
    expect(setCachedWorkspaceOverview).toHaveBeenCalledWith(
      10,
      normalizedOverview,
    );
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

describe("removeWorkspaceMember", () => {
  beforeEach(() => {
    vi.mocked(removeWorkspaceMemberRecord).mockResolvedValue({
      status: "REMOVED",
      previousRole: WorkspaceRole.MEMBER,
    });
    vi.mocked(deleteCachedWorkspaceOverview).mockResolvedValue(undefined);
    vi.mocked(deleteCachedWorkspaceMemberLists).mockResolvedValue(undefined);
  });

  it.each([WorkspaceRole.OWNER, WorkspaceRole.ADMIN])(
    "allows a workspace %s to remove a non-owner member and clears both caches",
    async (actorRole) => {
      await expect(removeWorkspaceMember(10, 8, actorRole)).resolves.toEqual({
        memberId: 8,
        previousRole: WorkspaceRole.MEMBER,
      });
      expect(removeWorkspaceMemberRecord).toHaveBeenCalledWith(10, 8);
      expect(deleteCachedWorkspaceOverview).toHaveBeenCalledWith(10);
      expect(deleteCachedWorkspaceMemberLists).toHaveBeenCalledWith(10);
    },
  );

  it("rejects a regular member before accessing the repository or caches", async () => {
    await expect(
      removeWorkspaceMember(10, 8, WorkspaceRole.MEMBER),
    ).rejects.toBeInstanceOf(WorkspaceMemberRemovalForbiddenError);
    expect(removeWorkspaceMemberRecord).not.toHaveBeenCalled();
    expect(deleteCachedWorkspaceOverview).not.toHaveBeenCalled();
    expect(deleteCachedWorkspaceMemberLists).not.toHaveBeenCalled();
  });

  it("returns not found without clearing caches when the target is absent", async () => {
    vi.mocked(removeWorkspaceMemberRecord).mockResolvedValue({
      status: "NOT_FOUND",
    });

    await expect(
      removeWorkspaceMember(10, 99, WorkspaceRole.ADMIN),
    ).rejects.toBeInstanceOf(WorkspaceMemberNotFoundError);
    expect(deleteCachedWorkspaceOverview).not.toHaveBeenCalled();
    expect(deleteCachedWorkspaceMemberLists).not.toHaveBeenCalled();
  });

  it("protects the workspace owner without clearing caches", async () => {
    vi.mocked(removeWorkspaceMemberRecord).mockResolvedValue({
      status: "OWNER_PROTECTED",
    });

    await expect(
      removeWorkspaceMember(10, 7, WorkspaceRole.OWNER),
    ).rejects.toBeInstanceOf(WorkspaceOwnerRemovalError);
    expect(deleteCachedWorkspaceOverview).not.toHaveBeenCalled();
    expect(deleteCachedWorkspaceMemberLists).not.toHaveBeenCalled();
  });
});

describe("updateWorkspaceMemberRole", () => {
  beforeEach(() => {
    vi.mocked(updateWorkspaceMemberRoleRecord).mockResolvedValue({
      status: "UPDATED",
      previousRole: WorkspaceRole.MEMBER,
      membership: {
        role: WorkspaceRole.ADMIN,
        createdAt: new Date("2026-08-20T00:00:00.000Z"),
        user: {
          id: 8,
          firstname: "Taylor",
          lastname: "Member",
          email: "taylor@example.com",
        },
      },
    });
    vi.mocked(deleteCachedWorkspaceOverview).mockResolvedValue(undefined);
    vi.mocked(deleteCachedWorkspaceMemberLists).mockResolvedValue(undefined);
  });

  it.each([WorkspaceRole.OWNER, WorkspaceRole.ADMIN])(
    "allows a workspace %s to update another member and clears both caches",
    async (actorRole) => {
      await expect(
        updateWorkspaceMemberRole(
          10,
          8,
          7,
          actorRole,
          WorkspaceRole.ADMIN,
        ),
      ).resolves.toEqual({
        member: {
          id: 8,
          firstname: "Taylor",
          lastname: "Member",
          email: "taylor@example.com",
          role: WorkspaceRole.ADMIN,
          joinedAt: "2026-08-20T00:00:00.000Z",
        },
        previousRole: WorkspaceRole.MEMBER,
      });
      expect(updateWorkspaceMemberRoleRecord).toHaveBeenCalledWith(
        10,
        8,
        WorkspaceRole.ADMIN,
      );
      expect(deleteCachedWorkspaceOverview).toHaveBeenCalledWith(10);
      expect(deleteCachedWorkspaceMemberLists).toHaveBeenCalledWith(10);
    },
  );

  it("rejects a regular member before accessing the repository or caches", async () => {
    await expect(
      updateWorkspaceMemberRole(
        10,
        8,
        7,
        WorkspaceRole.MEMBER,
        WorkspaceRole.ADMIN,
      ),
    ).rejects.toBeInstanceOf(WorkspaceMemberRoleUpdateForbiddenError);
    expect(updateWorkspaceMemberRoleRecord).not.toHaveBeenCalled();
    expect(deleteCachedWorkspaceOverview).not.toHaveBeenCalled();
    expect(deleteCachedWorkspaceMemberLists).not.toHaveBeenCalled();
  });

  it("rejects an admin updating their own role before accessing the repository", async () => {
    await expect(
      updateWorkspaceMemberRole(
        10,
        7,
        7,
        WorkspaceRole.ADMIN,
        WorkspaceRole.MEMBER,
      ),
    ).rejects.toBeInstanceOf(WorkspaceMemberSelfRoleUpdateError);
    expect(updateWorkspaceMemberRoleRecord).not.toHaveBeenCalled();
    expect(deleteCachedWorkspaceOverview).not.toHaveBeenCalled();
    expect(deleteCachedWorkspaceMemberLists).not.toHaveBeenCalled();
  });

  it("returns not found without clearing caches when the target is absent", async () => {
    vi.mocked(updateWorkspaceMemberRoleRecord).mockResolvedValue({
      status: "NOT_FOUND",
    });

    await expect(
      updateWorkspaceMemberRole(
        10,
        99,
        7,
        WorkspaceRole.ADMIN,
        WorkspaceRole.MEMBER,
      ),
    ).rejects.toBeInstanceOf(WorkspaceMemberNotFoundError);
    expect(deleteCachedWorkspaceOverview).not.toHaveBeenCalled();
    expect(deleteCachedWorkspaceMemberLists).not.toHaveBeenCalled();
  });

  it("protects the owner role without clearing caches", async () => {
    vi.mocked(updateWorkspaceMemberRoleRecord).mockResolvedValue({
      status: "OWNER_PROTECTED",
    });

    await expect(
      updateWorkspaceMemberRole(
        10,
        1,
        7,
        WorkspaceRole.ADMIN,
        WorkspaceRole.MEMBER,
      ),
    ).rejects.toBeInstanceOf(WorkspaceOwnerRoleUpdateError);
    expect(deleteCachedWorkspaceOverview).not.toHaveBeenCalled();
    expect(deleteCachedWorkspaceMemberLists).not.toHaveBeenCalled();
  });
});
