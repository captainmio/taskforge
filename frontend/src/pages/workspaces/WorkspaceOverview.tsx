import { useEffect, useState } from "react";
import {
  FaCalendarAlt,
  FaChevronRight,
  FaCode,
  FaCog,
  FaDesktop,
  FaEdit,
  FaFolder,
  FaHome,
  FaMobileAlt,
  FaPlus,
  FaSignOutAlt,
  FaTasks,
  FaTrashAlt,
  FaUserPlus,
  FaUsers,
} from "react-icons/fa";
import { useParams } from "react-router";
import AppLayout from "../../components/layout/AppLayout";
import AppSidebar from "../../components/layout/AppSidebar";
import ContextSwitcher from "../../components/layout/ContextSwitcher";
import NavItem from "../../components/layout/NavItem";
import AccountMenu from "../../components/ui/AccountMenu";
import ActionCard from "../../components/ui/ActionCard";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import IconDescriptionItem from "../../components/ui/IconDescriptionItem";
import PageHeader from "../../components/ui/PageHeader";
import ProfileListItem from "../../components/ui/ProfileListItem";
import SectionCard from "../../components/ui/SectionCard";
import StatCard from "../../components/ui/StatCard";
import { getCurrentUser, logout, type User } from "../../services/auth";
import { getInitials } from "../../utils/getInitials";

const projects = [
  { name: "Website Redesign", tasks: 12, icon: <FaDesktop />, iconClassName: "bg-green-50 text-site-green" },
  { name: "Mobile App", tasks: 18, icon: <FaMobileAlt />, iconClassName: "bg-blue-50 text-blue-600" },
  { name: "Backend API", tasks: 9, icon: <FaCode />, iconClassName: "bg-purple-50 text-purple-600" },
];

const members = [
  { name: "Jane Cooper", email: "jane@example.com" },
  { name: "Devon Lane", email: "devon@example.com" },
  { name: "Cody Fisher", email: "cody@example.com" },
  { name: "Esther Howard", email: "esther@example.com" },
];

const WorkspaceOverview = () => {
  const { id = "" } = useParams();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const workspaceName = "TaskForge Dev";
  const basePath = `/workspace/${id}`;

  useEffect(() => {
    getCurrentUser()
      .then(({ user }) => setCurrentUser(user))
      .catch(() => undefined);
  }, []);

  const userName:string = currentUser
    ? `${currentUser.firstname} ${currentUser.lastname}`
    : "TaskForge User";
  const userEmail:string = currentUser?.email ?? "Loading account...";

  const sidebar = (
    <AppSidebar
      contextSwitcher={(
        <ContextSwitcher name={workspaceName} initials={getInitials(workspaceName)} />
      )}
      navigation={(
        <>
          <NavItem to={basePath} icon={<FaHome />} label="Overview" end />
          <NavItem icon={<FaFolder />} label="Projects" disabled />
          <NavItem icon={<FaUsers />} label="Members" disabled />
          <NavItem icon={<FaCog />} label="Settings" disabled />
        </>
      )}
      secondaryAction={(
        <NavItem icon={<FaSignOutAlt />} label="Leave workspace" disabled />
      )}
    />
  );

  return (
    <AppLayout sidebar={sidebar}>
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <PageHeader
          title="Workspace Overview"
          description="Here’s what’s happening in your workspace."
          actions={(
            <>
              <Button leadingIcon={<FaUserPlus />} className="flex-1 sm:flex-none">
                Invite Member
              </Button>
              <AccountMenu name={userName} email={userEmail} onLogout={logout} />
            </>
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
                {getInitials(workspaceName)}
              </span>
              <div className="min-w-0">
                <h2 className="truncate text-xl font-bold text-gray-950">{workspaceName}</h2>
                <p className="mt-1 max-w-md text-sm leading-6 text-gray-500">
                  Workspace for managing and collaborating on our development projects.
                </p>
                <p className="mt-4 flex items-center gap-2 text-xs text-gray-400">
                  <FaCalendarAlt className="size-3" aria-hidden="true" />
                  Created on May 16, 2024 by you
                </p>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <StatCard icon={<FaFolder />} label="Projects" value={3} />
              <StatCard
                icon={<FaUsers />}
                label="Members"
                value={5}
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
            action={<Button variant="outline" size="sm" leadingIcon={<FaPlus />}>New Project</Button>}
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
                    description={`${project.tasks} tasks`}
                    iconContainerClassName={project.iconClassName}
                    trailing={<FaChevronRight className="size-3" aria-hidden="true" />}
                  />
                </li>
              ))}
            </ul>
            <button type="button" className="mx-auto mt-7 block text-sm font-semibold text-green-700 hover:text-green-800">
              View all projects
            </button>
          </SectionCard>

          <SectionCard
            title="Members"
            className="border-blue-100 bg-gradient-to-br from-white to-blue-50/60 shadow-sm"
            action={<Button variant="outline" size="sm">Invite Member</Button>}
          >
            <ul>
              <ProfileListItem
                name={`${userName} (You)`}
                description={userEmail}
                trailing={<Badge variant="green">Admin</Badge>}
              />
              {members.map((member) => (
                <ProfileListItem
                  key={member.email}
                  name={member.name}
                  description={member.email}
                  trailing={<Badge>Member</Badge>}
                />
              ))}
            </ul>
            <button type="button" className="mx-auto mt-5 block text-sm font-semibold text-green-700 hover:text-green-800">
              View all members
            </button>
          </SectionCard>
        </div>

        <SectionCard
          title="Settings & Actions"
          className="mt-5 border-amber-100 bg-gradient-to-br from-white to-amber-50/60 shadow-sm"
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
    </AppLayout>
  );
};

export default WorkspaceOverview;
