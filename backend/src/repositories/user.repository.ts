import { prisma } from "../config/database.js";

export type CreateUserData = {
  email: string;
  firstname: string;
  lastname: string;
  password: string;
};

export const createUser = async (data: CreateUserData) => {
  return prisma.user.create({ data });
};

export const findUserByEmail = async (email: string) => {
  return prisma.user.findUnique({ where: { email } });
};

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
