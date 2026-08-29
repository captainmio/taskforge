import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactElement,
} from "react";
import type { DropResult } from "@hello-pangea/dnd";
import { FaFilter, FaPlus, FaSearch } from "react-icons/fa";
import { toast } from "react-toastify";
import { useNavigate, useParams } from "react-router";
import AccountMenu from "../../components/ui/AccountMenu";
import Button from "../../components/ui/Button";
import Skeleton from "../../components/ui/Skeleton";
import TaskBoard from "../../components/tasks/TaskBoard";
import TaskDialog from "../../components/tasks/TaskDialog";
import type {
  Task,
  TaskPriority,
  TaskStatus,
} from "../../components/tasks/taskTypes";
import { getProjectById } from "../../services/projects";
import {
  getProjectTasks,
  updateTask,
  type ProjectTask,
} from "../../services/tasks";
import { useAuthenticatedSession } from "../../hooks/useAuthenticatedSession";
import { logout } from "../../services/auth";
import { useProjectTaskRealtime } from "../../hooks/useProjectTaskRealtime";

const toBoardTask = (task: ProjectTask): Task => ({
  id: task.id,
  title: task.title,
  description: task.description,
  assignee:
    task.assignees
      .map((assignee) => `${assignee.firstname} ${assignee.lastname}`.trim())
      .join(", ") || "Unassigned",
  assignees: task.assignees.map((assignee) => ({
    id: assignee.id,
    name: `${assignee.firstname} ${assignee.lastname}`.trim(),
  })),
  dueDate: task.dueDate ?? "",
  timeEstimate: task.timeEstimate ?? "",
  priority: task.priority,
  status: task.status,
  position: task.position,
});

type DueDateFilter = "all" | "overdue" | "today" | "this_week" | "none";

const dueDateFilterLabels: Record<DueDateFilter, string> = {
  all: "Any due date",
  overdue: "Overdue",
  today: "Due today",
  this_week: "Due this week",
  none: "No due date",
};

const matchesDueDateFilter = (task: Task, filter: DueDateFilter): boolean => {
  if (filter === "all") return true;
  if (filter === "none") return !task.dueDate;
  if (!task.dueDate) return false;

  // Dates from the API can include a time; the board filters by their date part.
  const dueDate = new Date(`${task.dueDate.slice(0, 10)}T00:00:00`);
  if (Number.isNaN(dueDate.getTime())) return false;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (filter === "overdue") return dueDate < today;
  if (filter === "today") return dueDate.getTime() === today.getTime();

  const endOfWeek = new Date(today);
  endOfWeek.setDate(today.getDate() + (7 - (today.getDay() || 7)));
  return dueDate >= today && dueDate <= endOfWeek;
};

// This matches the board's overall shape while its first request is loading,
// so the page does not jump from a plain message into the finished layout.
const TaskPageSkeleton = (): ReactElement => (
  <div
    className="mx-auto max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8"
    role="status"
    aria-label="Loading task board"
  >
    <header className="flex flex-col gap-5 border-b border-gray-200 pb-5 xl:flex-row xl:items-end">
      <div className="order-2 space-y-2 xl:order-1">
        <Skeleton className="h-8 w-44" />
        <Skeleton className="h-4 w-72" />
      </div>
      <div className="order-3 flex gap-3 xl:order-2 xl:ml-auto">
        <Skeleton className="h-11 flex-1 xl:w-60 xl:flex-none" />
        <Skeleton className="h-11 w-20" />
      </div>
      <div className="order-1 flex justify-end gap-3 xl:order-3">
        <Skeleton className="h-11 w-28" />
        <Skeleton className="h-11 w-11 rounded-full" />
      </div>
    </header>
    <div className="mt-5 flex gap-6 border-b border-gray-200 pb-3">
      <Skeleton className="h-5 w-12" />
      <Skeleton className="h-5 w-9" />
      <Skeleton className="h-5 w-3" />
      <Skeleton className="h-5 w-20" />
    </div>
    <div className="mt-4 overflow-x-auto pb-2">
      <div className="grid min-w-[1024px] grid-cols-4 gap-4" aria-hidden="true">
        {[0, 1, 2, 3].map((column) => (
          <section
            key={column}
            className="rounded-xl border border-gray-200 bg-gray-50 p-3"
          >
            <Skeleton className="mb-3 h-5 w-24" />
            <div className="space-y-3">
              {[0, 1, 2].map((card) => (
                <div
                  key={card}
                  className="rounded-lg border border-gray-200 bg-white p-3"
                >
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="mt-3 h-3 w-full" />
                  <Skeleton className="mt-2 h-3 w-2/3" />
                  <Skeleton className="mt-4 h-6 w-20" />
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  </div>
);

const TaskPage = (): ReactElement => {
  const { id, projectId } = useParams();
  const navigate = useNavigate();
  const { user, workspaces } = useAuthenticatedSession();
  const [taskItems, setTaskItems] = useState<Task[]>([]);
  const [isLoadingTasks, setIsLoadingTasks] = useState<boolean>(true);
  const [taskLoadError, setTaskLoadError] = useState<boolean>(false);
  const [search, setSearch] = useState("");
  const [isFilterOpen, setIsFilterOpen] = useState<boolean>(false);
  const [selectedAssignees, setSelectedAssignees] = useState<string[]>([]);
  const [selectedPriorities, setSelectedPriorities] = useState<TaskPriority[]>(
    [],
  );
  const [dueDateFilter, setDueDateFilter] = useState<DueDateFilter>("all");
  const [selectedTask, setSelectedTask] = useState<Task | null | undefined>(
    undefined,
  );
  const [newTaskStatus, setNewTaskStatus] = useState<TaskStatus>("todo");
  const [isColumnStatusLocked, setIsColumnStatusLocked] = useState(false);
  const [projectName, setProjectName] = useState<string>("Tasks");
  const filterPanelRef = useRef<HTMLDivElement>(null);
  const currentWorkspace = workspaces?.find(
    (workspace) => String(workspace.id) === id,
  );
  const canCompleteInReview =
    currentWorkspace?.role === "OWNER" || currentWorkspace?.role === "ADMIN";
  const assigneeOptions = useMemo(
    () =>
      [
        ...new Set(
          taskItems.flatMap((task) =>
            (task.assignees ?? []).map((assignee) => assignee.name),
          ),
        ),
      ].toSorted((first, second) => first.localeCompare(second)),
    [taskItems],
  );
  const tasks = useMemo(() => {
    const searchTerm = search.trim().toLowerCase();

    return taskItems.filter((task) => {
      const matchesSearch =
        !searchTerm ||
        task.title.toLowerCase().includes(searchTerm) ||
        task.assignee.toLowerCase().includes(searchTerm);
      const taskAssignees =
        task.assignees?.map((assignee) => assignee.name) ?? [];
      const matchesAssignee =
        selectedAssignees.length === 0 ||
        (selectedAssignees.includes("Unassigned") &&
          taskAssignees.length === 0) ||
        taskAssignees.some((assignee) => selectedAssignees.includes(assignee));
      const matchesPriority =
        selectedPriorities.length === 0 ||
        selectedPriorities.includes(task.priority);
      // Completed tasks stay visible when filtering by date. A due date is
      // only useful for identifying work that still needs attention.
      const matchesDueDate =
        task.status === "done" || matchesDueDateFilter(task, dueDateFilter);

      return (
        matchesSearch && matchesAssignee && matchesPriority && matchesDueDate
      );
    });
  }, [dueDateFilter, search, selectedAssignees, selectedPriorities, taskItems]);
  const activeFilterCount =
    selectedAssignees.length +
    selectedPriorities.length +
    Number(dueDateFilter !== "all");
  const isDialogOpen = selectedTask !== undefined;

  useEffect(() => {
    if (!isFilterOpen) return;

    // Close the small menu when the user clicks elsewhere, like a native menu.
    const closeOnOutsideClick = (event: MouseEvent) => {
      if (!filterPanelRef.current?.contains(event.target as Node)) {
        setIsFilterOpen(false);
      }
    };

    document.addEventListener("mousedown", closeOnOutsideClick);
    return () => document.removeEventListener("mousedown", closeOnOutsideClick);
  }, [isFilterOpen]);

  const toggleSelection = <T,>(items: T[], item: T): T[] =>
    items.includes(item)
      ? items.filter((value) => value !== item)
      : [...items, item];

  const clearFilters = () => {
    setSelectedAssignees([]);
    setSelectedPriorities([]);
    setDueDateFilter("all");
  };

  const refreshTasks = useCallback(async () => {
    if (!id || !projectId || !/^\d+$/.test(projectId)) return;

    try {
      const response = await getProjectTasks(id, Number(projectId));
      if (response.success) {
        setTaskItems(response.data.tasks.map(toBoardTask));
      }
    } catch {
      // Keep the current board if a background real-time refresh fails.
    }
  }, [id, projectId]);

  useProjectTaskRealtime({
    workspaceId: id,
    projectId: Number(projectId),
    onTaskUpdated: () => {
      // A moved card also changes its neighbours' positions. Reloading the
      // normal list gives this board every changed position, not just the one
      // card included in the socket event.
      void refreshTasks();
    },
    onTaskCreated: refreshTasks,
  });

  useEffect(() => {
    let isActive = true;

    if (!id || !projectId || !/^\d+$/.test(projectId)) return;

    // Load the current project board once. The backend bounds this request to
    // 100 cards, preventing an unbounded board response for large projects.
    void Promise.all([
      getProjectById(id, Number(projectId)),
      getProjectTasks(id, Number(projectId)),
    ])
      .then(([projectResponse, taskResponse]) => {
        if (!isActive || !projectResponse.success || !taskResponse.success)
          return;

        const { project } = projectResponse.data;
        setProjectName(project.name);
        setTaskItems(taskResponse.data.tasks.map(toBoardTask));
      })
      .catch(() => {
        if (!isActive) return;
        setTaskItems([]);
        setTaskLoadError(true);
      })
      .finally(() => {
        if (isActive) setIsLoadingTasks(false);
      });

    return () => {
      isActive = false;
    };
  }, [id, projectId]);

  const openNewTask = (status: TaskStatus = "todo", locked = false) => {
    setNewTaskStatus(status);
    setIsColumnStatusLocked(locked);
    setSelectedTask(null);
  };
  const handleDragEnd = ({ source, destination, draggableId }: DropResult) => {
    // Dropping outside a column does not change the task's position or status.
    if (!destination) return;

    // Avoid a state update when the card was dropped back in the same place.
    if (
      source.droppableId === destination.droppableId &&
      source.index === destination.index
    ) {
      return;
    }

    const destinationStatus = destination.droppableId as TaskStatus;
    const taskId = Number(draggableId.replace("task-", ""));
    const draggedTask = taskItems.find((task) => task.id === taskId);
    if (!draggedTask) return;

    if (destinationStatus === "done" && !canCompleteInReview) {
      toast.error(
        "Only workspace owners and admins can move a task from In Review to Done.",
      );
      return;
    }

    const visibleDestinationTasks = tasks.filter(
      (task) => task.status === destinationStatus && task.id !== taskId,
    );
    const taskAtDestination = visibleDestinationTasks[destination.index];
    const destinationTasks = taskItems
      .filter((task) => task.status === destinationStatus && task.id !== taskId)
      .toSorted(
        (first, second) =>
          (first.position ?? Number.MAX_SAFE_INTEGER) -
            (second.position ?? Number.MAX_SAFE_INTEGER) ||
          first.id - second.id,
      );
    const destinationPosition = taskAtDestination
      ? destinationTasks.findIndex((task) => task.id === taskAtDestination.id)
      : destinationTasks.length;
    const previousTasks = taskItems;

    setTaskItems((currentTasks) => {
      const orderedColumn = (status: TaskStatus) =>
        currentTasks
          .filter((task) => task.status === status && task.id !== taskId)
          .toSorted(
            (first, second) =>
              (first.position ?? Number.MAX_SAFE_INTEGER) -
                (second.position ?? Number.MAX_SAFE_INTEGER) ||
              first.id - second.id,
          );
      const sourceTasks = orderedColumn(draggedTask.status);
      const nextDestinationTasks = orderedColumn(destinationStatus);
      nextDestinationTasks.splice(destinationPosition, 0, {
        ...draggedTask,
        status: destinationStatus,
      });
      const changedPositions = new Map<number, number>();

      if (draggedTask.status !== destinationStatus) {
        sourceTasks.forEach((task, position) => {
          changedPositions.set(task.id, position);
        });
      }
      nextDestinationTasks.forEach((task, position) => {
        changedPositions.set(task.id, position);
      });

      return currentTasks.map((task) => {
        const position = changedPositions.get(task.id);
        if (task.id === taskId) {
          return { ...task, status: destinationStatus, position };
        }
        return position === undefined ? task : { ...task, position };
      });
    });

    if (
      !id ||
      !Number.isSafeInteger(Number(projectId)) ||
      !Number.isSafeInteger(taskId)
    ) {
      return;
    }

    // Update the board immediately, then persist its status and exact place in
    // that column. If saving fails, restore the complete previous board order.
    void Promise.resolve(
      updateTask(id, Number(projectId), taskId, {
        status: destinationStatus,
        position: destinationPosition,
      }),
    ).catch(() => {
      setTaskItems(previousTasks);
    });
  };
  const handleLogout = () => {
    logout()
      .then(() => navigate("/", { replace: true }))
      .catch(() => undefined);
  };

  if (isLoadingTasks) return <TaskPageSkeleton />;

  return (
    <div className="mx-auto max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <header className="flex flex-col gap-5 border-b border-gray-200 pb-5 xl:flex-row xl:items-end">
        <div className="order-2 xl:order-1">
          <h1 className="text-2xl font-bold tracking-tight text-gray-950">
            {projectName}
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Track and manage tasks in this project.
          </p>
        </div>
        <div className="order-3 flex flex-col gap-3 sm:flex-row sm:items-center xl:order-2 xl:ml-auto">
          <label className="relative w-full sm:flex-1 xl:w-auto xl:flex-none">
            <span className="sr-only">Search tasks</span>
            <FaSearch className="pointer-events-none absolute left-3 top-3 text-gray-400" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search task title or assignees"
              className="h-11 w-full rounded-lg border border-gray-200 bg-white py-2 pl-10 pr-3 text-sm xl:w-60"
            />
          </label>
          <div
            ref={filterPanelRef}
            className="relative flex w-full gap-2 sm:w-auto sm:shrink-0"
          >
            <Button
              variant="outline"
              leadingIcon={<FaFilter />}
              className="flex-1 whitespace-nowrap sm:flex-none"
              aria-expanded={isFilterOpen}
              aria-controls="task-filter-menu"
              onClick={() => setIsFilterOpen((isOpen) => !isOpen)}
            >
              Filter{activeFilterCount ? ` (${activeFilterCount})` : ""}
            </Button>
            <Button
              leadingIcon={<FaPlus />}
              onClick={() => openNewTask()}
              className="flex-1 whitespace-nowrap sm:flex-none"
            >
              New Task
            </Button>
            {isFilterOpen ? (
              <div
                id="task-filter-menu"
                role="dialog"
                aria-label="Filter tasks"
                className="absolute right-0 z-10 mt-2 w-[min(22rem,calc(100vw-2rem))] rounded-xl border border-gray-200 bg-white p-4 shadow-lg"
              >
                <div className="flex items-center justify-between gap-3">
                  <h2 className="text-sm font-semibold text-gray-900">
                    Filter tasks
                  </h2>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={activeFilterCount === 0}
                    onClick={clearFilters}
                  >
                    Clear filters
                  </Button>
                </div>
                <fieldset className="mt-4">
                  <legend className="text-sm font-medium text-gray-800">
                    Assignee
                  </legend>
                  <div className="mt-2 max-h-32 space-y-2 overflow-y-auto pr-1">
                    {["Unassigned", ...assigneeOptions].map((assignee) => (
                      <label
                        key={assignee}
                        className="flex cursor-pointer items-center gap-2 text-sm text-gray-700"
                      >
                        <input
                          type="checkbox"
                          checked={selectedAssignees.includes(assignee)}
                          onChange={() =>
                            setSelectedAssignees((currentAssignees) =>
                              toggleSelection(currentAssignees, assignee),
                            )
                          }
                          className="h-4 w-4 rounded border-gray-300 text-site-green focus:ring-site-green"
                        />
                        {assignee}
                      </label>
                    ))}
                  </div>
                </fieldset>
                <fieldset className="mt-4 border-t border-gray-100 pt-4">
                  <legend className="text-sm font-medium text-gray-800">
                    Priority
                  </legend>
                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-2">
                    {(["low", "medium", "high"] as const).map((priority) => (
                      <label
                        key={priority}
                        className="flex cursor-pointer items-center gap-2 text-sm capitalize text-gray-700"
                      >
                        <input
                          type="checkbox"
                          checked={selectedPriorities.includes(priority)}
                          onChange={() =>
                            setSelectedPriorities((currentPriorities) =>
                              toggleSelection(currentPriorities, priority),
                            )
                          }
                          className="h-4 w-4 rounded border-gray-300 text-site-green focus:ring-site-green"
                        />
                        {priority}
                      </label>
                    ))}
                  </div>
                </fieldset>
                <fieldset className="mt-4 border-t border-gray-100 pt-4">
                  <legend className="text-sm font-medium text-gray-800">
                    Due date
                  </legend>
                  <div className="mt-2 space-y-2">
                    {(Object.keys(dueDateFilterLabels) as DueDateFilter[]).map(
                      (filter) => (
                        <label
                          key={filter}
                          className="flex cursor-pointer items-center gap-2 text-sm text-gray-700"
                        >
                          <input
                            type="radio"
                            name="task-due-date-filter"
                            checked={dueDateFilter === filter}
                            onChange={() => setDueDateFilter(filter)}
                            className="h-4 w-4 border-gray-300 text-site-green focus:ring-site-green"
                          />
                          {dueDateFilterLabels[filter]}
                        </label>
                      ),
                    )}
                  </div>
                </fieldset>
              </div>
            ) : null}
          </div>
        </div>
        <div className="order-1 flex items-center justify-end gap-3 xl:order-3">
          <AccountMenu
            name={`${user.firstname} ${user.lastname}`}
            email={user.email}
            onLogout={handleLogout}
          />
        </div>
      </header>
      <div className="mt-5 flex gap-6 border-b border-gray-200 text-sm font-medium">
        <button
          type="button"
          className="cursor-pointer border-b-2 border-emerald-500 px-3 pb-3 text-emerald-700"
        >
          Board
        </button>
        <button
          type="button"
          className="cursor-pointer px-3 pb-3 text-gray-500"
        >
          List
        </button>
        <span className="pb-3 text-gray-300">|</span>
        <button
          type="button"
          className="cursor-pointer px-3 pb-3 text-gray-700"
        >
          All Projects
        </button>
      </div>
      <div className="mt-4 overflow-x-auto pb-2">
        {taskLoadError ? (
          <p className="mb-3 text-sm text-red-600" role="alert">
            Unable to load tasks. Please try again.
          </p>
        ) : null}
        <TaskBoard
          tasks={tasks}
          onTaskClick={(task) => setSelectedTask(task)}
          onAddTask={(status) => openNewTask(status, true)}
          canAddTask={(status) => status !== "done" || canCompleteInReview}
          onDragEnd={handleDragEnd}
        />
      </div>
      {isDialogOpen ? (
        <TaskDialog
          task={selectedTask ?? null}
          initialStatus={newTaskStatus}
          isStatusLocked={isColumnStatusLocked}
          workspaceId={id ?? ""}
          projectId={Number(projectId)}
          canCompleteInReview={canCompleteInReview}
          onClose={() => setSelectedTask(undefined)}
          onTaskCreated={(task) =>
            setTaskItems((currentTasks) => [task, ...currentTasks])
          }
          onTaskUpdated={(taskId, updates) =>
            setTaskItems((currentTasks) =>
              currentTasks.map((task) =>
                task.id === taskId ? { ...task, ...updates } : task,
              ),
            )
          }
        />
      ) : null}
    </div>
  );
};

export default TaskPage;
