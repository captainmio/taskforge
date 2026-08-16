import { Queue } from "bullmq";
import type IORedis from "ioredis";
import type { WorkspaceRole } from "../generated/prisma/enums.js";
import {
  createQueueRedisConnection,
  INVITATION_JOB_ATTEMPTS,
  INVITATION_JOB_NAME,
  INVITATION_QUEUE_NAME,
} from "../config/queue.js";

export interface InvitationEmailJobData {
  invitationId: number;
  email: string;
  workspaceDisplayName: string;
  role: WorkspaceRole;
  verificationUrl: string;
}

let invitationQueue: Queue<InvitationEmailJobData> | undefined;
let redisConnection: IORedis | undefined;

const getInvitationQueue = (): Queue<InvitationEmailJobData> => {
  // Connect lazily so importing this module (for example, in tests or API startup)
  // does not open Redis until invitation work actually needs to be queued.
  if (!invitationQueue) {
    redisConnection = createQueueRedisConnection();
    invitationQueue = new Queue<InvitationEmailJobData>(INVITATION_QUEUE_NAME, {
      connection: redisConnection,
      defaultJobOptions: {
        // BullMQ retries temporary delivery failures before retaining a final
        // failure for inspection. Successful jobs do not need to remain in Redis.
        attempts: INVITATION_JOB_ATTEMPTS,
        backoff: { type: "exponential", delay: 1_000 },
        removeOnComplete: true,
        removeOnFail: { count: 500 },
      },
    });
    invitationQueue.on("error", (error) => {
      console.error("Invitation queue error", error);
    });
  }

  return invitationQueue;
};

export const enqueueInvitationEmails = async (
  invitations: InvitationEmailJobData[],
): Promise<void> => {
  if (invitations.length === 0) return;

  await getInvitationQueue().addBulk(
    invitations.map((invitation) => ({
      name: INVITATION_JOB_NAME,
      data: invitation,
      // A stable ID prevents recovery from adding a second copy while the same
      // invitation job still exists in Redis.
      opts: { jobId: `workspace-invitation-${invitation.invitationId}` },
    })),
  );
};

// Recovery uses this lookup to distinguish a database record that was never
// queued from one whose job was queued before the API could update the database.
export const findQueuedInvitationEmail = async (
  invitationId: number,
): Promise<InvitationEmailJobData | undefined> => {
  const job = await getInvitationQueue().getJob(
    `workspace-invitation-${invitationId}`,
  );
  return job?.data;
};

export const closeInvitationQueue = async (): Promise<void> => {
  // Closing both objects lets tests and graceful shutdowns exit without leaving
  // an active Redis socket behind.
  await invitationQueue?.close();
  redisConnection?.disconnect();
  invitationQueue = undefined;
  redisConnection = undefined;
};
