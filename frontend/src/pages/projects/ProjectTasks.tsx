import { useEffect, useMemo, useState } from "react";
import { FaFilter, FaPlus, FaSearch } from "react-icons/fa";
import { useNavigate, useParams } from "react-router";
import AccountMenu from "../../components/ui/AccountMenu";
import Button from "../../components/ui/Button";
import TaskBoard from "../../components/tasks/TaskBoard";
import TaskDialog from "../../components/tasks/TaskDialog";
import type { Task, TaskStatus } from "../../components/tasks/taskTypes";
import { getProjectById } from "../../services/projects";
import { useAuthenticatedSession } from "../../hooks/useAuthenticatedSession";
import { logout } from "../../services/auth";

const demoTasks: Task[] = [
  {
    id: 1,
    title: "Implement login flow",
    project: "Mobile App",
    projectIcon: "mobile",
    assignee: "Rustam Jordan",
    dueDate: "Jun 15, 2024",
    priority: "medium",
    status: "todo",
  },
  {
    id: 2,
    title: "Create user registration",
    project: "Mobile App",
    projectIcon: "mobile",
    assignee: "Rustam Jordan",
    dueDate: "Jun 18, 2024",
    priority: "low",
    status: "todo",
  },
  {
    id: 3,
    title: "Set up analytics tracking",
    project: "Marketing Campaign",
    projectIcon: "marketing",
    assignee: "Rustam Jordan",
    dueDate: "May 20, 2024",
    priority: "low",
    status: "todo",
  },
  {
    id: 4,
    title: "Design new homepage",
    project: "Website Redesign",
    projectIcon: "desktop",
    assignee: "Rustam Jordan",
    dueDate: "Jun 30, 2024",
    priority: "high",
    status: "in_progress",
  },
  {
    id: 5,
    title: "Build dashboard UI",
    project: "Website Redesign",
    projectIcon: "desktop",
    assignee: "Rustam Jordan",
    dueDate: "Jun 28, 2024",
    priority: "medium",
    status: "in_progress",
  },
  {
    id: 6,
    title: "Fix responsive issues",
    project: "Website Redesign",
    projectIcon: "desktop",
    assignee: "Rustam Jordan",
    dueDate: "Jun 25, 2024",
    priority: "low",
    status: "in_progress",
  },
  {
    id: 7,
    title: "Create API documentation",
    project: "Backend API",
    projectIcon: "code",
    assignee: "Rustam Jordan",
    dueDate: "May 28, 2024",
    priority: "medium",
    status: "in_review",
  },
  {
    id: 8,
    title: "Review database schema",
    project: "Backend API",
    projectIcon: "code",
    assignee: "Rustam Jordan",
    dueDate: "May 27, 2024",
    priority: "high",
    status: "in_review",
  },
  {
    id: 9,
    title: "Project setup",
    project: "Website Redesign",
    projectIcon: "desktop",
    assignee: "Rustam Jordan",
    dueDate: "May 16, 2024",
    priority: "low",
    status: "done",
  },
  {
    id: 10,
    title: "Create wireframes",
    project: "Website Redesign",
    projectIcon: "desktop",
    assignee: "Rustam Jordan",
    dueDate: "May 18, 2024",
    priority: "low",
    status: "done",
  },
];

const ProjectTasks = () => {
  const { id, projectId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthenticatedSession();
  const [search, setSearch] = useState("");
  const [selectedTask, setSelectedTask] = useState<Task | null | undefined>(
    undefined,
  );
  const [newTaskStatus, setNewTaskStatus] = useState<TaskStatus>("todo");
  const [projectName, setProjectName] = useState("Tasks");
  const tasks = useMemo(
    () =>
      demoTasks.filter(
        (task) =>
          task.title.toLowerCase().includes(search.toLowerCase()) ||
          task.project.toLowerCase().includes(search.toLowerCase()),
      ),
    [search],
  );
  const isDialogOpen = selectedTask !== undefined;

  useEffect(() => {
    let isActive = true;

    if (!id || !projectId || !/^\d+$/.test(projectId)) return;

    void getProjectById(id, Number(projectId))
      .then((response) => {
        if (isActive && response.success)
          setProjectName(response.data.project.name);
      })
      .catch(() => undefined);

    return () => {
      isActive = false;
    };
  }, [id, projectId]);

  const openNewTask = (status: TaskStatus = "todo") => {
    setNewTaskStatus(status);
    setSelectedTask(null);
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
        <TaskBoard
          tasks={tasks}
          onTaskClick={(task) => setSelectedTask(task)}
          onAddTask={openNewTask}
        />
      </div>
      {isDialogOpen ? (
        <TaskDialog
          task={selectedTask ?? null}
          initialStatus={newTaskStatus}
          onClose={() => setSelectedTask(undefined)}
        />
      ) : null}
    </div>
  );
};

export default ProjectTasks;
