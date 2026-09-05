import { useEffect, useState } from "react";
import { FaCalendarAlt, FaCircle } from "react-icons/fa";
import { useParams } from "react-router";
import AppHeader from "../../components/layout/AppHeader";
import TaskDialog from "../../components/tasks/TaskDialog";
import {
  priorityPresentation,
  taskColumns,
  type Task,
  type TaskStatus,
} from "../../components/tasks/taskTypes";
import Button from "../../components/ui/Button";
import SectionCard from "../../components/ui/SectionCard";
import Skeleton from "../../components/ui/Skeleton";
import { getWorkspaceMyTasks } from "../../services/workspaces";
import type { WorkspaceUpcomingTask } from "../../types/workspace";
import { formatTaskDueDate } from "../../utils/formatTaskDueDate";

const toTask = (task: WorkspaceUpcomingTask): Task => ({
  id: task.id,
  title: task.title,
  description: task.description,
  status: task.status,
  priority: task.priority,
  dueDate: task.dueDate,
  timeEstimate: task.timeEstimate ?? "",
  assignee:
    task.assignees
      .map(({ firstname, lastname }) => `${firstname} ${lastname}`)
      .join(", ") || "Unassigned",
  assignees: task.assignees.map(({ id, firstname, lastname }) => ({
    id,
    name: `${firstname} ${lastname}`,
  })),
});

const MyTasksSkeleton = () => (
  <div
    className="mt-6 grid gap-5 xl:grid-cols-[minmax(18rem,0.8fr)_minmax(0,1.2fr)]"
    role="status"
    aria-label="Loading my tasks"
  >
    <SectionCard title="Assigned tasks">
      <Skeleton className="h-4 w-24" />
      <Skeleton className="mt-2 h-10 w-full" />
      <div className="mt-4 space-y-4">
        {[1, 2, 3, 4, 5].map((item) => (
          <div key={item} className="space-y-2 border-b border-gray-100 pb-4">
            <Skeleton className="h-4 w-3/5" />
            <Skeleton className="h-3 w-2/5" />
            <Skeleton className="h-3 w-1/3" />
          </div>
        ))}
      </div>
    </SectionCard>
    <SectionCard title="Task details">
      <Skeleton className="h-6 w-2/5" />
      <Skeleton className="mt-2 h-4 w-1/4" />
      <div className="mt-7 grid gap-5 sm:grid-cols-2">
        {[1, 2, 3, 4, 5, 6].map((item) => (
          <div key={item}>
            <Skeleton className="h-3 w-20" />
            <Skeleton className="mt-2 h-4 w-3/5" />
          </div>
        ))}
      </div>
      <Skeleton className="mt-7 h-3 w-24" />
      <Skeleton className="mt-2 h-20 w-full" />
    </SectionCard>
  </div>
);

const MyTask = () => {
  const { id = "" } = useParams();
  const [tasks, setTasks] = useState<WorkspaceUpcomingTask[]>([]);
  const [cursor, setCursor] = useState<number | null>(null);
  const [sort, setSort] = useState<string>("due_asc");
  const [selectedTask, setSelectedTask] =
    useState<WorkspaceUpcomingTask | null>(null);
  const [isEditOpen, setIsEditOpen] = useState<boolean>(false);
  const [hasLoaded, setHasLoaded] = useState<boolean>(false);

  const loadTasks = async () => {
    const response = await getWorkspaceMyTasks(id, undefined, sort);
    setTasks(response.data.tasks);
    setCursor(response.data.nextCursor);
    setSelectedTask(
      (current) =>
        response.data.tasks.find((task) => task.id === current?.id) ??
        response.data.tasks[0] ??
        null,
    );
  };

  useEffect(() => {
    void getWorkspaceMyTasks(id, undefined, sort).then((response) => {
      setTasks(response.data.tasks);
      setCursor(response.data.nextCursor);
      setSelectedTask(
        (current) =>
          response.data.tasks.find((task) => task.id === current?.id) ??
          response.data.tasks[0] ??
          null,
      );
      setHasLoaded(true);
    });
  }, [id, sort]);

  const loadMore = async () => {
    if (!cursor) return;
    const response = await getWorkspaceMyTasks(id, cursor, sort);
    setTasks((current) => [...current, ...response.data.tasks]);
    setCursor(response.data.nextCursor);
  };

  const selectedStatus = selectedTask
    ? taskColumns.find((column) => column.status === selectedTask.status)
    : undefined;

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <AppHeader title="My Tasks" description="All tasks assigned to you." />
      {!hasLoaded ? (
        <MyTasksSkeleton />
      ) : (
        <div className="mt-6 grid gap-5 xl:grid-cols-[minmax(18rem,0.8fr)_minmax(0,1.2fr)]">
          <SectionCard title="Assigned tasks">
            <label className="mb-4 block text-sm font-medium text-gray-700">
              Sort tasks by
              <select
                value={sort}
                onChange={(event) => setSort(event.target.value)}
                className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"
              >
                <option value="due_asc">Due date: earliest first</option>
                <option value="due_desc">Due date: latest first</option>
                <option value="priority">Priority</option>
                <option value="status">Status</option>
                <option value="project">Project</option>
              </select>
            </label>
            <ul className="-mx-2 divide-y divide-gray-100">
              {tasks.map((task) => (
                <li key={task.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedTask(task)}
                    className={`w-full cursor-pointer rounded-lg px-2 py-3 text-left transition-colors hover:bg-slate-50 ${selectedTask?.id === task.id ? "bg-slate-50 ring-1 ring-inset ring-site-green" : ""}`}
                  >
                    <p className="font-semibold text-gray-950">{task.title}</p>
                    <p className="mt-1 text-xs text-gray-500">
                      {task.project.name}
                    </p>
                    <p className="mt-1 flex items-center gap-1 text-xs text-gray-600">
                      <FaCalendarAlt />
                      {formatTaskDueDate(task.dueDate)}
                    </p>
                  </button>
                </li>
              ))}
            </ul>
            {cursor ? (
              <Button
                variant="ghost"
                className="mt-3"
                onClick={() => void loadMore()}
              >
                Load more
              </Button>
            ) : null}
          </SectionCard>
          <SectionCard title="Task details">
            <div className="xl:max-h-[calc(100dvh-14rem)] xl:overflow-y-auto xl:pr-2">
              {selectedTask ? (
                <div className="divide-y divide-gray-100">
                  <div className="flex flex-wrap items-start justify-between gap-4 pb-5">
                    <div>
                      <h2 className="text-xl font-bold text-gray-950">
                        {selectedTask.title}
                      </h2>
                      <p className="mt-1 text-sm text-gray-500">
                        {selectedTask.project.name}
                      </p>
                    </div>
                    <Button size="sm" onClick={() => setIsEditOpen(true)}>
                      Edit task
                    </Button>
                  </div>
                  <dl className="grid gap-4 py-5 sm:grid-cols-2">
                    <div>
                      <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                        Due date
                      </dt>
                      <dd className="mt-1 flex items-center gap-2 text-sm text-gray-800">
                        <FaCalendarAlt className="text-site-green" />
                        {formatTaskDueDate(selectedTask.dueDate)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                        Project
                      </dt>
                      <dd className="mt-1 text-sm text-gray-800">
                        {selectedTask.project.name}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                        Status
                      </dt>
                      <dd className="mt-1 flex items-center gap-2 text-sm text-gray-800">
                        <span
                          className={`size-2 rounded-full ${selectedStatus?.dotClassName ?? "bg-slate-400"}`}
                        />
                        {selectedStatus?.label ?? selectedTask.status}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                        Priority
                      </dt>
                      <dd className="mt-1 flex items-center gap-2 text-sm text-gray-800">
                        <FaCircle
                          className={
                            priorityPresentation[selectedTask.priority]
                              .iconClassName
                          }
                        />
                        {priorityPresentation[selectedTask.priority].label}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                        Assignees
                      </dt>
                      <dd className="mt-1 text-sm text-gray-800">
                        {selectedTask.assignees
                          .map(
                            ({ firstname, lastname }) =>
                              `${firstname} ${lastname}`,
                          )
                          .join(", ") || "Unassigned"}
                      </dd>
                    </div>
                    {selectedTask.timeEstimate ? (
                      <div>
                        <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                          Time estimate
                        </dt>
                        <dd className="mt-1 text-sm text-gray-800">
                          {selectedTask.timeEstimate}
                        </dd>
                      </div>
                    ) : null}
                  </dl>
                  <div className="py-5">
                    <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Description
                    </h3>
                    <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-gray-700">
                      {selectedTask.description || "No description provided."}
                    </p>
                  </div>
                </div>
              ) : (
                <p className="py-12 text-center text-sm text-gray-500">
                  Select a task to view its details.
                </p>
              )}
            </div>
          </SectionCard>
        </div>
      )}
      {isEditOpen && selectedTask ? (
        <TaskDialog
          task={toTask(selectedTask)}
          initialStatus={selectedTask.status as TaskStatus}
          workspaceId={id}
          projectId={selectedTask.project.id}
          onClose={() => setIsEditOpen(false)}
          onTaskCreated={() => undefined}
          onTaskUpdated={() => {
            setIsEditOpen(false);
            void loadTasks();
          }}
        />
      ) : null}
    </div>
  );
};

export default MyTask;
