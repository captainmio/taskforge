import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { InvalidCredentialsError } from "../../../src/errors/auth.errors.js";
import { findUserByEmail } from "../../../src/repositories/user.repository.js";
import { loginUser } from "../../../src/services/auth.service.js";
import { validLogin } from "../../helpers/login.fixture.js";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Mock } from "vitest";

vi.mock("bcrypt", () => ({
  default: {
    compare: vi.fn(),
  },
}));

vi.mock("jsonwebtoken", () => ({
  default: {
    sign: vi.fn(),
  },
}));

vi.mock("../../../src/repositories/user.repository.js", () => ({
  findUserByEmail: vi.fn(),
}));

const storedUser = {
  id: 1,
  firstname: "Ada",
  lastname: "Lovelace",
  email: validLogin.email,
  password: "hashed-password",
};

const comparePassword = bcrypt.compare as unknown as Mock<
  (password: string | Buffer, hash: string) => Promise<boolean>
>;
const signToken = jwt.sign as unknown as Mock<
  (
    payload: object,
    secret: string,
    options: { expiresIn: number },
  ) => string
>;

describe("loginUser", () => {
  beforeEach(() => {
    vi.mocked(findUserByEmail).mockResolvedValue(storedUser);
    comparePassword.mockResolvedValue(true);
    signToken.mockReturnValue("signed-token");
  });

  it("verifies the password and returns a token with safe user data", async () => {
    const result = await loginUser(validLogin);

    expect(findUserByEmail).toHaveBeenCalledWith(validLogin.email);
    expect(comparePassword).toHaveBeenCalledWith(
      validLogin.password,
      storedUser.password,
    );
    expect(signToken).toHaveBeenCalledWith(
      { sub: storedUser.id, email: storedUser.email },
      "test-only-jwt-secret",
      { expiresIn: 86_400 },
    );
    expect(result).toEqual({
      token: "signed-token",
      user: {
        id: storedUser.id,
        email: storedUser.email,
        firstname: storedUser.firstname,
        lastname: storedUser.lastname,
      },
    });
    expect(result.user).not.toHaveProperty("password");
  });

  it("rejects an unknown email without comparing a password", async () => {
    vi.mocked(findUserByEmail).mockResolvedValue(null);

    await expect(loginUser(validLogin)).rejects.toBeInstanceOf(
      InvalidCredentialsError,
    );
    expect(comparePassword).not.toHaveBeenCalled();
    expect(signToken).not.toHaveBeenCalled();
  });

  it("rejects an incorrect password", async () => {
    comparePassword.mockResolvedValue(false);

    await expect(loginUser(validLogin)).rejects.toBeInstanceOf(
      InvalidCredentialsError,
    );
    expect(signToken).not.toHaveBeenCalled();
  });

  it("does not hide unexpected repository errors", async () => {
    const unexpectedError = new Error("Database unavailable");
    vi.mocked(findUserByEmail).mockRejectedValue(unexpectedError);

    await expect(loginUser(validLogin)).rejects.toBe(unexpectedError);
  });
});
