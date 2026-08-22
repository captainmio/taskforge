import {
  FaCalendarAlt,
  FaChevronRight,
  FaCode,
  FaDesktop,
  FaEdit,
  FaFolder,
  FaMobileAlt,
  FaSignOutAlt,
  FaTasks,
  FaTrashAlt,
  FaUserPlus,
  FaUsers,
} from "react-icons/fa";
import { Link, useNavigate, useParams } from "react-router";
import AppHeader from "../../components/layout/AppHeader";
import ActionCard from "../../components/ui/ActionCard";
import Badge, { type BadgeVariant } from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import IconDescriptionItem from "../../components/ui/IconDescriptionItem";
import ProfileListItem from "../../components/ui/ProfileListItem";
import SectionCard from "../../components/ui/SectionCard";
import StatCard from "../../components/ui/StatCard";
import { useAuthenticatedSession } from "../../hooks/useAuthenticatedSession";
import { getInitials } from "../../utils/getInitials";
import { useEffect, useState } from "react";
import { getWorkspaceOverview } from "../../services/workspaces";
import type {
  WorkspaceMember,
  WorkspaceOverview as WorkspaceOverviewData,
} from "../../types/workspace";

const projects = [
  { name: "Website Redesign", icon: <FaDesktop />, iconClassName: "bg-green-50 text-site-green" },
  { name: "Mobile App", icon: <FaMobileAlt />, iconClassName: "bg-blue-50 text-blue-600" },
  { name: "Backend API", icon: <FaCode />, iconClassName: "bg-purple-50 text-purple-600" },
];

const memberRoleLabels: Record<WorkspaceMember["role"], string> = {
  OWNER: "Owner",
  ADMIN: "Admin",
  MEMBER: "Member",
};

const memberRoleBadgeVariants: Record<
  WorkspaceMember["role"],
  BadgeVariant
> = {
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

const WorkspaceOverview = () => {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const [authorizedWorkspaceId, setAuthorizedWorkspaceId] = useState<string | null>(null);
  const [workspaceOverview, setWorkspaceOverview] =
    useState<WorkspaceOverviewData | null>(null);
  const { user: currentUser } = useAuthenticatedSession();
  const basePath = `/workspace/${id}`;
  const inviteMembersPath:string = `${basePath}/members/invite`;
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

  if (authorizedWorkspaceId !== id || !workspaceOverview) return null;

  const workspaceMembers = workspaceOverview.members;

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <AppHeader
          title="Workspace Overview"
          description="Here’s what’s happening in your workspace."
          primaryAction={(
            <Button
              leadingIcon={<FaUserPlus />}
              onClick={() => navigate(inviteMembersPath)}
            >
              Invite Member
            </Button>
          )}
        />

        <section className="relative mt-7 overflow-hidden rounded-2xl border border-emerald-100 bg-gradient-to-br from-white via-white to-emerald-50/80 p-5 shadow-sm sm:p-6">
          <span
            className="pointer-events-none absolute -right-16 -top-20 size-52 rounded-full bg-emerald-100/60 blur-3xl"
            aria-hidden="true"
          />
          <div className="grid gap-6 xl:grid-cols-[1fr_1.15fr] xl:items-center">
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

            <div className="grid gap-3 sm:grid-cols-3">
              <StatCard icon={<FaFolder />} label="Projects" value={3} />
              <StatCard
                icon={<FaUsers />}
                label="Members"
                value={workspaceMembers.length}
                iconClassName="bg-blue-50 text-blue-600 ring-blue-100"
              />
              <StatCard
                icon={<FaTasks />}
                label="Tasks"
                value={39}
                iconClassName="bg-purple-50 text-purple-600 ring-purple-100"
              />
            </div>
          </div>
        </section>

        <div className="mt-5 grid gap-5 xl:grid-cols-2">
          <SectionCard
            title="Projects"
            className="border-emerald-100 bg-gradient-to-br from-white to-emerald-50/60 shadow-sm"
            action={(
              <Link
                to={projectsPath}
                className="text-xs font-semibold text-green-700 hover:text-green-800"
              >
                View projects
              </Link>
            )}
          >
            <ul className="-m-4">
              {projects.map((project) => (
                <li
                  key={project.name}
                  className="border-b border-gray-100 px-4 py-3.5 last:border-b-0"
                >
                  <IconDescriptionItem
                    icon={project.icon}
                    title={project.name}
                    iconContainerClassName={project.iconClassName}
                    trailing={<FaChevronRight className="size-3" aria-hidden="true" />}
                  />
                </li>
              ))}
            </ul>
          </SectionCard>

          <SectionCard
            title="Members"
            className="border-blue-100 bg-gradient-to-br from-white to-blue-50/60 shadow-sm"
            action={(
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
            )}
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
                      trailing={(
                        <Badge variant={memberRoleBadgeVariants[member.role]}>
                          {memberRoleLabels[member.role]}
                        </Badge>
                      )}
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
          title="Settings & Actions"
          className="mt-5 border-amber-100 from-white to-amber-50/60 shadow-sm"
        >
          <p className="mb-4 text-xs text-gray-500">Manage your workspace settings and preferences.</p>
          <div className="grid gap-3 lg:grid-cols-3">
            <ActionCard icon={<FaEdit />} title="Edit Workspace" description="Update name and description" />
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
