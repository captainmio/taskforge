import { readFile, rm } from "node:fs/promises";
import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  logPath: "tests/.tmp-invitation-log-test.log",
}));

vi.mock("../../../src/config/env.js", () => ({
  env: { INVITATION_LOG_PATH: mocks.logPath },
}));

const { writeInvitationEmailLog } = await import(
  "../../../src/services/invitation-log.service.js"
);

describe("writeInvitationEmailLog", () => {
  afterEach(async () => {
    await rm(mocks.logPath, { force: true });
  });

  it("writes the invitation recipient and verification link as a JSON line", async () => {
    await writeInvitationEmailLog({
      invitationId: 20,
      email: "member@example.com",
      workspaceDisplayName: "Engineering Team",
      role: "MEMBER",
      verificationUrl: "http://localhost:5173/invitations/accept?token=secure-token",
    });

    const entry = JSON.parse((await readFile(mocks.logPath, "utf8")).trim()) as {
      to: string;
      subject: string;
      verificationUrl: string;
    };

    expect(entry).toEqual(
      expect.objectContaining({
        to: "member@example.com",
        subject: "Invitation to join Engineering Team",
        verificationUrl:
          "http://localhost:5173/invitations/accept?token=secure-token",
      }),
    );
  });
});
