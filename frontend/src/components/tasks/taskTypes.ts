export type TaskStatus = "todo" | "in_progress" | "in_review" | "done";
export type TaskPriority = "low" | "medium" | "high";

export const priorityPresentation: Record<
  TaskPriority,
  { label: string; dotClassName: string; iconClassName: string }
> = {
  low: {
    label: "Low",
    dotClassName: "bg-blue-500",
    iconClassName: "text-blue-500",
  },
  medium: {
    label: "Medium",
    dotClassName: "bg-amber-500",
    iconClassName: "text-amber-500",
  },
  high: {
    label: "High",
    dotClassName: "bg-red-500",
    iconClassName: "text-red-500",
  },
};

export interface Task {
  id: number;
  title: string;
  description?: string;
  assignee: string;
  assignees?: Array<{ id: number | string; name: string }>;
  dueDate: string;
  timeEstimate?: string;
  priority: TaskPriority;
  status: TaskStatus;
}

export const taskColumns: ReadonlyArray<{
  status: TaskStatus;
  label: string;
  dotClassName: string;
  surfaceClassName: string;
}> = [
  {
    status: "todo",
    label: "To Do",
    dotClassName: "bg-slate-500",
    surfaceClassName: "border-slate-300 bg-slate-200/80",
  },
  {
    status: "in_progress",
    label: "In Progress",
    dotClassName: "bg-blue-500",
    surfaceClassName: "border-blue-200 bg-blue-100/80",
  },
  {
    status: "in_review",
    label: "In Review",
    dotClassName: "bg-violet-500",
    surfaceClassName: "border-violet-200 bg-violet-100/80",
  },
  {
    status: "done",
    label: "Done",
    dotClassName: "bg-emerald-500",
    surfaceClassName: "border-emerald-200 bg-emerald-100/80",
  },
];
