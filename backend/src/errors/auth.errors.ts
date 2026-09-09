export class EmailAlreadyRegisteredError extends Error {
  constructor() {
    super("Email already exists");
    this.name = "EmailAlreadyRegisteredError";
  }
}

export class InvalidCredentialsError extends Error {
  constructor() {
    super("Invalid email or password");
    this.name = "InvalidCredentialsError";
  }
}

export class EmailVerificationRequiredError extends Error {
  constructor() {
    super("Email verification is required");
    this.name = "EmailVerificationRequiredError";
  }
}

export type EmailVerificationResendFailure = "ALREADY_VERIFIED" | "COOLDOWN";

export class EmailVerificationResendError extends Error {
  constructor(
    public readonly reason: EmailVerificationResendFailure,
    public readonly retryAfterSeconds?: number,
  ) {
    super(`Email verification resend failed: ${reason}`);
    this.name = "EmailVerificationResendError";
  }
}

export type EmailVerificationFailure = "INVALID" | "EXPIRED";

export class EmailVerificationError extends Error {
  constructor(public readonly reason: EmailVerificationFailure) {
    super(`Email verification failed: ${reason}`);
    this.name = "EmailVerificationError";
  }
}
