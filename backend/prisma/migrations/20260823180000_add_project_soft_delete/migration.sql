-- Preserve deleted projects for audit and recovery while excluding them from
-- normal workspace project queries.
ALTER TABLE "Project" ADD COLUMN "deleted_at" TIMESTAMP(3);

CREATE INDEX "Project_workspace_id_deleted_at_idx"
ON "Project"("workspace_id", "deleted_at");
