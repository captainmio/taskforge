import { Worker, type Job } from "bullmq";
import type IORedis from "ioredis";
import {
  createWorkerRedisConnection,
  INVITATION_JOB_ATTEMPTS,
  INVITATION_QUEUE_NAME,
} from "../config/queue.js";
import {
  closeInvitationQueue,
  type InvitationEmailJobData,
} from "../queues/invitation.queue.js";
import {
  markInvitationDeliveryCompleted,
  recordInvitationDeliveryFailure,
} from "../repositories/workspace.repository.js";
import { writeInvitationEmailLog } from "../services/invitation-log.service.js";
import { recoverPendingInvitationDeliveries } from "../services/workspace.service.js";

const processInvitation = async (
  job: Job<InvitationEmailJobData>,
): Promise<void> => {
  try {
    // Logging is the current stand-in for SMTP delivery. When email is added,
    // replace this service call while keeping the queue and status flow intact.
    await writeInvitationEmailLog(job.data);
    await markInvitationDeliveryCompleted(job.data.invitationId);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown delivery error";
    // attemptsMade excludes the current run, so add one before deciding whether
    // BullMQ has reached the configured final attempt.
    const isFinalAttempt = job.attemptsMade + 1 >= INVITATION_JOB_ATTEMPTS;
    await recordInvitationDeliveryFailure(
      job.data.invitationId,
      message,
      isFinalAttempt,
    );
    // Re-throwing tells BullMQ that processing failed and activates its retry
    // policy; swallowing this error would incorrectly complete the job.
    throw error;
  }
};

// A worker needs its own long-lived Redis connection because it continuously
// waits for jobs independently from the API process that produces them.
const redisConnection: IORedis = createWorkerRedisConnection();
const worker = new Worker<InvitationEmailJobData>(
  INVITATION_QUEUE_NAME,
  processInvitation,
  {
    connection: redisConnection,
    // Process several invitations in parallel so a large workspace does not
    // make its members wait for each email operation sequentially.
    concurrency: 10,
  },
);

worker.on("error", (error) => {
  console.error("Invitation worker error", error);
});

const recoverInvitationDeliveries = async (): Promise<number> => {
  let total = 0;
  let recoveredCount: number;

  // The service reads at most 100 pending records. A full batch means more may
  // remain, so continue until a smaller batch confirms that recovery caught up.
  do {
    recoveredCount = await recoverPendingInvitationDeliveries();
    total += recoveredCount;
  } while (recoveredCount === 100);

  return total;
};

const recoveredInvitationCount = await recoverInvitationDeliveries();
console.log(
  `Invitation worker started; recovered ${recoveredInvitationCount} pending deliveries`,
);

let recoveryIsRunning = false;
const recoveryTimer = setInterval(() => {
  // Skip this interval when the previous database/Redis recovery is still
  // running; overlapping scans could attempt to enqueue the same invitations.
  if (recoveryIsRunning) return;

  recoveryIsRunning = true;
  void recoverInvitationDeliveries()
    .catch((error: unknown) => {
      console.error("Unable to recover pending invitation deliveries", error);
    })
    .finally(() => {
      recoveryIsRunning = false;
    });
}, 30_000);
// The recovery timer alone should not prevent Node.js from shutting down.
recoveryTimer.unref();

const shutdown = async (): Promise<void> => {
  // Stop accepting work and close every Redis connection cleanly when the
  // process manager or developer terminates the worker.
  clearInterval(recoveryTimer);
  await worker.close();
  redisConnection.disconnect();
  await closeInvitationQueue();
};

process.once("SIGINT", () => void shutdown());
process.once("SIGTERM", () => void shutdown());
