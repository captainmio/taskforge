-- Store one reset token per user. Raw tokens are sent by email; only hashes persist.
CREATE TABLE "password_reset_tokens" (
  "user_id" INTEGER NOT NULL,
  "token_hash" TEXT NOT NULL,
  "expires_at" TIMESTAMP(3) NOT NULL,
  "sent_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "password_reset_tokens_pkey" PRIMARY KEY ("user_id")
);

CREATE UNIQUE INDEX "password_reset_tokens_token_hash_key"
  ON "password_reset_tokens"("token_hash");

ALTER TABLE "password_reset_tokens"
  ADD CONSTRAINT "password_reset_tokens_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
