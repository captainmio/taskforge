export class EmailAlreadyRegisteredError extends Error {
  constructor() {
    super("Email already exists");
    this.name = "EmailAlreadyRegisteredError";
  }
}
