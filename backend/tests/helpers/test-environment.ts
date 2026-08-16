import dotenv from "dotenv";

const TEST_DATABASE_CONFIRMATION = "taskforge-tests";

export const loadTestEnvironment = () => {
  dotenv.config({ path: ".env", quiet: true });
  const developmentDatabaseUrl = process.env.DATABASE_URL;

  const result = dotenv.config({
    path: ".env.test",
    override: true,
    quiet: true,
  });

  if (result.error) {
    throw new Error(
      "Missing backend/.env.test. Copy .env.test.example and add the isolated test database URL.",
    );
  }

  const testDatabaseUrl = process.env.DATABASE_URL;

  if (!testDatabaseUrl) {
    throw new Error("DATABASE_URL is missing from backend/.env.test");
  }

  if (process.env.TEST_DATABASE_CONFIRM !== TEST_DATABASE_CONFIRMATION) {
    throw new Error(
      `TEST_DATABASE_CONFIRM must equal ${TEST_DATABASE_CONFIRMATION}`,
    );
  }

  if (testDatabaseUrl === developmentDatabaseUrl) {
    throw new Error(
      "The test database URL must not match the development database URL.",
    );
  }

  process.env.NODE_ENV = "test";
  process.env.JWT_SECRET ||= "test-only-jwt-secret";
  process.env.BCRYPT_SALT_ROUNDS ||= "4";
};
