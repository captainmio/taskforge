import { appendFile, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { env } from "../config/env.js";
import type { InvitationEmailJobData } from "../queues/invitation.queue.js";

export const writeInvitationEmailLog = async (
  invitation: InvitationEmailJobData,
): Promise<void> => {
  const logPath = resolve(env.INVITATION_LOG_PATH);
  const entry = {
    timestamp: new Date().toISOString(),
    invitationId: invitation.invitationId,
    to: invitation.email,
    subject: `Invitation to join ${invitation.workspaceDisplayName}`,
    workspace: invitation.workspaceDisplayName,
    role: invitation.role,
    verificationUrl: invitation.verificationUrl,
  };

  await mkdir(dirname(logPath), { recursive: true });
  await appendFile(logPath, `${JSON.stringify(entry)}\n`, "utf8");
};
