import bcrypt from "bcrypt";
import { Prisma } from "../../../src/generated/prisma/client.js";
import {
  EmailAlreadyRegisteredError,
  EmailVerificationError,
  EmailVerificationResendError,
  PasswordResetError,
  PasswordResetRequestError,
} from "../../../src/errors/auth.errors.js";
import {
  createUser,
  findUserByEmail,
  findUserByEmailVerificationTokenHash,
  findUserByPasswordResetTokenHash,
  findPasswordResetTokenByUserId,
  markUserEmailVerified,
  replaceUserEmailVerificationToken,
  replaceUserPasswordResetToken,
  updateUserPassword,
} from "../../../src/repositories/user.repository.js";
import { enqueueTransactionalEmail } from "../../../src/queues/email.queue.js";
import {
  registerUser,
  requestPasswordReset,
  resetPassword,
  resendEmailVerification,
  verifyUserEmail,
} from "../../../src/services/auth.service.js";
import { validRegistration } from "../../helpers/registration.fixture.js";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Mock } from "vitest";

vi.mock("bcrypt", () => ({
  default: {
    hash: vi.fn(),
  },
}));

vi.mock("../../../src/repositories/user.repository.js", () => ({
  createUser: vi.fn(),
  findUserByEmail: vi.fn(),
  findUserByEmailVerificationTokenHash: vi.fn(),
  findUserByPasswordResetTokenHash: vi.fn(),
  findPasswordResetTokenByUserId: vi.fn(),
  findUserWithWorkspaceMembershipsById: vi.fn(),
  markUserEmailVerified: vi.fn(),
  replaceUserEmailVerificationToken: vi.fn(),
  replaceUserPasswordResetToken: vi.fn(),
  updateUserPassword: vi.fn(),
}));

vi.mock("../../../src/queues/email.queue.js", () => ({
  enqueueTransactionalEmail: vi.fn(),
}));

const createdUser = {
  id: 1,
  firstname: validRegistration.firstname,
  lastname: validRegistration.lastname,
  email: validRegistration.email,
  password: "hashed-password",
  emailVerifiedAt: null,
  emailVerificationTokenHash: "token-hash",
  emailVerificationExpiresAt: new Date("2026-10-01T00:00:00.000Z"),
  emailVerificationSentAt: new Date("2026-09-01T00:00:00.000Z"),
};

const hashPassword = bcrypt.hash as unknown as Mock<
  (data: string | Buffer, saltOrRounds: string | number) => Promise<string>
>;

describe("registerUser", () => {
  beforeEach(() => {
    hashPassword.mockResolvedValue("hashed-password");
    vi.mocked(createUser).mockResolvedValue(createdUser);
    vi.mocked(enqueueTransactionalEmail).mockResolvedValue();
  });

  it("hashes the password before creating the user", async () => {
    await registerUser(validRegistration);

    expect(hashPassword).toHaveBeenCalledWith(validRegistration.password, 4);
    expect(createUser).toHaveBeenCalledWith(
      expect.objectContaining({
        ...validRegistration,
        password: "hashed-password",
        emailVerificationTokenHash: expect.any(String),
        emailVerificationExpiresAt: expect.any(Date),
        emailVerificationSentAt: expect.any(Date),
      }),
    );
    expect(enqueueTransactionalEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: validRegistration.email,
        html: expect.stringContaining("TaskForge"),
        text: expect.stringContaining("Verify email:"),
        metadata: expect.objectContaining({
          type: "account-verification",
          verificationUrl: expect.stringContaining(
            "/api/auth/verify-email?token=",
          ),
        }),
      }),
    );
  });

  it("translates a duplicate email database error", async () => {
    const duplicateEmailError = new Prisma.PrismaClientKnownRequestError(
      "Unique constraint failed",
      {
        code: "P2002",
        clientVersion: "7.9.1",
        meta: { target: ["email"] },
      },
    );
    vi.mocked(createUser).mockRejectedValue(duplicateEmailError);

    await expect(registerUser(validRegistration)).rejects.toBeInstanceOf(
      EmailAlreadyRegisteredError,
    );
  });

  it("does not hide unexpected repository errors", async () => {
    const unexpectedError = new Error("Database unavailable");
    vi.mocked(createUser).mockRejectedValue(unexpectedError);

    await expect(registerUser(validRegistration)).rejects.toBe(unexpectedError);
  });
});

describe("password reset", () => {
  const verifiedUser = {
    ...createdUser,
    emailVerifiedAt: new Date("2026-09-01T00:00:00.000Z"),
  };

  beforeEach(() => {
    vi.mocked(findPasswordResetTokenByUserId).mockResolvedValue(null);
    vi.mocked(replaceUserPasswordResetToken).mockResolvedValue({
      userId: verifiedUser.id,
      tokenHash: "reset-token-hash",
      expiresAt: new Date("2026-10-01T00:00:00.000Z"),
      sentAt: new Date(),
    });
    vi.mocked(enqueueTransactionalEmail).mockResolvedValue();
    vi.mocked(updateUserPassword).mockResolvedValue([
      verifiedUser,
      {
        userId: verifiedUser.id,
        tokenHash: "reset-token-hash",
        expiresAt: new Date(),
        sentAt: new Date(),
      },
    ]);
  });

  it("rejects requests for unknown, unverified, and recently emailed accounts", async () => {
    vi.mocked(findUserByEmail).mockResolvedValueOnce(null);
    await expect(
      requestPasswordReset("unknown@example.com"),
    ).rejects.toMatchObject({
      reason: "EMAIL_NOT_FOUND",
    } satisfies Partial<PasswordResetRequestError>);

    vi.mocked(findUserByEmail).mockResolvedValueOnce({
      ...createdUser,
      emailVerifiedAt: null,
    });
    await expect(requestPasswordReset(createdUser.email)).rejects.toMatchObject(
      {
        reason: "EMAIL_UNVERIFIED",
      } satisfies Partial<PasswordResetRequestError>,
    );

    vi.mocked(findUserByEmail).mockResolvedValueOnce(verifiedUser);
    vi.mocked(findPasswordResetTokenByUserId).mockResolvedValueOnce({
      userId: verifiedUser.id,
      tokenHash: "reset-token-hash",
      expiresAt: new Date(Date.now() + 60_000),
      sentAt: new Date(),
    });
    await expect(
      requestPasswordReset(verifiedUser.email),
    ).rejects.toMatchObject({
      reason: "COOLDOWN",
      retryAfterSeconds: expect.any(Number),
    } satisfies Partial<PasswordResetRequestError>);
  });

  it("stores a hashed token and queues a reset link for an eligible account", async () => {
    vi.mocked(findUserByEmail).mockResolvedValue(verifiedUser);

    await requestPasswordReset(verifiedUser.email);

    expect(replaceUserPasswordResetToken).toHaveBeenCalledWith(
      verifiedUser.id,
      expect.any(String),
      expect.any(Date),
    );
    expect(enqueueTransactionalEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: verifiedUser.email,
        html: expect.stringContaining("TaskForge"),
        text: expect.stringContaining("Reset password:"),
        metadata: expect.objectContaining({
          type: "password-reset",
          resetUrl: expect.stringContaining("/reset-password?token="),
        }),
      }),
    );
  });

  it("rejects invalid and expired tokens, then updates a valid password once", async () => {
    vi.mocked(findUserByPasswordResetTokenHash).mockResolvedValueOnce(null);
    await expect(
      resetPassword({ token: "invalid", password: "new-password" }),
    ).rejects.toMatchObject({
      reason: "INVALID",
    } satisfies Partial<PasswordResetError>);

    vi.mocked(findUserByPasswordResetTokenHash).mockResolvedValueOnce({
      userId: verifiedUser.id,
      tokenHash: "reset-token-hash",
      expiresAt: new Date(Date.now() - 1),
      sentAt: new Date(),
      user: verifiedUser,
    });
    await expect(
      resetPassword({ token: "expired", password: "new-password" }),
    ).rejects.toMatchObject({
      reason: "EXPIRED",
    } satisfies Partial<PasswordResetError>);

    vi.mocked(findUserByPasswordResetTokenHash).mockResolvedValueOnce({
      userId: verifiedUser.id,
      tokenHash: "reset-token-hash",
      expiresAt: new Date(Date.now() + 60_000),
      sentAt: new Date(),
      user: verifiedUser,
    });
    await resetPassword({ token: "valid", password: "new-password" });

    expect(hashPassword).toHaveBeenCalledWith("new-password", 4);
    expect(updateUserPassword).toHaveBeenCalledWith(
      verifiedUser.id,
      "hashed-password",
    );
  });
});

describe("email verification", () => {
  const unverifiedUser = {
    ...createdUser,
    emailVerifiedAt: null,
    emailVerificationSentAt: null,
  };

  beforeEach(() => {
    vi.mocked(enqueueTransactionalEmail).mockResolvedValue();
    vi.mocked(replaceUserEmailVerificationToken).mockResolvedValue(
      unverifiedUser,
    );
    vi.mocked(markUserEmailVerified).mockResolvedValue({
      ...unverifiedUser,
      emailVerifiedAt: new Date(),
    });
  });

  it("does not reveal whether an unknown email exists", async () => {
    vi.mocked(findUserByEmail).mockResolvedValue(null);

    await expect(
      resendEmailVerification("unknown@example.com"),
    ).resolves.toBeUndefined();
    expect(enqueueTransactionalEmail).not.toHaveBeenCalled();
  });

  it("rejects a resend request for an already verified account", async () => {
    vi.mocked(findUserByEmail).mockResolvedValue({
      ...unverifiedUser,
      emailVerifiedAt: new Date(),
    });

    await expect(
      resendEmailVerification(validRegistration.email),
    ).rejects.toMatchObject({
      reason: "ALREADY_VERIFIED",
    } satisfies Partial<EmailVerificationResendError>);
  });

  it("rejects a resend request during the cooldown", async () => {
    vi.mocked(findUserByEmail).mockResolvedValue({
      ...unverifiedUser,
      emailVerificationSentAt: new Date(),
    });

    await expect(
      resendEmailVerification(validRegistration.email),
    ).rejects.toMatchObject({
      reason: "COOLDOWN",
      retryAfterSeconds: expect.any(Number),
    } satisfies Partial<EmailVerificationResendError>);
  });

  it("replaces the token and queues an email for an eligible account", async () => {
    vi.mocked(findUserByEmail).mockResolvedValue(unverifiedUser);

    await resendEmailVerification(validRegistration.email);

    expect(replaceUserEmailVerificationToken).toHaveBeenCalledWith(
      unverifiedUser.id,
      expect.any(String),
      expect.any(Date),
    );
    expect(enqueueTransactionalEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: validRegistration.email,
        html: expect.stringContaining("TaskForge"),
        text: expect.stringContaining("Verify email:"),
      }),
    );
  });

  it("distinguishes invalid and expired verification links", async () => {
    vi.mocked(findUserByEmailVerificationTokenHash).mockResolvedValueOnce(null);
    await expect(verifyUserEmail("invalid-token")).rejects.toMatchObject({
      reason: "INVALID",
    } satisfies Partial<EmailVerificationError>);

    vi.mocked(findUserByEmailVerificationTokenHash).mockResolvedValueOnce({
      ...unverifiedUser,
      emailVerificationExpiresAt: new Date(Date.now() - 1),
    });
    await expect(verifyUserEmail("expired-token")).rejects.toMatchObject({
      reason: "EXPIRED",
    } satisfies Partial<EmailVerificationError>);
  });

  it("marks an account verified when its link is valid", async () => {
    vi.mocked(findUserByEmailVerificationTokenHash).mockResolvedValue({
      ...unverifiedUser,
      emailVerificationExpiresAt: new Date(Date.now() + 60_000),
    });

    await verifyUserEmail("valid-token");

    expect(markUserEmailVerified).toHaveBeenCalledWith(unverifiedUser.id);
  });
});
