process.env.NODE_ENV = "test";
process.env.JWT_SECRET = "test-only-jwt-secret";
process.env.BCRYPT_SALT_ROUNDS = "4";
process.env.DATABASE_URL =
  "postgresql://test:test@127.0.0.1:5433/taskforge_test";
