export const ProjectListTab = {
  ALL: "ALL",
  PLANNING: "PLANNING",
  ACTIVE: "ACTIVE",
  ON_HOLD: "ON_HOLD",
  COMPLETED: "COMPLETED",
} as const;

export type ProjectListTab =
  (typeof ProjectListTab)[keyof typeof ProjectListTab];
