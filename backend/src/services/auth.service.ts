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
} from "../errors/auth.errors.js";
import { env } from "../config/env.js";
import { enqueueTransactionalEmail } from "../queues/email.queue.js";
import { Prisma } from "../generated/prisma/client.js";
import {
    createUser,
    findUserByEmail,
    findUserByEmailVerificationTokenHash,
    findUserWithWorkspaceMembershipsById,
    markUserEmailVerified,
    replaceUserEmailVerificationToken,
} from "../repositories/user.repository.js";
import type {
  LoginBody,
  RegisterBody,
} from "../validations/auth.validation.js";

const hashEmailVerificationToken = (token: string): string =>
  createHash("sha256").update(token).digest("hex");

const createEmailVerificationUrl = (token: string): string => {
  const verificationUrl = new URL("/api/auth/verify-email", env.BACKEND_PUBLIC_URL);
  verificationUrl.searchParams.set("token", token);
  return verificationUrl.toString();
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
      Math.ceil((resendAvailableAt - Date.now()) / 1_000),
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
