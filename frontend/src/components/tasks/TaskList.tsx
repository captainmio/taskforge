import { useState } from "react";
import { FaCalendarAlt, FaFlag } from "react-icons/fa";
import AvatarGroup from "../ui/AvatarGroup";
import DataTable, {
  type DataTableColumn,
  type DataTableSort,
} from "../ui/DataTable";
import PaginationControls from "../ui/PaginationControls";
import { formatTaskDueDate } from "../../utils/formatTaskDueDate";
import { priorityPresentation, taskColumns, type Task } from "./taskTypes";

const TASKS_PER_PAGE = 10;
const DESCRIPTION_PREVIEW_LENGTH = 50;

interface TaskListProps {
  tasks: Task[];
  onTaskClick: (task: Task) => void;
}

const getDescriptionPreview = (description: string) =>
  description.length > DESCRIPTION_PREVIEW_LENGTH
    ? `${description.slice(0, DESCRIPTION_PREVIEW_LENGTH).trimEnd()}…`
    : description;

const sortValue = (task: Task, columnId: string): number | string => {
  switch (columnId) {
    case "task":
      return task.title;
    case "assignee":
      return task.assignee;
    case "status":
      return taskColumns.findIndex((column) => column.status === task.status);
    case "priority":
      return ["low", "medium", "high"].indexOf(task.priority);
    case "due-date":
      return task.dueDate || "9999-12-31";
    default:
      return "";
  }
};

const TaskList = ({ tasks, onTaskClick }: TaskListProps) => {
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState<DataTableSort | null>(null);
  const totalPages = Math.ceil(tasks.length / TASKS_PER_PAGE);
  const currentPage = Math.min(page, Math.max(totalPages, 1));
  const sortedTasks = sort
    ? tasks.toSorted((first, second) => {
        const firstValue = sortValue(first, sort.columnId);
        const secondValue = sortValue(second, sort.columnId);
        const comparison =
          typeof firstValue === "number" && typeof secondValue === "number"
            ? firstValue - secondValue
            : String(firstValue).localeCompare(String(secondValue));

        return sort.direction === "ascending" ? comparison : -comparison;
      })
    : tasks;
  const pageTasks = sortedTasks.slice(
    (currentPage - 1) * TASKS_PER_PAGE,
    currentPage * TASKS_PER_PAGE,
  );
  const handleSortChange = (nextSort: DataTableSort) => {
    setSort(nextSort);
    setPage(1);
  };

  const columns: DataTableColumn<Task>[] = [
    {
      id: "task",
      header: "Task",
      sortable: true,
      className: "md:w-[30%]",
      cell: (task) => (
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-gray-950">
            {task.title}
          </p>
          {task.description?.trim() ? (
            <p className="mt-1 truncate text-xs text-gray-500">
              {getDescriptionPreview(task.description.trim())}
            </p>
          ) : null}
        </div>
      ),
    },
    {
      id: "assignee",
      header: "Assignee",
      sortable: true,
      className: "md:w-[10%]",
      cell: (task) =>
        task.assignees?.length ? (
          <div className="flex min-w-0 items-center gap-2">
            <AvatarGroup
              members={task.assignees}
              max={2}
              label={`Assignees: ${task.assignee}`}
            />
          </div>
        ) : (
          <span className="text-gray-400">Unassigned</span>
        ),
    },
    {
      id: "status",
      header: "Status",
      sortable: true,
      className: "md:w-[13%]",
      cell: (task) => {
        const status = taskColumns.find(
          (column) => column.status === task.status,
        );

        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-700">
            <span
              className={`size-1.5 rounded-full ${status?.dotClassName ?? "bg-gray-400"}`}
              aria-hidden="true"
            />
            {status?.label ?? task.status}
          </span>
        );
      },
    },
    {
      id: "priority",
      header: "Priority",
      sortable: true,
      className: "md:w-[11%]",
      cell: (task) => {
        const priority = priorityPresentation[task.priority];

        return (
          <span className="inline-flex items-center gap-1.5 text-gray-700">
            <FaFlag className={priority.iconClassName} aria-hidden="true" />
            {priority.label}
          </span>
        );
      },
    },
    {
      id: "due-date",
      header: "Due date",
      sortable: true,
      className: "md:w-[12%]",
      cell: (task) => (
        <span className="inline-flex whitespace-nowrap items-center gap-1.5 text-gray-600">
          <FaCalendarAlt className="text-gray-400" aria-hidden="true" />
          {formatTaskDueDate(task.dueDate)}
        </span>
      ),
    },
  ];

  return (
    <div>
      <DataTable
        ariaLabel="Project tasks"
        rows={pageTasks}
        columns={columns}
        getRowKey={(task) => task.id}
        emptyState={
          <p className="rounded-xl border border-gray-200 bg-white px-5 py-10 text-center text-sm text-gray-500">
            No tasks match the current filters.
          </p>
        }
        sort={sort}
        onSortChange={handleSortChange}
        onRowClick={onTaskClick}
      />
      <PaginationControls
        page={currentPage}
        pageSize={TASKS_PER_PAGE}
        totalItems={tasks.length}
        totalPages={totalPages}
        itemLabel="tasks"
        onPageChange={setPage}
      />
    </div>
  );
};

export default TaskList;
