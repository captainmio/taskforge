import { Worker, type Job } from "bullmq";
import type IORedis from "ioredis";
import { logger } from "../config/logger.js";
import {
  createWorkerRedisConnection,
  EMAIL_QUEUE_NAME,
} from "../config/queue.js";
import {
  closeEmailQueue,
  type TransactionalEmailJobData,
} from "../queues/email.queue.js";
import { writeEmailDeliveryLog } from "../services/email-log.service.js";
import { sendTransactionalEmail } from "../services/email.service.js";

const processEmail = async (job: Job<TransactionalEmailJobData>): Promise<void> => {
  // The private development log preserves the complete message and link for
  // manual testing before delivery through Resend.
  await writeEmailDeliveryLog(job.data);
  await sendTransactionalEmail(job.data);
};

const redisConnection: IORedis = createWorkerRedisConnection();
const worker = new Worker<TransactionalEmailJobData>(EMAIL_QUEUE_NAME, processEmail, {
  connection: redisConnection,
  concurrency: 10,
});

worker.on("error", (error) => {
  logger.error(
    { logType: "system", event: "email.worker_error", err: error },
    "[SYSTEM] Transactional-email worker error",
  );
});

const shutdown = async (): Promise<void> => {
  await worker.close();
  redisConnection.disconnect();
  await closeEmailQueue();
};

process.once("SIGINT", () => void shutdown());
process.once("SIGTERM", () => void shutdown());
