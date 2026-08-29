-- Give each task an order within its project status column. Existing cards
-- retain their current newest-first list order during this one-time backfill.
ALTER TABLE "Task" ADD COLUMN "position" INTEGER NOT NULL DEFAULT 0;

WITH ordered_tasks AS (
  SELECT
    "id",
    ROW_NUMBER() OVER (
      PARTITION BY "project_id", "status"
      ORDER BY "created_at" DESC, "id" DESC
    ) - 1 AS "position"
  FROM "Task"
)
UPDATE "Task"
SET "position" = ordered_tasks."position"
FROM ordered_tasks
WHERE "Task"."id" = ordered_tasks."id";

CREATE INDEX "Task_project_id_status_position_idx"
ON "Task"("project_id", "status", "position");
