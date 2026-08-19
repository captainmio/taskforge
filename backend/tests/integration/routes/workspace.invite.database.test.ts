import jwt from "jsonwebtoken";
import request from "supertest";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { JWT_SECRET } from "../../../src/config/auth.js";
import { prisma } from "../../../src/config/database.js";
import {
  InvitationDeliveryStatus,
  WorkspaceIcon,
  WorkspaceRole,
} from "../../../src/generated/prisma/enums.js";
import { enqueueInvitationEmails } from "../../../src/queues/invitation.queue.js";
import { clearTestDatabase } from "../../helpers/database.js";

vi.mock("../../../src/queues/invitation.queue.js", () => ({
  enqueueInvitationEmails: vi.fn(),
  findQueuedInvitationEmail: vi.fn(),
}));

const { default: app } = await import("../../../src/app.js");

const createWorkspaceOwner = async () => {
  const owner = await prisma.user.create({
    data: {
      email: "owner@example.com",
      firstname: "Workspace",
      lastname: "Owner",
      password: "hashed-password",
    },
  });
  const workspace = await prisma.workspace.create({
    data: {
      name: "engineering team",
      displayName: "Engineering Team",
      description: "Builds and maintains the product.",
      icon: WorkspaceIcon.code,
      ownerId: owner.id,
      members: {
        create: { userId: owner.id, role: WorkspaceRole.OWNER },
      },
    },
  });
  const authCookie = `accessToken=${jwt.sign(
    { sub: owner.id, email: owner.email },
    JWT_SECRET,
  )}`;

  return { owner, workspace, authCookie };
};

describe("POST /api/workspaces/:workspaceId/invitations with PostgreSQL", () => {
  beforeEach(async () => {
    vi.mocked(enqueueInvitationEmails).mockResolvedValue(undefined);
    await clearTestDatabase();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("persists the complete invitation batch and sends it to BullMQ", async () => {
    const { workspace, authCookie } = await createWorkspaceOwner();

    const response = await request(app)
      .post(`/api/workspaces/${workspace.id}/invitations`)
      .set("Cookie", authCookie)
      .send({
        invitations: [
          { email: " ADMIN@Example.COM ", role: "ADMIN" },
          { email: "member@example.com", role: "MEMBER" },
        ],
      });

    expect(response.status).toBe(202);
    expect(response.body.data).toEqual({ invitationCount: 2 });

    const invitations = await prisma.workspaceInvitation.findMany({
      where: { workspaceId: workspace.id },
      orderBy: { normalizedEmail: "asc" },
    });
    expect(invitations).toHaveLength(2);
    expect(invitations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          normalizedEmail: "admin@example.com",
          role: WorkspaceRole.ADMIN,
          deliveryStatus: InvitationDeliveryStatus.QUEUED,
          tokenHash: expect.stringMatching(/^[a-f0-9]{64}$/),
        }),
        expect.objectContaining({
          normalizedEmail: "member@example.com",
          role: WorkspaceRole.MEMBER,
          deliveryStatus: InvitationDeliveryStatus.QUEUED,
          tokenHash: expect.stringMatching(/^[a-f0-9]{64}$/),
        }),
      ]),
    );
    expect(enqueueInvitationEmails).toHaveBeenCalledWith([
      expect.objectContaining({
        email: "admin@example.com",
        workspaceDisplayName: "Engineering Team",
        verificationUrl: expect.stringContaining("/invitations/accept?token="),
      }),
      expect.objectContaining({ email: "member@example.com" }),
    ]);
  });

  it("creates no invitations when one submitted email already belongs to the workspace", async () => {
    const { workspace, authCookie } = await createWorkspaceOwner();
    const member = await prisma.user.create({
      data: {
        email: "existing@example.com",
        firstname: "Existing",
        lastname: "Member",
        password: "hashed-password",
      },
    });
    await prisma.workspaceMember.create({
      data: {
        workspaceId: workspace.id,
        userId: member.id,
        role: WorkspaceRole.MEMBER,
      },
    });

    const response = await request(app)
      .post(`/api/workspaces/${workspace.id}/invitations`)
      .set("Cookie", authCookie)
      .send({
        invitations: [
          { email: "new@example.com", role: "MEMBER" },
          { email: " EXISTING@Example.COM ", role: "ADMIN" },
        ],
      });

    expect(response.status).toBe(409);
    expect(response.body.error).toBe(
      "One or more email addresses already belong to this workspace",
    );
    expect(
      await prisma.workspaceInvitation.count({
        where: { workspaceId: workspace.id },
      }),
    ).toBe(0);
    expect(enqueueInvitationEmails).not.toHaveBeenCalled();
  });

  it("does not save the rest of the batch when one email was invited previously", async () => {
    const { owner, workspace, authCookie } = await createWorkspaceOwner();
    await prisma.workspaceInvitation.create({
      data: {
        workspaceId: workspace.id,
        invitedById: owner.id,
        email: "invited@example.com",
        normalizedEmail: "invited@example.com",
        role: WorkspaceRole.MEMBER,
        tokenHash: "a".repeat(64),
        expiresAt: new Date(Date.now() + 60_000),
      },
    });

    const response = await request(app)
      .post(`/api/workspaces/${workspace.id}/invitations`)
      .set("Cookie", authCookie)
      .send({
        invitations: [
          { email: "new@example.com", role: "MEMBER" },
          { email: "invited@example.com", role: "ADMIN" },
        ],
      });

    expect(response.status).toBe(409);
    expect(response.body.error).toBe(
      "One or more email addresses have already been invited",
    );
    expect(
      await prisma.workspaceInvitation.count({
        where: { workspaceId: workspace.id },
      }),
    ).toBe(1);
    expect(enqueueInvitationEmails).not.toHaveBeenCalled();
  });
});
