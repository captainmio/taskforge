-- CreateTable
CREATE TABLE "WorkspaceInviteLink" (
    "id" SERIAL NOT NULL,
    "workspace_id" INTEGER NOT NULL,
    "created_by_id" INTEGER NOT NULL,
    "token_hash" VARCHAR(64) NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "revoked_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkspaceInviteLink_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WorkspaceInviteLink_workspace_id_key" ON "WorkspaceInviteLink"("workspace_id");

-- CreateIndex
CREATE UNIQUE INDEX "WorkspaceInviteLink_token_hash_key" ON "WorkspaceInviteLink"("token_hash");

-- CreateIndex
CREATE INDEX "WorkspaceInviteLink_created_by_id_idx" ON "WorkspaceInviteLink"("created_by_id");

-- AddForeignKey
ALTER TABLE "WorkspaceInviteLink" ADD CONSTRAINT "WorkspaceInviteLink_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkspaceInviteLink" ADD CONSTRAINT "WorkspaceInviteLink_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
