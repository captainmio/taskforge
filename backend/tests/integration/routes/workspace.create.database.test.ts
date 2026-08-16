import { createHash } from "node:crypto";
import jwt from "jsonwebtoken";
import request from "supertest";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { JWT_SECRET } from "../../../src/config/auth.js";
import { prisma } from "../../../src/config/database.js";
import {
  InvitationDeliveryStatus,
  InvitationStatus,
  WorkspaceRole,
} from "../../../src/generated/prisma/enums.js";
import { enqueueInvitationEmails } from "../../../src/queues/invitation.queue.js";
import { validWorkspace } from "../../helpers/workspace.fixture.js";
import { clearTestDatabase } from "../../helpers/database.js";

vi.mock("../../../src/queues/invitation.queue.js", () => ({
  enqueueInvitationEmails: vi.fn(),
  findQueuedInvitationEmail: vi.fn(),
}));

const { default: app } = await import("../../../src/app.js");

describe("POST /api/workspaces with PostgreSQL", () => {
  beforeEach(async () => {
    vi.mocked(enqueueInvitationEmails).mockResolvedValue(undefined);
    await clearTestDatabase();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("creates the workspace owner membership and invitation records atomically", async () => {
    const owner = await prisma.user.create({
      data: {
        email: "owner@example.com",
        firstname: "Workspace",
        lastname: "Owner",
        password: "hashed-password",
      },
    });
    const authCookie = `accessToken=${jwt.sign(
      { sub: owner.id, email: owner.email },
      JWT_SECRET,
    )}`;

    const response = await request(app)
      .post("/api/workspaces")
      .set("Cookie", authCookie)
      .send({ ...validWorkspace, workspaceName: "  Engineering   Team " });

    expect(response.status).toBe(201);

    const workspace = await prisma.workspace.findUnique({
      where: { name: "engineering team" },
      include: { members: true, invitations: true },
    });

    expect(workspace).toMatchObject({
      displayName: "Engineering Team",
      ownerId: owner.id,
    });
    expect(workspace?.members).toEqual([
      expect.objectContaining({ userId: owner.id, role: "OWNER" }),
    ]);
    expect(workspace?.invitations).toHaveLength(2);
    expect(workspace?.invitations[0]?.tokenHash).toMatch(/^[a-f0-9]{64}$/);
    expect(workspace?.invitations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          normalizedEmail: "admin@example.com",
          deliveryStatus: InvitationDeliveryStatus.QUEUED,
        }),
      ]),
    );
    expect(enqueueInvitationEmails).toHaveBeenCalledOnce();

    const currentUserResponse = await request(app)
      .get("/api/auth/me")
      .set("Cookie", authCookie);
    expect(currentUserResponse.status).toBe(200);
    expect(currentUserResponse.body.workspaceIds).toEqual([workspace?.id]);
  });

  it("returns 409 when another workspace uses the same normalized name", async () => {
    const owner = await prisma.user.create({
      data: {
        email: "owner@example.com",
        firstname: "Workspace",
        lastname: "Owner",
        password: "hashed-password",
      },
    });
    const authCookie = `accessToken=${jwt.sign(
      { sub: owner.id, email: owner.email },
      JWT_SECRET,
    )}`;

    await request(app)
      .post("/api/workspaces")
      .set("Cookie", authCookie)
      .send(validWorkspace);
    const response = await request(app)
      .post("/api/workspaces")
      .set("Cookie", authCookie)
      .send({ ...validWorkspace, workspaceName: " ENGINEERING   TEAM " });

    expect(response.status).toBe(409);
    expect(await prisma.workspace.count()).toBe(1);
  });

  it("adds the invited user as a member and prevents the token from being used twice", async () => {
    const owner = await prisma.user.create({
      data: {
        email: "owner@example.com",
        firstname: "Workspace",
        lastname: "Owner",
        password: "hashed-password",
      },
    });
    const invitedUser = await prisma.user.create({
      data: {
        email: "member@example.com",
        firstname: "Invited",
        lastname: "Member",
        password: "hashed-password",
      },
    });
    const workspace = await prisma.workspace.create({
      data: {
        name: "engineering team",
        displayName: "Engineering Team",
        description: validWorkspace.description,
        icon: validWorkspace.icon,
        ownerId: owner.id,
        members: {
          create: { userId: owner.id, role: WorkspaceRole.OWNER },
        },
      },
    });
    const token = "database-invitation-token";
    const invitation = await prisma.workspaceInvitation.create({
      data: {
        workspaceId: workspace.id,
        invitedById: owner.id,
        email: invitedUser.email,
        normalizedEmail: invitedUser.email,
        role: WorkspaceRole.MEMBER,
        tokenHash: createHash("sha256").update(token).digest("hex"),
        expiresAt: new Date(Date.now() + 60_000),
      },
    });
    const invitedUserCookie = `accessToken=${jwt.sign(
      { sub: invitedUser.id, email: invitedUser.email },
      JWT_SECRET,
    )}`;

    const response = await request(app)
      .post("/api/workspaces/invitations/accept")
      .set("Cookie", invitedUserCookie)
      .send({ token });

    expect(response.status).toBe(200);
    expect(response.body.workspace).toEqual({
      id: workspace.id,
      displayName: workspace.displayName,
    });
    await expect(
      prisma.workspaceMember.findUnique({
        where: {
          workspaceId_userId: {
            workspaceId: workspace.id,
            userId: invitedUser.id,
          },
        },
      }),
    ).resolves.toMatchObject({ role: WorkspaceRole.MEMBER });
    await expect(
      prisma.workspaceInvitation.findUnique({ where: { id: invitation.id } }),
    ).resolves.toMatchObject({ status: InvitationStatus.ACCEPTED });

    const repeatedResponse = await request(app)
      .post("/api/workspaces/invitations/accept")
      .set("Cookie", invitedUserCookie)
      .send({ token });

    expect(repeatedResponse.status).toBe(409);
    expect(
      await prisma.workspaceMember.count({
        where: { workspaceId: workspace.id, userId: invitedUser.id },
      }),
    ).toBe(1);
  });
});
