import request from "supertest";
import { EmailAlreadyRegisteredError } from "../../../src/errors/auth.errors.js";
import { registerUser } from "../../../src/services/auth.service.js";
import { validRegistration } from "../../helpers/registration.fixture.js";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../../src/services/auth.service.js", () => ({
  getCurrentUser: vi.fn(),
  registerUser: vi.fn(),
}));

const { default: app } = await import("../../../src/app.js");

const createdUser = {
  id: 1,
  firstname: validRegistration.firstname,
  lastname: validRegistration.lastname,
  email: validRegistration.email,
  password: "hashed-password",
};

describe("POST /api/auth/register", () => {
  beforeEach(() => {
    vi.mocked(registerUser).mockResolvedValue(createdUser);
  });

  it("returns 201 and passes normalized data to the service", async () => {
    const response = await request(app)
      .post("/api/auth/register")
      .send({
        ...validRegistration,
        firstname: "  Ada ",
        lastname: " Lovelace  ",
        email: " ADA@Example.COM ",
      });

    expect(response.status).toBe(201);
    expect(response.body).toEqual({
      success: true,
      message: "Account created",
    });
    expect(registerUser).toHaveBeenCalledWith(validRegistration);
  });

  it("returns 400 without calling the service for invalid input", async () => {
    const response = await request(app)
      .post("/api/auth/register")
      .send({ ...validRegistration, password: "short" });

    expect(response.status).toBe(400);
    expect(response.body.message).toBe("Validation failed");
    expect(registerUser).not.toHaveBeenCalled();
  });

  it("returns 409 when the email is already registered", async () => {
    vi.mocked(registerUser).mockRejectedValue(
      new EmailAlreadyRegisteredError(),
    );

    const response = await request(app)
      .post("/api/auth/register")
      .send(validRegistration);

    expect(response.status).toBe(409);
    expect(response.body).toEqual({
      success: false,
      error: "Email already exists",
    });
  });

  it("returns 500 for an unexpected service failure", async () => {
    vi.mocked(registerUser).mockRejectedValue(new Error("Unexpected failure"));

    const response = await request(app)
      .post("/api/auth/register")
      .send(validRegistration);

    expect(response.status).toBe(500);
    expect(response.body).toEqual({
      success: false,
      error: "Something went wrong on our end",
    });
  });
});
