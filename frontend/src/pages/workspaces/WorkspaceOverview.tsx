import {
  FaCalendarAlt,
  FaEdit,
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
import ActionCard from "../../components/ui/ActionCard";
import Badge, { type BadgeVariant } from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import ProfileListItem from "../../components/ui/ProfileListItem";
import ProgressBar from "../../components/ui/ProgressBar";
import RoundedSpacedDonutChart from "../../components/ui/RoundedSpacedDonutChart";
import SectionCard from "../../components/ui/SectionCard";
import Skeleton from "../../components/ui/Skeleton";
import StatCard from "../../components/ui/StatCard";
import { useAuthenticatedSession } from "../../hooks/useAuthenticatedSession";
import { getInitials } from "../../utils/getInitials";
import { useEffect, useState } from "react";
import { getWorkspaceOverview } from "../../services/workspaces";
import type {
  WorkspaceMember,
  WorkspaceOverview as WorkspaceOverviewData,
} from "../../types/workspace";

const memberRoleLabels: Record<WorkspaceMember["role"], string> = {
  OWNER: "Owner",
  ADMIN: "Admin",
  MEMBER: "Member",
};

const memberRoleBadgeVariants: Record<WorkspaceMember["role"], BadgeVariant> = {
  OWNER: "green",
  ADMIN: "purple",
  MEMBER: "gray",
};

const formatCreationDate = (createdAt: string): string => {
  const date = new Date(createdAt);
  if (Number.isNaN(date.getTime())) return "Unknown date";

  return new Intl.DateTimeFormat(undefined, {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
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
    <div className="space-y-4 rounded-xl border border-gray-200 bg-white p-4">
      <Skeleton className="h-6 w-48" />
      <div className="grid gap-3 lg:grid-cols-3">
        {[1, 2, 3].map((item) => (
          <Skeleton key={item} className="h-24" />
        ))}
      </div>
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
  const { user: currentUser } = useAuthenticatedSession();
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

  const workspaceMembers = workspaceOverview.members;
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
              value={workspaceMembers.length}
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
          className="border-emerald-100 bg-gradient-to-br from-white to-emerald-50/60 shadow-sm"
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
          title="Members"
          className="border-blue-100 bg-gradient-to-br from-white to-blue-50/60 shadow-sm"
          action={
            <Link
              to={`${basePath}/members`}
              onClick={() =>
                console.log("Workspace member list opened", {
                  workspaceId: id,
                })
              }
              className="text-xs font-semibold text-green-700 hover:text-green-800"
            >
              View members
            </Link>
          }
        >
          {workspaceMembers.length > 0 ? (
            <ul>
              {workspaceMembers.map((member) => {
                const memberName = `${member.firstname} ${member.lastname}`;
                const displayName =
                  member.id === currentUser.id
                    ? `${memberName} (You)`
                    : memberName;

                return (
                  <ProfileListItem
                    key={member.id}
                    name={displayName}
                    description={member.email}
                    trailing={
                      <Badge variant={memberRoleBadgeVariants[member.role]}>
                        {memberRoleLabels[member.role]}
                      </Badge>
                    }
                  />
                );
              })}
            </ul>
          ) : (
            <p className="py-8 text-center text-sm text-gray-500">
              No members.
            </p>
          )}
        </SectionCard>
      </div>

      <SectionCard
        title="Task distribution"
        className="mt-5 border-purple-100 bg-gradient-to-br from-white to-purple-50/60 shadow-sm"
      >
        <RoundedSpacedDonutChart
          totalLabel="Tasks"
          data={[
            { label: "To Do", value: workspaceTaskSummary.todo, color: "#64748b" },
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
            { label: "Done", value: workspaceTaskSummary.done, color: "#14ae5d" },
          ]}
        />
      </SectionCard>

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
    </div>
  );
};

export default WorkspaceOverview;
