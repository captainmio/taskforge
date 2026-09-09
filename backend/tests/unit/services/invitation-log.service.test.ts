import { readFile, rm } from "node:fs/promises";
import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  logPath: "tests/.tmp-invitation-log-test.log",
}));

vi.mock("../../../src/config/env.js", () => ({
  env: {
    EMAIL_DELIVERY_LOG_PATH: mocks.logPath,
    EMAIL_FROM_ADDRESS: "TaskForge <no-reply@example.com>",
  },
}));

const { writeEmailDeliveryLog } = await import(
  "../../../src/services/email-log.service.js"
);

describe("writeEmailDeliveryLog", () => {
  afterEach(async () => {
    await rm(mocks.logPath, { force: true });
  });

  it("writes the recipient, message, and metadata as a JSON line", async () => {
    await writeEmailDeliveryLog({
      to: "member@example.com",
      subject: "Invitation to join Engineering Team",
      text: "Open the invitation link.",
      html: "<p>Open the invitation link.</p>",
      metadata: {
        type: "workspace-invitation",
        verificationUrl: "http://localhost:5173/invitations/accept?token=secure-token",
      },
    });

    const entry = JSON.parse((await readFile(mocks.logPath, "utf8")).trim()) as {
      to: string;
      subject: string;
      from: string;
      metadata: { verificationUrl: string };
    };

    expect(entry).toEqual(
      expect.objectContaining({
        to: "member@example.com",
        subject: "Invitation to join Engineering Team",
        from: "TaskForge <no-reply@example.com>",
        metadata: expect.objectContaining({
          verificationUrl:
            "http://localhost:5173/invitations/accept?token=secure-token",
        }),
      }),
    );
  });
});
