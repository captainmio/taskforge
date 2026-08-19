import {
  FaCog,
  FaFolder,
  FaHome,
  FaSignOutAlt,
  FaUsers,
} from "react-icons/fa";
import { getInitials } from "../../utils/getInitials";
import ContextSwitcher from "./ContextSwitcher";
import NavItem from "./NavItem";

interface AppSidebarProps {
  workspaceName: string;
}

const AppSidebar = ({ workspaceName }: AppSidebarProps) => (
  <div className="flex h-full flex-col bg-gradient-to-b from-white via-white to-emerald-50/70">
    <div className="flex h-18 items-center gap-2 border-b border-gray-100 px-6">
      <img className="size-9 shrink-0" src="/project-icon-tasks.svg" alt="TaskForge" />
      <span className="text-lg font-bold tracking-tight text-gray-950">TaskForge</span>
    </div>

    <div className="px-5 pt-6">
      <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-gray-400">
        Workspace
      </p>
      <ContextSwitcher
        name={workspaceName}
        initials={getInitials(workspaceName)}
      />
    </div>

    <nav className="mt-5 space-y-1 px-4" aria-label="Primary navigation">
      <NavItem to="." icon={<FaHome />} label="Worskpace Overview" end />
      <NavItem icon={<FaFolder />} label="Projects" disabled />
      <NavItem icon={<FaUsers />} label="Members" disabled />
      <NavItem icon={<FaCog />} label="Settings" disabled />
    </nav>

    <div className="mt-5 border-t border-gray-100 px-4 pt-4">
      <NavItem icon={<FaSignOutAlt />} label="Leave workspace" disabled />
    </div>
  </div>
);

export default AppSidebar;
