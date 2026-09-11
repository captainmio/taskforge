CREATE TABLE "workspace_activities" (
  "id" SERIAL NOT NULL,
  "workspace_id" INTEGER NOT NULL,
  "actor_user_id" INTEGER NOT NULL,
  "action" VARCHAR(50) NOT NULL,
  "details" JSONB NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "workspace_activities_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "workspace_activities_workspace_id_created_at_id_idx"
  ON "workspace_activities"("workspace_id", "created_at" DESC, "id" DESC);
CREATE INDEX "workspace_activities_actor_user_id_idx"
  ON "workspace_activities"("actor_user_id");

ALTER TABLE "workspace_activities"
  ADD CONSTRAINT "workspace_activities_workspace_id_fkey"
  FOREIGN KEY ("workspace_id") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "workspace_activities"
  ADD CONSTRAINT "workspace_activities_actor_user_id_fkey"
  FOREIGN KEY ("actor_user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
