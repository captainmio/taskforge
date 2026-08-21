import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import {
  AUTH_SESSION_DURATION_SECONDS,
  BCRYPT_SALT_ROUNDS,
  JWT_SECRET,
} from "../config/auth.js";
import {
  EmailAlreadyRegisteredError,
  InvalidCredentialsError,
} from "../errors/auth.errors.js";
import { Prisma } from "../generated/prisma/client.js";
import {
  createUser,
  findUserByEmail,
  findUserWithWorkspaceMembershipsById,
} from "../repositories/user.repository.js";
import type {
  LoginBody,
  RegisterBody,
} from "../validations/auth.validation.js";

export const loginUser = async (credentials: LoginBody) => {
  const user = await findUserByEmail(credentials.email);

  if (!user || !(await bcrypt.compare(credentials.password, user.password))) {
    throw new InvalidCredentialsError();
  }

  const token = jwt.sign(
    { sub: user.id, email: user.email },
    JWT_SECRET,
    { expiresIn: AUTH_SESSION_DURATION_SECONDS },
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

export const getCurrentUser = async (userId: number) => {
  const user = await findUserWithWorkspaceMembershipsById(userId);
  if (!user) return null;

  const { workspaceMemberships, ...userDetails } = user;
  return {
    user: userDetails,
    workspaces: workspaceMemberships.map(({ workspace }) => ({
      id: workspace.id,
      name: workspace.displayName,
    })),
  };
};
