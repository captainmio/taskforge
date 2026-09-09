import bcrypt from "bcrypt";
import { createHash, randomBytes } from "node:crypto";
import jwt from "jsonwebtoken";
import ms, { type StringValue } from "ms";
import {
    BCRYPT_SALT_ROUNDS,
    JWT_EXPIRES_IN,
    JWT_SECRET,
} from "../config/auth.js";
import {
  EmailAlreadyRegisteredError,
  EmailVerificationError,
  EmailVerificationResendError,
  EmailVerificationRequiredError,
    InvalidCredentialsError,
  PasswordResetError,
  PasswordResetRequestError,
} from "../errors/auth.errors.js";
import { env } from "../config/env.js";
import { enqueueTransactionalEmail } from "../queues/email.queue.js";
import { Prisma } from "../generated/prisma/client.js";
import {
    createUser,
    findUserByEmail,
    findUserByEmailVerificationTokenHash,
    findUserByPasswordResetTokenHash,
    findPasswordResetTokenByUserId,
    findUserWithWorkspaceMembershipsById,
    markUserEmailVerified,
    replaceUserEmailVerificationToken,
    replaceUserPasswordResetToken,
    updateUserPassword,
} from "../repositories/user.repository.js";
import type {
  LoginBody,
  RegisterBody,
  ResetPasswordBody,
} from "../validations/auth.validation.js";

const hashEmailVerificationToken = (token: string): string =>
  createHash("sha256").update(token).digest("hex");

const createEmailVerificationUrl = (token: string): string => {
  const verificationUrl = new URL("/api/auth/verify-email", env.BACKEND_PUBLIC_URL);
  verificationUrl.searchParams.set("token", token);
  return verificationUrl.toString();
};

const createPasswordResetUrl = (token: string): string => {
  const resetUrl = new URL("/reset-password", env.FRONTEND_API);
  resetUrl.searchParams.set("token", token);
  return resetUrl.toString();
};

const createEmailVerification = () => {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(
    Date.now() +
      ms(`${env.ACCOUNT_VERIFICATION_TOKEN_TTL_HOURS}h` as StringValue),
  );

  return { token, tokenHash: hashEmailVerificationToken(token), expiresAt };
};

const queueEmailVerification = async (email: string, token: string): Promise<void> => {
  const verificationUrl = createEmailVerificationUrl(token);

  await enqueueTransactionalEmail({
    to: email,
    subject: "Verify your TaskForge email address",
    text: `Verify your TaskForge account by opening this link: ${verificationUrl}`,
    html: `<p>Verify your TaskForge account by opening this link:</p><p><a href="${verificationUrl}">${verificationUrl}</a></p>`,
    metadata: {
      type: "account-verification",
      verificationUrl,
    },
  });
};

const createPasswordReset = () => {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(
    Date.now() +
      ms(`${env.PASSWORD_RESET_TOKEN_TTL_MINUTES}m` as StringValue),
  );

  return { token, tokenHash: hashEmailVerificationToken(token), expiresAt };
};

const queuePasswordReset = async (email: string, token: string): Promise<void> => {
  const resetUrl = createPasswordResetUrl(token);

  await enqueueTransactionalEmail({
    to: email,
    subject: "Reset your TaskForge password",
    text: `Reset your TaskForge password by opening this link: ${resetUrl}`,
    html: `<p>Reset your TaskForge password by opening this link:</p><p><a href="${resetUrl}">${resetUrl}</a></p>`,
    metadata: {
      type: "password-reset",
      resetUrl,
    },
  });
};

export const loginUser = async (credentials: LoginBody) => {
  const user = await findUserByEmail(credentials.email);

  if (!user || !(await bcrypt.compare(credentials.password, user.password))) {
    throw new InvalidCredentialsError();
  }

  if (!user.emailVerifiedAt) throw new EmailVerificationRequiredError();

  const token = jwt.sign(
    { sub: user.id, email: user.email },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN },
  );

  return {
    token,
    user: {
      id: user.id,
      email: user.email,
      firstname: user.firstname,
      lastname: user.lastname,
    },
  };
};

export const registerUser = async (registration: RegisterBody) => {
  const passwordHash = await bcrypt.hash(
    registration.password,
    BCRYPT_SALT_ROUNDS,
  );

  try {
    const verification = createEmailVerification();
    const user = await createUser({
      email: registration.email,
      firstname: registration.firstname,
      lastname: registration.lastname,
      password: passwordHash,
      emailVerificationTokenHash: verification.tokenHash,
      emailVerificationExpiresAt: verification.expiresAt,
      emailVerificationSentAt: new Date(),
    });
    await queueEmailVerification(user.email, verification.token);
    return user;
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw new EmailAlreadyRegisteredError();
    }

    throw error;
  }
};

export const resendEmailVerification = async (email: string): Promise<void> => {
  const user = await findUserByEmail(email);
  if (!user) return;

  if (user.emailVerifiedAt) {
    throw new EmailVerificationResendError("ALREADY_VERIFIED");
  }

  const resendAvailableAt = user.emailVerificationSentAt
    ? user.emailVerificationSentAt.getTime() +
      ms(
        `${env.ACCOUNT_VERIFICATION_RESEND_COOLDOWN_SECONDS}s` as StringValue,
      )
    : 0;
  if (resendAvailableAt > Date.now()) {
    throw new EmailVerificationResendError(
      "COOLDOWN",
      Math.ceil((resendAvailableAt - Date.now()) / ms("1s")),
    );
  }

  const verification = createEmailVerification();
  await replaceUserEmailVerificationToken(
    user.id,
    verification.tokenHash,
    verification.expiresAt,
  );

  await queueEmailVerification(user.email, verification.token);
};

export const verifyUserEmail = async (token: string) => {
  const user = await findUserByEmailVerificationTokenHash(
    hashEmailVerificationToken(token),
  );

  if (!user || !user.emailVerificationExpiresAt) {
    throw new EmailVerificationError("INVALID");
  }

  if (user.emailVerificationExpiresAt <= new Date()) {
    throw new EmailVerificationError("EXPIRED");
  }

  return markUserEmailVerified(user.id);
};

export const requestPasswordReset = async (email: string): Promise<void> => {
  const user = await findUserByEmail(email);

  if (!user) {
    throw new PasswordResetRequestError("EMAIL_NOT_FOUND");
  }

  if (!user.emailVerifiedAt) {
    throw new PasswordResetRequestError("EMAIL_UNVERIFIED");
  }

  const existingReset = await findPasswordResetTokenByUserId(user.id);
  const resetAvailableAt = existingReset
    ? existingReset.sentAt.getTime() +
      ms(`${env.PASSWORD_RESET_RESEND_COOLDOWN_SECONDS}s` as StringValue)
    : 0;
  if (resetAvailableAt > Date.now()) {
    throw new PasswordResetRequestError(
      "COOLDOWN",
      Math.ceil((resetAvailableAt - Date.now()) / ms("1s")),
    );
  }

  const reset = createPasswordReset();
  await replaceUserPasswordResetToken(user.id, reset.tokenHash, reset.expiresAt);
  await queuePasswordReset(user.email, reset.token);
};

export const resetPassword = async ({ token, password }: ResetPasswordBody) => {
  const user = await findUserByPasswordResetTokenHash(
    hashEmailVerificationToken(token),
  );

  if (!user) {
    throw new PasswordResetError("INVALID");
  }

  if (user.expiresAt <= new Date()) {
    throw new PasswordResetError("EXPIRED");
  }

  const passwordHash = await bcrypt.hash(password, BCRYPT_SALT_ROUNDS);
  return updateUserPassword(user.userId, passwordHash);
};

export const getCurrentUser = async (userId: number) => {
  const user = await findUserWithWorkspaceMembershipsById(userId);
  if (!user) return null;

  const { workspaceMemberships, ...userDetails } = user;
  return {
    user: userDetails,
    workspaces: workspaceMemberships.map(({ workspace, role }) => ({
      id: workspace.id,
      name: workspace.displayName,
      role,
    })),
  };
};
