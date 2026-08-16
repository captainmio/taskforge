import bcrypt from "bcrypt";
import { Prisma } from "../../../src/generated/prisma/client.js";
import { EmailAlreadyRegisteredError } from "../../../src/errors/auth.errors.js";
import { createUser } from "../../../src/repositories/user.repository.js";
import { registerUser } from "../../../src/services/auth.service.js";
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
}));

const createdUser = {
  id: 1,
  firstname: validRegistration.firstname,
  lastname: validRegistration.lastname,
  email: validRegistration.email,
  password: "hashed-password",
};

const hashPassword = bcrypt.hash as unknown as Mock<
  (data: string | Buffer, saltOrRounds: string | number) => Promise<string>
>;

describe("registerUser", () => {
  beforeEach(() => {
    hashPassword.mockResolvedValue("hashed-password");
    vi.mocked(createUser).mockResolvedValue(createdUser);
  });

  it("hashes the password before creating the user", async () => {
    await registerUser(validRegistration);

    expect(hashPassword).toHaveBeenCalledWith(
      validRegistration.password,
      4,
    );
    expect(createUser).toHaveBeenCalledWith({
      ...validRegistration,
      password: "hashed-password",
    });
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

    await expect(registerUser(validRegistration)).rejects.toBe(
      unexpectedError,
    );
  });
});
