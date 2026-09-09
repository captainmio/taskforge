import request from "supertest";
import {
  PasswordResetError,
  PasswordResetRequestError,
} from "../../../src/errors/auth.errors.js";
import {
  requestPasswordReset,
  resetPassword,
} from "../../../src/services/auth.service.js";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../../src/services/auth.service.js", () => ({
  getCurrentUser: vi.fn(),
  registerUser: vi.fn(),
  loginUser: vi.fn(),
  resendEmailVerification: vi.fn(),
  verifyUserEmail: vi.fn(),
  requestPasswordReset: vi.fn(),
  resetPassword: vi.fn(),
}));

const { default: app } = await import("../../../src/app.js");

describe("password reset routes", () => {
  beforeEach(() => {
    vi.mocked(requestPasswordReset).mockResolvedValue();
    vi.mocked(resetPassword).mockResolvedValue([
      {
        id: 1,
        email: "ada@example.com",
        firstname: "Ada",
        lastname: "Lovelace",
        password: "hashed-password",
        emailVerifiedAt: new Date(),
        emailVerificationTokenHash: null,
        emailVerificationExpiresAt: null,
        emailVerificationSentAt: null,
      },
      {
        userId: 1,
        tokenHash: "reset-token-hash",
        expiresAt: new Date(),
        sentAt: new Date(),
      },
    ]);
  });

  it("normalizes a request email and rejects invalid request input", async () => {
    const response = await request(app)
      .post("/api/auth/password-reset/request")
      .send({ email: " ADA@Example.COM " });

    expect(response.status).toBe(202);
    expect(requestPasswordReset).toHaveBeenCalledWith("ada@example.com");

    const invalidResponse = await request(app)
      .post("/api/auth/password-reset/request")
      .send({ email: "invalid" });
    expect(invalidResponse.status).toBe(400);
  });

  it("maps reset request failures to their documented statuses", async () => {
    vi.mocked(requestPasswordReset).mockRejectedValueOnce(
      new PasswordResetRequestError("EMAIL_NOT_FOUND"),
    );
    expect((await request(app).post("/api/auth/password-reset/request").send({ email: "missing@example.com" })).status).toBe(404);

    vi.mocked(requestPasswordReset).mockRejectedValueOnce(
      new PasswordResetRequestError("EMAIL_UNVERIFIED"),
    );
    expect((await request(app).post("/api/auth/password-reset/request").send({ email: "unverified@example.com" })).status).toBe(403);

    vi.mocked(requestPasswordReset).mockRejectedValueOnce(
      new PasswordResetRequestError("COOLDOWN", 30),
    );
    const cooldownResponse = await request(app)
      .post("/api/auth/password-reset/request")
      .send({ email: "ada@example.com" });
    expect(cooldownResponse.status).toBe(429);
    expect(cooldownResponse.body.retryAfterSeconds).toBe(30);
  });

  it("resets a password and distinguishes invalid from expired links", async () => {
    const response = await request(app)
      .post("/api/auth/password-reset")
      .send({ token: "reset-token", password: "new-password" });
    expect(response.status).toBe(200);
    expect(resetPassword).toHaveBeenCalledWith({ token: "reset-token", password: "new-password" });

    vi.mocked(resetPassword).mockRejectedValueOnce(new PasswordResetError("INVALID"));
    expect((await request(app).post("/api/auth/password-reset").send({ token: "invalid", password: "new-password" })).status).toBe(400);

    vi.mocked(resetPassword).mockRejectedValueOnce(new PasswordResetError("EXPIRED"));
    expect((await request(app).post("/api/auth/password-reset").send({ token: "expired", password: "new-password" })).status).toBe(410);
  });
});
