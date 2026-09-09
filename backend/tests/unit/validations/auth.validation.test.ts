import { describe, expect, it } from "vitest";
import {
  registerSchema,
  resendEmailVerificationSchema,
  verifyEmailSchema,
} from "../../../src/validations/auth.validation.js";
import { validRegistration } from "../../helpers/registration.fixture.js";

describe("registerSchema", () => {
  it("accepts a valid registration", () => {
    const result = registerSchema.safeParse({ body: validRegistration });

    expect(result.success).toBe(true);
  });

  it("trims names and normalizes the email", () => {
    const result = registerSchema.parse({
      body: {
        ...validRegistration,
        firstname: "  Ada ",
        lastname: " Lovelace  ",
        email: " ADA@Example.COM ",
      },
    });

    expect(result.body).toEqual(validRegistration);
  });

  it.each([
    ["a blank first name", { firstname: " " }],
    ["a blank last name", { lastname: " " }],
    ["a name longer than 100 characters", { firstname: "a".repeat(101) }],
    ["an invalid email", { email: "not-an-email" }],
    ["a password shorter than eight characters", { password: "short" }],
  ])("rejects %s", (_description, change) => {
    const result = registerSchema.safeParse({
      body: { ...validRegistration, ...change },
    });

    expect(result.success).toBe(false);
  });
});

describe("email verification schemas", () => {
  it("normalizes a resend email address", () => {
    expect(
      resendEmailVerificationSchema.parse({
        body: { email: " ADA@Example.COM " },
      }).body,
    ).toEqual({ email: "ada@example.com" });
  });

  it("requires a valid resend email and a non-empty verification token", () => {
    expect(resendEmailVerificationSchema.safeParse({ body: { email: "invalid" } }).success).toBe(false);
    expect(verifyEmailSchema.safeParse({ query: { token: "" } }).success).toBe(false);
  });
});
