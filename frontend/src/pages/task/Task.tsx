import { useEffect, useMemo, useState, type ReactElement } from "react";
import type { DropResult } from "@hello-pangea/dnd";
import { FaFilter, FaPlus, FaSearch } from "react-icons/fa";
import { useNavigate, useParams } from "react-router";
import AccountMenu from "../../components/ui/AccountMenu";
import Button from "../../components/ui/Button";
import TaskBoard from "../../components/tasks/TaskBoard";
import TaskDialog from "../../components/tasks/TaskDialog";
import type { Task, TaskStatus } from "../../components/tasks/taskTypes";
import { getProjectById } from "../../services/projects";
import { getProjectTasks, type ProjectTask } from "../../services/tasks";
import { useAuthenticatedSession } from "../../hooks/useAuthenticatedSession";
import { logout } from "../../services/auth";

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
});

const TaskPage = (): ReactElement => {
  const { id, projectId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthenticatedSession();
  const [taskItems, setTaskItems] = useState<Task[]>([]);
  const [isLoadingTasks, setIsLoadingTasks] = useState<boolean>(true);
  const [taskLoadError, setTaskLoadError] = useState<boolean>(false);
  const [search, setSearch] = useState("");
  const [selectedTask, setSelectedTask] = useState<Task | null | undefined>(
    undefined,
  );
  const [newTaskStatus, setNewTaskStatus] = useState<TaskStatus>("todo");
  const [projectName, setProjectName] = useState<string>("Tasks");
  const tasks = useMemo(
    () =>
      taskItems.filter(
        (task) =>
          task.title.toLowerCase().includes(search.toLowerCase()) ||
          task.description?.toLowerCase().includes(search.toLowerCase()),
      ),
    [search, taskItems],
  );
  const isDialogOpen = selectedTask !== undefined;

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

  const openNewTask = (status: TaskStatus = "todo") => {
    setNewTaskStatus(status);
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
    const visibleDestinationTasks = tasks.filter(
      (task) => task.status === destinationStatus && task.id !== taskId,
    );
    const taskAtDestination = visibleDestinationTasks[destination.index];

    setTaskItems((currentTasks) => {
      // The draggable ID tells us exactly which task moved, even when search is active.
      const draggedTask = currentTasks.find((task) => task.id === taskId);
      if (!draggedTask) return currentTasks;

      // Work from a list without the dragged task so it cannot appear twice.
      const reorderedTasks = currentTasks.filter((task) => task.id !== taskId);
      const movedTask = { ...draggedTask, status: destinationStatus };

      // Insert before the card currently at the drop position. If there is no card
      // there, the user dropped at the end of the destination column.
      let insertAt = taskAtDestination
        ? reorderedTasks.findIndex((task) => task.id === taskAtDestination.id)
        : reorderedTasks.length;

      if (!taskAtDestination) {
        for (let index = reorderedTasks.length - 1; index >= 0; index -= 1) {
          if (reorderedTasks[index].status === destinationStatus) {
            insertAt = index + 1;
            break;
          }
        }
      }

      reorderedTasks.splice(insertAt, 0, movedTask);
      return reorderedTasks;
    });
  };
  const handleLogout = () => {
    logout()
      .then(() => navigate("/", { replace: true }))
      .catch(() => undefined);
  };

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
              placeholder="Search tasks..."
              className="h-11 w-full rounded-lg border border-gray-200 bg-white py-2 pl-10 pr-3 text-sm xl:w-60"
            />
          </label>
          <Button
            variant="outline"
            leadingIcon={<FaFilter />}
            className="w-full sm:w-auto sm:shrink-0"
          >
            Filter
          </Button>
        </div>
        <div className="order-1 flex items-center justify-end gap-3 xl:order-3">
          <Button leadingIcon={<FaPlus />} onClick={() => openNewTask()}>
            New Task
          </Button>
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
        {isLoadingTasks ? (
          <p className="mb-3 text-sm text-gray-500" role="status">
            Loading tasks...
          </p>
        ) : null}
        {taskLoadError ? (
          <p className="mb-3 text-sm text-red-600" role="alert">
            Unable to load tasks. Please try again.
          </p>
        ) : null}
        <TaskBoard
          tasks={tasks}
          onTaskClick={(task) => setSelectedTask(task)}
          onAddTask={openNewTask}
          onDragEnd={handleDragEnd}
        />
      </div>
      {isDialogOpen ? (
        <TaskDialog
          task={selectedTask ?? null}
          initialStatus={newTaskStatus}
          workspaceId={id ?? ""}
          projectId={Number(projectId)}
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
