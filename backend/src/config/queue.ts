import IORedis from "ioredis";
import { env } from "./env.js";

export const INVITATION_QUEUE_NAME = "workspace-invitations";
export const INVITATION_JOB_NAME = "send-workspace-invitation";
export const INVITATION_JOB_ATTEMPTS = 3;

export const createQueueRedisConnection = () =>
  new IORedis(env.REDIS_URL, {
    enableOfflineQueue: false,
    maxRetriesPerRequest: 1,
  });

export const createWorkerRedisConnection = () =>
  new IORedis(env.REDIS_URL, {
    maxRetriesPerRequest: null,
  });
