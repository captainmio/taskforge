import { prisma } from "../config/database.js";

export type CreateUserData = {
  email: string;
  firstname: string;
  lastname: string;
  password: string;
  emailVerificationTokenHash: string;
  emailVerificationExpiresAt: Date;
  emailVerificationSentAt: Date;
};

export const createUser = async (data: CreateUserData) => {
  return prisma.user.create({ data });
};

export const findUserByEmail = async (email: string) => {
  return prisma.user.findUnique({ where: { email } });
};

export const findUserByEmailVerificationTokenHash = async (tokenHash: string) =>
  prisma.user.findUnique({ where: { emailVerificationTokenHash: tokenHash } });

export const replaceUserEmailVerificationToken = async (
  userId: number,
  tokenHash: string,
  expiresAt: Date,
) =>
  prisma.user.update({
    where: { id: userId },
    data: {
      emailVerificationTokenHash: tokenHash,
      emailVerificationExpiresAt: expiresAt,
      emailVerificationSentAt: new Date(),
    },
  });

export const markUserEmailVerified = async (userId: number) =>
  prisma.user.update({
    where: { id: userId },
    data: {
      emailVerifiedAt: new Date(),
      emailVerificationTokenHash: null,
      emailVerificationExpiresAt: null,
      emailVerificationSentAt: null,
    },
  });

export const findUserByPasswordResetTokenHash = async (tokenHash: string) =>
  prisma.passwordResetToken.findUnique({
    where: { tokenHash },
    include: { user: true },
  });

export const findPasswordResetTokenByUserId = async (userId: number) =>
  prisma.passwordResetToken.findUnique({ where: { userId } });

export const replaceUserPasswordResetToken = async (
  userId: number,
  tokenHash: string,
  expiresAt: Date,
) =>
  prisma.passwordResetToken.upsert({
    where: { userId },
    create: { userId, tokenHash, expiresAt, sentAt: new Date() },
    update: { tokenHash, expiresAt, sentAt: new Date() },
  });

export const updateUserPassword = async (userId: number, password: string) =>
  prisma.$transaction([
    prisma.user.update({ where: { id: userId }, data: { password } }),
    prisma.passwordResetToken.delete({ where: { userId } }),
  ]);

export const findUserWithWorkspaceMembershipsById = async (id: number) =>
  prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      email: true,
      firstname: true,
      lastname: true,
      workspaceMemberships: {
        orderBy: { createdAt: "asc" },
        select: {
          role: true,
          workspace: {
            select: {
              id: true,
              displayName: true,
            },
          },
        },
      },
    },
  });
