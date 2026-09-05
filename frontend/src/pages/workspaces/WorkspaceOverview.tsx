import {
  FaCalendarAlt,
  FaEdit,
  FaHistory,
  FaFolder,
  FaSignOutAlt,
  FaTasks,
  FaTrashAlt,
  FaUserPlus,
  FaUsers,
} from "react-icons/fa";
import { Link, useNavigate, useParams } from "react-router";
import AppHeader from "../../components/layout/AppHeader";
import { projectIconOptions } from "../../components/projects/projectIconOptions";
import TaskHistoryChangeDetails, {
  hasTaskHistoryDetails,
} from "../../components/tasks/TaskHistoryChangeDetails";
import ActionCard from "../../components/ui/ActionCard";
import Button from "../../components/ui/Button";
import Modal from "../../components/ui/Modal";
import ProgressBar from "../../components/ui/ProgressBar";
import RoundedSpacedDonutChart from "../../components/ui/RoundedSpacedDonutChart";
import SectionCard from "../../components/ui/SectionCard";
import Skeleton from "../../components/ui/Skeleton";
import StatCard from "../../components/ui/StatCard";
import { formatRelativeDateTime } from "../../utils/formatRelativeDateTime";
import { formatTaskDueDate } from "../../utils/formatTaskDueDate";
import {
  getTaskDueDateStatus,
  type TaskDueDateStatus,
} from "../../utils/getTaskDueDateStatus";
import { getInitials } from "../../utils/getInitials";
import { useEffect, useState } from "react";
import {
  getWorkspaceHistory,
  getWorkspaceOverview,
  getWorkspaceUpcomingTasks,
} from "../../services/workspaces";
import type {
  WorkspaceOverview as WorkspaceOverviewData,
  WorkspaceUpcomingTask,
} from "../../types/workspace";

const formatCreationDate = (createdAt: string): string => {
  const date = new Date(createdAt);
  if (Number.isNaN(date.getTime())) return "Unknown date";

  return new Intl.DateTimeFormat(undefined, {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
};

const dueDatePresentation: Record<
  TaskDueDateStatus,
  { label: string; className: string }
> = {
  overdue: {
    label: "Overdue",
    className: "bg-red-50 text-red-700 ring-red-100",
  },
  dueSoon: {
    label: "Due soon",
    className: "bg-red-50 text-red-700 ring-red-100",
  },
  approaching: {
    label: "Approaching",
    className: "bg-amber-50 text-amber-700 ring-amber-100",
  },
  later: {
    label: "Has time",
    className: "bg-emerald-50 text-emerald-700 ring-emerald-100",
  },
};

const WorkspaceOverviewSkeleton = () => (
  <div
    className="mx-auto max-w-6xl space-y-5 px-4 py-6 sm:px-6 lg:px-8 lg:py-8"
    role="status"
    aria-label="Loading workspace overview"
  >
    <div className="flex items-start justify-between gap-4">
      <div className="space-y-3">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-4 w-72" />
      </div>
      <Skeleton className="h-10 w-36" />
    </div>
    <section className="grid gap-6 rounded-2xl border border-emerald-100 bg-white p-5 xl:grid-cols-[1fr_1.15fr]">
      <div className="flex items-center gap-4">
        <Skeleton className="size-14 rounded-xl" />
        <div className="flex-1 space-y-3">
          <Skeleton className="h-6 w-2/5" />
          <Skeleton className="h-4 w-4/5" />
          <Skeleton className="h-3 w-1/3" />
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        {[1, 2, 3].map((item) => (
          <Skeleton key={item} className="h-28" />
        ))}
      </div>
    </section>
    <div className="grid gap-5 xl:grid-cols-2">
      {[1, 2].map((item) => (
        <div
          key={item}
          className="space-y-4 rounded-xl border border-gray-200 bg-white p-4"
        >
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      ))}
    </div>
    <div className="grid gap-5 xl:grid-cols-2">
      {[1, 2].map((item) => (
        <div
          key={item}
          className="space-y-4 rounded-xl border border-gray-200 bg-white p-4"
        >
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      ))}
    </div>
  </div>
);

const WorkspaceOverview = () => {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const [authorizedWorkspaceId, setAuthorizedWorkspaceId] = useState<
    string | null
  >(null);
  const [workspaceOverview, setWorkspaceOverview] =
    useState<WorkspaceOverviewData | null>(null);
  const [upcomingTasks, setUpcomingTasks] = useState<WorkspaceUpcomingTask[]>(
    [],
  );
  const [isRecentUpdatesModalOpen, setIsRecentUpdatesModalOpen] =
    useState<boolean>(false);
  const [allUpdates, setAllUpdates] = useState<
    WorkspaceOverviewData["recentUpdates"]
  >([]);
  const [historyCursor, setHistoryCursor] = useState<number | null>(null);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const basePath = `/workspace/${id}`;
  const inviteMembersPath: string = `${basePath}/members/invite`;
  const projectsPath: string = `${basePath}/projects`;

  useEffect(() => {
    let isActive = true;

    if (!id) {
      navigate("/", { replace: true });
      return;
    }

    const loadWorkspaceOverview = async () => {
      try {
        const response = await getWorkspaceOverview(id);

        if (!isActive) return;

        if (!response.success) {
          navigate("/", { replace: true });
          return;
        }

        setWorkspaceOverview(response.data);

        try {
          const upcomingTasksResponse = await getWorkspaceUpcomingTasks(id);
          if (isActive) setUpcomingTasks(upcomingTasksResponse.data.tasks);
        } catch {
          if (isActive) setUpcomingTasks([]);
        }

        setAuthorizedWorkspaceId(id);
      } catch {
        if (isActive) navigate("/", { replace: true });
      }
    };

    void loadWorkspaceOverview();

    return () => {
      isActive = false;
    };
  }, [id, navigate]);

  if (authorizedWorkspaceId !== id || !workspaceOverview) {
    return <WorkspaceOverviewSkeleton />;
  }

  // The fallback keeps the overview usable while a deployment transitions from
  // an older API response that did not yet include projects.
  const workspaceProjects = workspaceOverview.projects ?? [];
  const workspaceTaskSummary = workspaceOverview.taskSummary ?? {
    todo: 0,
    inProgress: 0,
    inReview: 0,
    done: 0,
  };
  const workspaceTaskCount = workspaceProjects.reduce(
    (total, project) => total + project.taskCount,
    0,
  );
  const recentUpdates = (workspaceOverview.recentUpdates ?? []).filter(
    (update) => update.action === "commented" || hasTaskHistoryDetails(update.changes),
  );
  const loadHistory = async (cursor?: number) => {
    setIsLoadingHistory(true);
    try {
      const response = await getWorkspaceHistory(id, cursor);
      setAllUpdates((current) =>
        cursor
          ? [...(current ?? []), ...response.data.history]
          : response.data.history,
      );
      setHistoryCursor(response.data.nextCursor);
    } finally {
      setIsLoadingHistory(false);
    }
  };
  const openHistory = () => {
    setIsRecentUpdatesModalOpen(true);
    if (!allUpdates?.length) void loadHistory();
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <AppHeader
        title="Workspace Overview"
        description="Here’s what’s happening in your workspace."
        primaryAction={
          <Button
            leadingIcon={<FaUserPlus />}
            onClick={() => navigate(inviteMembersPath)}
          >
            Invite Member
          </Button>
        }
      />

      <section className="relative mt-7 overflow-hidden rounded-2xl border border-emerald-100 bg-gradient-to-br from-white via-white to-emerald-50/80 p-5 shadow-sm sm:p-6">
        <span
          className="pointer-events-none absolute -right-16 -top-20 size-52 rounded-full bg-emerald-100/60 blur-3xl"
          aria-hidden="true"
        />
        <div className="grid gap-6 xl:grid-cols-[minmax(15rem,0.6fr)_minmax(0,1.4fr)] xl:items-center">
          <div className="flex items-start gap-4">
            <span className="flex size-14 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-400 to-site-green text-lg font-bold text-white shadow-sm">
              {getInitials(workspaceOverview.displayName)}
            </span>
            <div className="min-w-0">
              <h2 className="truncate text-xl font-bold text-gray-950">
                {workspaceOverview.displayName}
              </h2>
              <p className="mt-1 max-w-md text-sm leading-6 text-gray-500">
                {workspaceOverview.description || "No description provided."}
              </p>
              <p className="mt-4 flex items-center gap-2 text-xs text-gray-400">
                <FaCalendarAlt className="size-3" aria-hidden="true" />
                Created on {formatCreationDate(workspaceOverview.createdAt)}
              </p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              icon={<FaFolder />}
              label="Projects"
              value={workspaceProjects.length}
            />
            <StatCard
              icon={<FaUsers />}
              label="Members"
              value={workspaceOverview.memberCount ?? 0}
              iconClassName="bg-blue-50 text-blue-600 ring-blue-100"
            />
            <StatCard
              icon={<FaTasks />}
              label="Tasks"
              value={workspaceTaskCount}
              iconClassName="bg-purple-50 text-purple-600 ring-purple-100"
            />
            {/* TODO: Replace this temporary due-task total with the workspace summary API metric. */}
            <StatCard
              icon={<FaCalendarAlt />}
              label="Tasks due"
              value={12}
              iconClassName="bg-amber-50 text-amber-600 ring-amber-100"
            />
          </div>
        </div>
      </section>

      <div className="mt-5 grid gap-5 xl:grid-cols-2">
        <SectionCard
          title={`Projects (${workspaceProjects.length})`}
          className="border-emerald-100 bg-gradient-to-br from-white to-emerald-50/60 shadow-sm "
          action={
            <Link
              to={projectsPath}
              className="text-xs font-semibold text-green-700 hover:text-green-800"
            >
              View projects
            </Link>
          }
        >
          {workspaceProjects.length > 0 ? (
            <ul className="-m-4">
              {workspaceProjects.map((project) => {
                const iconOption = projectIconOptions.find(
                  (option) => option.id === project.icon,
                );
                const progress =
                  project.taskCount === 0
                    ? 0
                    : (project.completedTaskCount / project.taskCount) * 100;
                return (
                  <li
                    key={project.id}
                    className="border-b border-gray-100 py-3.5 last:border-b-0"
                  >
                    <Link
                      to={`${projectsPath}/${project.id}/tasks`}
                      className="grid grid-cols-[2.5rem_minmax(0,1fr)] gap-x-3 rounded-xl px-2 py-1 transition-colors hover:bg-slate-50"
                    >
                      <span
                        className={`row-span-2 flex size-10 items-center justify-center rounded-xl [&>svg]:size-4 ${iconOption?.className ?? "bg-gray-100 text-gray-600"}`}
                        aria-hidden="true"
                      >
                        {iconOption?.icon ?? <FaFolder />}
                      </span>
                      <div className="flex min-w-0 items-center justify-between gap-3">
                        <p className="truncate text-sm font-semibold text-gray-950">
                          {project.name}
                        </p>
                        <span className="shrink-0 text-xs font-semibold text-site-green">
                          {project.completedTaskCount} Completed
                        </span>
                      </div>
                      {project.taskCount > 0 ? (
                        <ProgressBar
                          className="mt-2"
                          value={progress}
                          label={`${project.name} completion`}
                        />
                      ) : (
                        <p className="mt-2 text-right text-xs text-gray-500">
                          No tasks yet
                        </p>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="py-8 text-center text-sm text-gray-500">
              No projects yet.
            </p>
          )}
        </SectionCard>

        <SectionCard
          title="Recent Update"
          className="border-blue-100 bg-gradient-to-br from-white to-blue-50/60 shadow-sm overflow-y-auto"
          action={
            <button
              type="button"
              onClick={openHistory}
              className="text-xs font-semibold text-green-700 hover:text-green-800 cursor-pointer"
            >
              View All
            </button>
          }
        >
          {recentUpdates.length > 0 ? (
            <ul className="-m-4 divide-y divide-blue-100">
              {recentUpdates.map((update) => (
                <li key={update.id} className="flex gap-3 px-4 py-3.5">
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-600">
                    <FaHistory className="size-3.5" aria-hidden="true" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-gray-700">
                      <strong className="font-semibold text-gray-950">
                        {update.actor.firstname} {update.actor.lastname}
                      </strong>{" "}
                      {update.action === "commented" ? "added a comment to" : update.action === "created" ? "created" : "updated"} this
                      task.
                    </p>
                    <TaskHistoryChangeDetails
                      changes={update.changes}
                      valueKeyPrefix={`overview:${update.id}`}
                      className="text-xs leading-5 text-gray-600"
                    />
                    <p className="mt-0.5 truncate text-xs text-gray-500">
                      <strong className="font-semibold text-gray-700">
                        {update.task.title}
                      </strong>{" "}
                      in {update.task.project.name}
                    </p>
                  </div>
                  <time className="shrink-0 pt-0.5 text-right text-[11px] text-gray-400">
                    {formatRelativeDateTime(update.createdAt)}
                  </time>
                </li>
              ))}
            </ul>
          ) : (
            <p className="py-8 text-center text-sm text-gray-500">
              No recent updates.
            </p>
          )}
        </SectionCard>
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-2">
        <SectionCard
          title="Tasks Summary"
          className="border-purple-100 bg-gradient-to-br from-white to-purple-50/60 shadow-sm"
        >
          <RoundedSpacedDonutChart
            totalLabel="Tasks"
            data={[
              {
                label: "To Do",
                value: workspaceTaskSummary.todo,
                color: "#64748b",
              },
              {
                label: "In Progress",
                value: workspaceTaskSummary.inProgress,
                color: "#7c3aed",
              },
              {
                label: "In Review",
                value: workspaceTaskSummary.inReview,
                color: "#d97706",
              },
              {
                label: "Done",
                value: workspaceTaskSummary.done,
                color: "#14ae5d",
              },
            ]}
          />
        </SectionCard>

        <SectionCard
          title="Upcoming Task"
          className="shadow-sm"
          action={
            <Link
              to={`${basePath}/my-tasks`}
              className="text-xs font-semibold text-green-700 hover:text-green-800"
            >
              View All
            </Link>
          }
        >
          <ul className="-m-4 divide-y divide-amber-100">
            {upcomingTasks.length > 0 ? (
              upcomingTasks.map((task) => {
                const dueDate =
                  dueDatePresentation[getTaskDueDateStatus(task.dueDate)];

                return (
                  <li key={task.id} className="px-4 py-3.5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-gray-950">
                          {task.title}
                        </p>
                        <p className="mt-1 truncate text-xs text-gray-500">
                          {task.project.name}
                        </p>
                      </div>
                      <span
                        className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-1 text-[11px] font-semibold ring-1 ring-inset ${dueDate.className}`}
                      >
                        <FaCalendarAlt className="size-3" aria-hidden="true" />
                        <span>{formatTaskDueDate(task.dueDate)}</span>
                        <span className="sr-only">({dueDate.label})</span>
                      </span>
                    </div>
                  </li>
                );
              })
            ) : (
              <li className="px-4 py-8 text-center text-sm text-gray-500">
                No upcoming tasks.
              </li>
            )}
          </ul>
        </SectionCard>
      </div>

      <SectionCard
        title="Settings & Actions"
        className="mt-5 border-amber-100 from-white to-amber-50/60 shadow-sm"
      >
        <p className="mb-4 text-xs text-gray-500">
          Manage your workspace settings and preferences.
        </p>
        <div className="grid gap-3 lg:grid-cols-3">
          <ActionCard
            icon={<FaEdit />}
            title="Edit Workspace"
            description="Update name and description"
          />
          <ActionCard
            icon={<FaSignOutAlt />}
            title="Leave Workspace"
            description="Leave this workspace"
            iconContainerClassName="bg-orange-50 text-orange-500"
          />
          <ActionCard
            icon={<FaTrashAlt />}
            title="Delete Workspace"
            description="Permanently delete workspace"
            iconContainerClassName="bg-red-50 text-red-500"
          />
        </div>
      </SectionCard>

      <Modal
        isOpen={isRecentUpdatesModalOpen}
        title="Recent Updates"
        onClose={() => setIsRecentUpdatesModalOpen(false)}
        footer={
          <Button
            variant="ghost"
            onClick={() => setIsRecentUpdatesModalOpen(false)}
          >
            Close
          </Button>
        }
      >
        <div className="max-h-[60vh] min-h-40 overflow-y-auto pr-1">
          {isLoadingHistory && !allUpdates?.length ? (
            <p className="text-sm text-gray-500">Loading updates…</p>
          ) : (
            <ol className="space-y-4">
              {(allUpdates ?? [])
                .filter((update) => update.action === "commented" || hasTaskHistoryDetails(update.changes))
                .map((update) => (
                  <li key={update.id} className="text-sm text-gray-700">
                    <p>
                      <strong className="font-semibold text-gray-950">
                        {update.actor.firstname} {update.actor.lastname}
                      </strong>{" "}
                      {update.action === "commented" ? "added a comment to" : update.action === "created" ? "created" : "updated"}{" "}
                      <strong className="font-semibold text-gray-950">
                        {update.task.title}
                      </strong>
                    </p>
                    <TaskHistoryChangeDetails
                      changes={update.changes}
                      valueKeyPrefix={`modal:${update.id}`}
                      className="text-xs leading-5 text-gray-600"
                    />
                    <time className="mt-1 block text-[11px] text-gray-400">
                      {formatRelativeDateTime(update.createdAt)}
                    </time>
                  </li>
                ))}
            </ol>
          )}
          {historyCursor ? (
            <Button
              size="sm"
              variant="ghost"
              className="mt-4"
              disabled={isLoadingHistory}
              onClick={() => void loadHistory(historyCursor)}
            >
              {isLoadingHistory ? "Loading…" : "Load more"}
            </Button>
          ) : null}
        </div>
      </Modal>
    </div>
  );
};

export default WorkspaceOverview;
