import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import request from "supertest";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import app from "../../../src/app.js";
import { BCRYPT_SALT_ROUNDS, JWT_SECRET } from "../../../src/config/auth.js";
import { prisma } from "../../../src/config/database.js";
import { authTokenPayloadSchema } from "../../../src/validations/auth.validation.js";
import { validLogin } from "../../helpers/login.fixture.js";

const seedUser = async () => {
  const password = await bcrypt.hash(
    validLogin.password,
    BCRYPT_SALT_ROUNDS,
  );

  return prisma.user.create({
    data: {
      firstname: "Ada",
      lastname: "Lovelace",
      email: validLogin.email,
      password,
    },
  });
};

describe("POST /api/auth/login with PostgreSQL", () => {
  beforeEach(async () => {
    await prisma.user.deleteMany();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("authenticates a normalized email and returns a valid cookie", async () => {
    const user = await seedUser();

    const response = await request(app)
      .post("/api/auth/login")
      .send({ ...validLogin, email: " ADA@Example.COM " });

    expect(response.status).toBe(200);
    expect(response.body.user).toEqual({
      id: user.id,
      firstname: user.firstname,
      lastname: user.lastname,
      email: user.email,
    });
    expect(response.body.user).not.toHaveProperty("password");

    const cookie = response.headers["set-cookie"]?.[0];
    const token = cookie?.match(/^accessToken=([^;]+)/)?.[1];

    if (!token) {
      throw new Error("Login response did not include an access token cookie");
    }

    const payload = authTokenPayloadSchema.parse(jwt.verify(token, JWT_SECRET));
    expect(payload).toMatchObject({ sub: user.id, email: user.email });
  });

  it("returns 401 for an incorrect password", async () => {
    await seedUser();

    const response = await request(app)
      .post("/api/auth/login")
      .send({ ...validLogin, password: "incorrect-password" });

    expect(response.status).toBe(401);
    expect(response.body.error).toBe("Invalid email or password");
  });

  it("returns the same 401 response for an unknown email", async () => {
    const response = await request(app)
      .post("/api/auth/login")
      .send(validLogin);

    expect(response.status).toBe(401);
    expect(response.body.error).toBe("Invalid email or password");
  });
});
