import { createHash } from "node:crypto";
import jwt from "jsonwebtoken";
import request from "supertest";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { JWT_SECRET } from "../../../src/config/auth.js";
import { prisma } from "../../../src/config/database.js";
import {
  WorkspaceIcon,
  WorkspaceRole,
} from "../../../src/generated/prisma/enums.js";
import { clearTestDatabase } from "../../helpers/database.js";

const { default: app } = await import("../../../src/app.js");

const authCookieFor = (user: { id: number; email: string }): string =>
  `accessToken=${jwt.sign(
    { sub: user.id, email: user.email },
    JWT_SECRET,
  )}`;

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

  return { owner, workspace, authCookie: authCookieFor(owner) };
};

const generateInviteLink = async (
  workspaceId: number,
  authCookie: string,
) => {
  const response = await request(app)
    .post(`/api/workspaces/${workspaceId}/invitation-link`)
    .set("Cookie", authCookie);
  const invitationUrl = new URL(response.body.data.invitationLink as string);

  return {
    response,
    token: invitationUrl.searchParams.get("token") ?? "",
  };
};

describe("workspace invitation links with PostgreSQL", () => {
  beforeEach(async () => {
    await clearTestDatabase();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("stores only the token hash and a seven-day expiry", async () => {
    const { owner, workspace, authCookie } = await createWorkspaceOwner();
    const beforeGeneration = Date.now();
    const { response, token } = await generateInviteLink(
      workspace.id,
      authCookie,
    );
    const afterGeneration = Date.now();

    expect(response.status).toBe(201);
    expect(token).not.toBe("");
    expect(response.body.data.invitationLink).toContain("type=link");

    const savedLink = await prisma.workspaceInviteLink.findUnique({
      where: { workspaceId: workspace.id },
    });
    expect(savedLink).toMatchObject({
      workspaceId: workspace.id,
      createdById: owner.id,
      tokenHash: createHash("sha256").update(token).digest("hex"),
      revokedAt: null,
    });
    expect(savedLink?.tokenHash).not.toBe(token);
    expect(savedLink?.expiresAt.getTime()).toBeGreaterThanOrEqual(
      beforeGeneration + 7 * 24 * 60 * 60 * 1_000,
    );
    expect(savedLink?.expiresAt.getTime()).toBeLessThanOrEqual(
      afterGeneration + 7 * 24 * 60 * 60 * 1_000,
    );
  });

  it("rotates the workspace link and rejects the replaced token", async () => {
    const { workspace, authCookie } = await createWorkspaceOwner();
    const firstLink = await generateInviteLink(workspace.id, authCookie);
    const secondLink = await generateInviteLink(workspace.id, authCookie);
    const joiningUser = await prisma.user.create({
      data: {
        email: "joining@example.com",
        firstname: "Joining",
        lastname: "Member",
        password: "hashed-password",
      },
    });
    const joiningCookie = authCookieFor(joiningUser);

    expect(secondLink.token).not.toBe(firstLink.token);
    expect(
      await prisma.workspaceInviteLink.count({
        where: { workspaceId: workspace.id },
      }),
    ).toBe(1);

    const replacedResponse = await request(app)
      .post("/api/workspaces/invitation-links/accept")
      .set("Cookie", joiningCookie)
      .send({ token: firstLink.token });
    expect(replacedResponse.status).toBe(400);
    expect(replacedResponse.body.error).toBe("Invitation is invalid");

    const activeResponse = await request(app)
      .post("/api/workspaces/invitation-links/accept")
      .set("Cookie", joiningCookie)
      .send({ token: secondLink.token });
    expect(activeResponse.status).toBe(200);
    expect(
      await prisma.workspaceMember.findUnique({
        where: {
          workspaceId_userId: {
            workspaceId: workspace.id,
            userId: joiningUser.id,
          },
        },
      }),
    ).toMatchObject({ role: WorkspaceRole.MEMBER });
  });

  it("accepts repeated use idempotently without downgrading existing roles", async () => {
    const { workspace, authCookie } = await createWorkspaceOwner();
    const { token } = await generateInviteLink(workspace.id, authCookie);
    const existingAdmin = await prisma.user.create({
      data: {
        email: "admin@example.com",
        firstname: "Existing",
        lastname: "Admin",
        password: "hashed-password",
        workspaceMemberships: {
          create: {
            workspaceId: workspace.id,
            role: WorkspaceRole.ADMIN,
          },
        },
      },
    });
    const adminCookie = authCookieFor(existingAdmin);

    const firstResponse = await request(app)
      .post("/api/workspaces/invitation-links/accept")
      .set("Cookie", adminCookie)
      .send({ token });
    const repeatedResponse = await request(app)
      .post("/api/workspaces/invitation-links/accept")
      .set("Cookie", adminCookie)
      .send({ token });

    expect(firstResponse.status).toBe(200);
    expect(repeatedResponse.status).toBe(200);
    expect(
      await prisma.workspaceMember.findUnique({
        where: {
          workspaceId_userId: {
            workspaceId: workspace.id,
            userId: existingAdmin.id,
          },
        },
      }),
    ).toMatchObject({ role: WorkspaceRole.ADMIN });
    expect(
      await prisma.workspaceMember.count({
        where: { workspaceId: workspace.id, userId: existingAdmin.id },
      }),
    ).toBe(1);
  });

  it.each([
    ["expired", { expiresAt: new Date(Date.now() - 60_000) }, 410],
    ["revoked", { revokedAt: new Date() }, 400],
  ])("rejects an %s link", async (_, linkUpdate, expectedStatus) => {
    const { workspace, authCookie } = await createWorkspaceOwner();
    const { token } = await generateInviteLink(workspace.id, authCookie);
    const joiningUser = await prisma.user.create({
      data: {
        email: "joining@example.com",
        firstname: "Joining",
        lastname: "Member",
        password: "hashed-password",
      },
    });
    await prisma.workspaceInviteLink.update({
      where: { workspaceId: workspace.id },
      data: linkUpdate,
    });

    const response = await request(app)
      .post("/api/workspaces/invitation-links/accept")
      .set("Cookie", authCookieFor(joiningUser))
      .send({ token });

    expect(response.status).toBe(expectedStatus);
    expect(
      await prisma.workspaceMember.count({
        where: { workspaceId: workspace.id, userId: joiningUser.id },
      }),
    ).toBe(0);
  });
});
