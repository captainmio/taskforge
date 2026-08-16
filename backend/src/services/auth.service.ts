import bcrypt from "bcrypt";
import { BCRYPT_SALT_ROUNDS } from "../config/auth.js";
import { EmailAlreadyRegisteredError } from "../errors/auth.errors.js";
import { Prisma } from "../generated/prisma/client.js";
import { createUser } from "../repositories/user.repository.js";
import type { RegisterBody } from "../validations/auth.validation.js";

export const registerUser = async (registration: RegisterBody) => {
  const passwordHash = await bcrypt.hash(
    registration.password,
    BCRYPT_SALT_ROUNDS,
  );

  try {
    return await createUser({
      email: registration.email,
      firstname: registration.firstname,
      lastname: registration.lastname,
      password: passwordHash,
    });
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
