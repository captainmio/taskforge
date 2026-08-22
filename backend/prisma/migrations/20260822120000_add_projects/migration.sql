-- CreateEnum
CREATE TYPE "ProjectIcon" AS ENUM ('desktop', 'mobile', 'code', 'launch', 'flag', 'database', 'server', 'design', 'analytics', 'marketing', 'commerce', 'quality');

-- CreateEnum
CREATE TYPE "ProjectStatus" AS ENUM ('planning', 'active', 'on_hold', 'completed');

-- CreateEnum
CREATE TYPE "ProjectDefaultView" AS ENUM ('list', 'board', 'calendar');

-- CreateTable
CREATE TABLE "Project" (
    "id" SERIAL NOT NULL,
    "workspace_id" INTEGER NOT NULL,
    "created_by_id" INTEGER NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "description" VARCHAR(500) NOT NULL,
    "icon" "ProjectIcon" NOT NULL,
    "status" "ProjectStatus" NOT NULL DEFAULT 'planning',
    "start_date" DATE,
    "due_date" DATE,
    "default_view" "ProjectDefaultView" NOT NULL DEFAULT 'list',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Project_workspace_id_idx" ON "Project"("workspace_id");

-- CreateIndex
CREATE INDEX "Project_created_by_id_idx" ON "Project"("created_by_id");

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
