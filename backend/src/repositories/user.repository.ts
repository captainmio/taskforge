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
