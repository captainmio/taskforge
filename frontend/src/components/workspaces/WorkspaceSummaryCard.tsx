import { FaCalendarAlt, FaFolder, FaUsers } from "react-icons/fa";
import type { WorkspaceIcon } from "../../types/workspace";
import { getWorkspaceIconOption } from "./workspaceIconOptions";

interface WorkspaceSummaryCardProps {
  name: string;
  description: string;
  icon: WorkspaceIcon;
  invitedMemberCount: number;
}

const WorkspaceSummaryCard = ({
  name,
  description,
  icon,
  invitedMemberCount,
}: WorkspaceSummaryCardProps) => {
  const iconOption = getWorkspaceIconOption(icon);

  return (
    <article className="rounded-lg border border-gray-200 p-4">
      <div className="flex items-center gap-4">
        <span
          aria-hidden="true"
          className={`flex size-12 shrink-0 items-center justify-center rounded-lg [&>svg]:size-5 ${iconOption.className}`}
        >
          {iconOption.icon}
        </span>
        <div className="min-w-0">
          <h4 className="truncate font-semibold text-gray-900">
            {name || "Untitled workspace"}
          </h4>
          <p className="mt-1 truncate text-sm text-gray-500">
            {description || "No description provided."}
          </p>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap gap-x-6 gap-y-2 text-xs text-gray-500">
        <span className="flex items-center gap-2">
          <FaFolder className="size-3.5" aria-hidden="true" />0 Projects
        </span>
        <span className="flex items-center gap-2">
          <FaUsers className="size-3.5" aria-hidden="true" />
          {invitedMemberCount} {invitedMemberCount === 1 ? "Invite" : "Invites"}
        </span>
        <span className="flex items-center gap-2">
          <FaCalendarAlt className="size-3.5" aria-hidden="true" />
          Just now
        </span>
      </div>
    </article>
  );
};

export default WorkspaceSummaryCard;
