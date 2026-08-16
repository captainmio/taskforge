-- CreateEnum
CREATE TYPE "WorkspaceIcon" AS ENUM ('code', 'business', 'team', 'launch', 'goals');

-- CreateEnum
CREATE TYPE "WorkspaceRole" AS ENUM ('OWNER', 'ADMIN', 'MEMBER');

-- CreateEnum
CREATE TYPE "InvitationStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REVOKED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "InvitationDeliveryStatus" AS ENUM ('PENDING', 'QUEUED', 'COMPLETED', 'FAILED');

-- CreateTable
CREATE TABLE "Workspace" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "display_name" VARCHAR(100) NOT NULL,
    "description" VARCHAR(500) NOT NULL,
    "icon" "WorkspaceIcon" NOT NULL,
    "owner_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Workspace_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkspaceMember" (
    "workspace_id" INTEGER NOT NULL,
    "user_id" INTEGER NOT NULL,
    "role" "WorkspaceRole" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WorkspaceMember_pkey" PRIMARY KEY ("workspace_id","user_id")
);

-- CreateTable
CREATE TABLE "WorkspaceInvitation" (
    "id" SERIAL NOT NULL,
    "workspace_id" INTEGER NOT NULL,
    "invited_by_id" INTEGER NOT NULL,
    "email" VARCHAR(320) NOT NULL,
    "normalized_email" VARCHAR(320) NOT NULL,
    "role" "WorkspaceRole" NOT NULL,
    "token_hash" VARCHAR(64) NOT NULL,
    "status" "InvitationStatus" NOT NULL DEFAULT 'PENDING',
    "delivery_status" "InvitationDeliveryStatus" NOT NULL DEFAULT 'PENDING',
    "delivery_attempts" INTEGER NOT NULL DEFAULT 0,
    "last_delivery_error" VARCHAR(500),
    "queued_at" TIMESTAMP(3),
    "delivered_at" TIMESTAMP(3),
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkspaceInvitation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Workspace_name_key" ON "Workspace"("name");

-- CreateIndex
CREATE INDEX "Workspace_owner_id_idx" ON "Workspace"("owner_id");

-- CreateIndex
CREATE INDEX "WorkspaceMember_user_id_idx" ON "WorkspaceMember"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "WorkspaceInvitation_token_hash_key" ON "WorkspaceInvitation"("token_hash");

-- CreateIndex
CREATE INDEX "WorkspaceInvitation_invited_by_id_idx" ON "WorkspaceInvitation"("invited_by_id");

-- CreateIndex
CREATE INDEX "WorkspaceInvitation_delivery_status_created_at_idx" ON "WorkspaceInvitation"("delivery_status", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "WorkspaceInvitation_workspace_id_normalized_email_key" ON "WorkspaceInvitation"("workspace_id", "normalized_email");

-- AddForeignKey
ALTER TABLE "Workspace" ADD CONSTRAINT "Workspace_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkspaceMember" ADD CONSTRAINT "WorkspaceMember_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkspaceMember" ADD CONSTRAINT "WorkspaceMember_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkspaceInvitation" ADD CONSTRAINT "WorkspaceInvitation_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkspaceInvitation" ADD CONSTRAINT "WorkspaceInvitation_invited_by_id_fkey" FOREIGN KEY ("invited_by_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
