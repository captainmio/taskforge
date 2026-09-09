import { appendFile, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { env } from "../config/env.js";

export interface EmailDeliveryLog {
  to: string;
  subject: string;
  text: string;
  html: string;
  metadata: Record<string, string>;
}

export const writeEmailDeliveryLog = async (
  email: EmailDeliveryLog,
): Promise<void> => {
  const logPath = resolve(env.EMAIL_DELIVERY_LOG_PATH);
  const entry = {
    timestamp: new Date().toISOString(),
    from: env.EMAIL_FROM_ADDRESS,
    ...email,
  };

  await mkdir(dirname(logPath), { recursive: true });
  await appendFile(logPath, `${JSON.stringify(entry)}\n`, "utf8");
};
