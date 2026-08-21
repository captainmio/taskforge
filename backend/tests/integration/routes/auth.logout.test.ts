import jwt from "jsonwebtoken";
import request from "supertest";
import { JWT_SECRET } from "../../../src/config/auth.js";
import {
  getCurrentUser,
  loginUser,
} from "../../../src/services/auth.service.js";
import { validLogin } from "../../helpers/login.fixture.js";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../../src/services/auth.service.js", () => ({
  getCurrentUser: vi.fn(),
  loginUser: vi.fn(),
  registerUser: vi.fn(),
}));

const { default: app } = await import("../../../src/app.js");

const authenticatedUser = {
  id: 1,
  firstname: "Ada",
  lastname: "Lovelace",
  email: validLogin.email,
};

describe("POST /api/auth/logout", () => {
  beforeEach(() => {
    vi.mocked(loginUser).mockResolvedValue({
      token: jwt.sign(
        { sub: authenticatedUser.id, email: authenticatedUser.email },
        JWT_SECRET,
        { expiresIn: 60 },
      ),
      user: authenticatedUser,
    });
    vi.mocked(getCurrentUser).mockResolvedValue({
      user: authenticatedUser,
      workspaces: [{ id: 10, name: "Engineering" }],
    });
  });

  it("clears the access token cookie and returns a successful response", async () => {
    const response = await request(app)
      .post("/api/auth/logout")
      .set("Cookie", "accessToken=signed-token");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      success: true,
      message: "Logout successful",
    });

    const cookie = response.headers["set-cookie"]?.[0];
    expect(cookie).toContain("accessToken=");
    expect(cookie).toContain("Expires=Thu, 01 Jan 1970 00:00:00 GMT");
    expect(cookie).toContain("Path=/");
    expect(cookie).toContain("HttpOnly");
    expect(cookie).toContain("SameSite=Lax");
  });

  it("returns success when the access token cookie is missing", async () => {
    const response = await request(app).post("/api/auth/logout");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      success: true,
      message: "Logout successful",
    });
  });

  it("prevents the logged-out client from accessing protected content", async () => {
    const client = request.agent(app);

    await client.post("/api/auth/login").send(validLogin).expect(200);

    const authenticatedResponse = await client.get("/api/auth/me");
    expect(authenticatedResponse.status).toBe(200);
    expect(authenticatedResponse.body).toMatchObject({
      user: authenticatedUser,
      workspaces: [{ id: 10, name: "Engineering" }],
    });
    expect(authenticatedResponse.body).not.toHaveProperty("workspaceIds");

    await client.post("/api/auth/logout").expect(200);

    const loggedOutResponse = await client.get("/api/auth/me");
    expect(loggedOutResponse.status).toBe(401);
    expect(loggedOutResponse.body).toEqual({
      success: false,
      error: "Missing bearer token",
    });
    expect(loggedOutResponse.body).not.toHaveProperty("user");
    expect(loggedOutResponse.body).not.toHaveProperty("workspaces");
    expect(getCurrentUser).toHaveBeenCalledTimes(1);
  });
});
