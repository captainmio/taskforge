ALTER TABLE "User"
    ADD COLUMN "email_verified_at" TIMESTAMP(3),
    ADD COLUMN "email_verification_token_hash" TEXT,
    ADD COLUMN "email_verification_expires_at" TIMESTAMP(3),
    ADD COLUMN "email_verification_sent_at" TIMESTAMP(3);

CREATE UNIQUE INDEX "User_email_verification_token_hash_key"
    ON "User"("email_verification_token_hash");
