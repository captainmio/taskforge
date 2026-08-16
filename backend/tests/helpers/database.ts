import { prisma } from "../../src/config/database.js";

export const clearTestDatabase = async (): Promise<void> => {
  await prisma.workspace.deleteMany();
  await prisma.user.deleteMany();
};
