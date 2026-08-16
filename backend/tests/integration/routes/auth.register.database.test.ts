import bcrypt from "bcrypt";
import request from "supertest";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import app from "../../../src/app.js";
import { prisma } from "../../../src/config/database.js";
import { validRegistration } from "../../helpers/registration.fixture.js";

describe("POST /api/auth/register with PostgreSQL", () => {
  beforeEach(async () => {
    await prisma.user.deleteMany();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("creates a normalized user with a hashed password", async () => {
    const response = await request(app)
      .post("/api/auth/register")
      .send({
        ...validRegistration,
        email: " ADA@Example.COM ",
      });

    expect(response.status).toBe(201);

    const user = await prisma.user.findUnique({
      where: { email: validRegistration.email },
    });

    expect(user).not.toBeNull();
    expect(user?.password).not.toBe(validRegistration.password);
    expect(
      await bcrypt.compare(validRegistration.password, user!.password),
    ).toBe(true);
  });

  it("returns 409 when the normalized email already exists", async () => {
    await request(app).post("/api/auth/register").send(validRegistration);

    const response = await request(app)
      .post("/api/auth/register")
      .send({ ...validRegistration, email: "ADA@EXAMPLE.COM" });

    expect(response.status).toBe(409);
    expect(response.body).toEqual({
      success: false,
      error: "Email already exists",
    });
  });
});
