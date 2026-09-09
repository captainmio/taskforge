import { Queue } from "bullmq";
import type IORedis from "ioredis";
import ms from "ms";
import {
  createQueueRedisConnection,
  EMAIL_JOB_ATTEMPTS,
  EMAIL_JOB_NAME,
  EMAIL_QUEUE_NAME,
} from "../config/queue.js";

export interface TransactionalEmailJobData {
  to: string;
  subject: string;
  text: string;
  html: string;
  metadata: Record<string, string>;
}

let emailQueue: Queue<TransactionalEmailJobData> | undefined;
let redisConnection: IORedis | undefined;

const getEmailQueue = (): Queue<TransactionalEmailJobData> => {
  if (!emailQueue) {
    redisConnection = createQueueRedisConnection();
    emailQueue = new Queue<TransactionalEmailJobData>(EMAIL_QUEUE_NAME, {
      connection: redisConnection,
      defaultJobOptions: {
        attempts: EMAIL_JOB_ATTEMPTS,
        backoff: { type: "exponential", delay: ms("1s") },
        removeOnComplete: true,
        removeOnFail: { count: 500 },
      },
    });
  }

  return emailQueue;
};

export const enqueueTransactionalEmail = async (
  email: TransactionalEmailJobData,
): Promise<void> => {
  await getEmailQueue().add(EMAIL_JOB_NAME, email);
};

export const closeEmailQueue = async (): Promise<void> => {
  await emailQueue?.close();
  redisConnection?.disconnect();
  emailQueue = undefined;
  redisConnection = undefined;
};
