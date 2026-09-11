import nodemailer from "nodemailer";
import { env } from "../config/env.js";
import type { TransactionalEmailJobData } from "../queues/email.queue.js";

const transport = nodemailer.createTransport({
  host: env.SMTP_HOST,
  port: env.SMTP_PORT,
  secure: env.SMTP_PORT === 465,
  auth: {
    user: env.SMTP_USERNAME,
    pass: env.SMTP_PASSWORD,
  },
});

export const sendTransactionalEmail = async (
  email: TransactionalEmailJobData,
): Promise<void> => {
  await transport.sendMail({
    from: env.EMAIL_FROM_ADDRESS,
    to: email.to,
    subject: email.subject,
    text: email.text,
    html: email.html,
  });
};
