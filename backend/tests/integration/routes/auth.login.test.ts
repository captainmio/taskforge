import request from "supertest";
import { InvalidCredentialsError } from "../../../src/errors/auth.errors.js";
import { loginUser } from "../../../src/services/auth.service.js";
import { validLogin } from "../../helpers/login.fixture.js";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../../src/services/auth.service.js", () => ({
  loginUser: vi.fn(),
}));

const { default: app } = await import("../../../src/app.js");

const authenticatedUser = {
  id: 1,
  firstname: "Ada",
  lastname: "Lovelace",
  email: validLogin.email,
};

describe("POST /api/auth/login", () => {
  beforeEach(() => {
    vi.mocked(loginUser).mockResolvedValue({
      token: "signed-token",
      user: authenticatedUser,
    });
  });

  it("returns the user, sets a cookie, and passes normalized input", async () => {
    const response = await request(app)
      .post("/api/auth/login")
      .send({ ...validLogin, email: " ADA@Example.COM " });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      success: true,
      message: "Login successful",
      user: authenticatedUser,
    });
    expect(loginUser).toHaveBeenCalledWith(validLogin);

    const cookie = response.headers["set-cookie"]?.[0];
    expect(cookie).toContain("accessToken=signed-token");
    expect(cookie).toContain("Max-Age=86400");
    expect(cookie).toContain("HttpOnly");
    expect(cookie).toContain("SameSite=Lax");
  });

  it("returns 400 without calling the service for invalid input", async () => {
    const response = await request(app)
      .post("/api/auth/login")
      .send({ ...validLogin, email: "invalid" });

    expect(response.status).toBe(400);
    expect(response.body.message).toBe("Validation failed");
    expect(loginUser).not.toHaveBeenCalled();
  });

  it("returns 401 for invalid credentials", async () => {
    vi.mocked(loginUser).mockRejectedValue(new InvalidCredentialsError());

    const response = await request(app)
      .post("/api/auth/login")
      .send(validLogin);

    expect(response.status).toBe(401);
    expect(response.body).toEqual({
      success: false,
      error: "Invalid email or password",
    });
  });

  it("returns 500 for an unexpected service failure", async () => {
    vi.mocked(loginUser).mockRejectedValue(new Error("Unexpected failure"));

    const response = await request(app)
      .post("/api/auth/login")
      .send(validLogin);

    expect(response.status).toBe(500);
    expect(response.body).toEqual({
      success: false,
      error: "Something went wrong on our end",
    });
  });
});
