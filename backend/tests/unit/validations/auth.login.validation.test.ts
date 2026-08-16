import { describe, expect, it } from "vitest";
import { loginSchema } from "../../../src/validations/auth.validation.js";
import { validLogin } from "../../helpers/login.fixture.js";

describe("loginSchema", () => {
  it("accepts valid login credentials", () => {
    const result = loginSchema.safeParse({ body: validLogin });

    expect(result.success).toBe(true);
  });

  it("trims and normalizes the email", () => {
    const result = loginSchema.parse({
      body: {
        ...validLogin,
        email: " ADA@Example.COM ",
      },
    });

    expect(result.body).toEqual(validLogin);
  });

  it.each([
    ["an invalid email", { email: "not-an-email" }],
    ["an empty password", { password: "" }],
  ])("rejects %s", (_description, change) => {
    const result = loginSchema.safeParse({
      body: { ...validLogin, ...change },
    });

    expect(result.success).toBe(false);
  });
});
