import type { RegisterBody } from "../../src/validations/auth.validation.js";

export const validRegistration: RegisterBody = {
  firstname: "Ada",
  lastname: "Lovelace",
  email: "ada@example.com",
  password: "secure-password",
};
