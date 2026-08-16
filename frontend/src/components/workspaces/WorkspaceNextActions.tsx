import { FaCog, FaFolder, FaUsers } from "react-icons/fa";
import ActionCard from "../ui/ActionCard";

interface WorkspaceNextActionsProps {
  onCreateProject?: () => void;
  onInviteMembers?: () => void;
  onOpenSettings?: () => void;
}

const WorkspaceNextActions = ({
  onCreateProject,
  onInviteMembers,
  onOpenSettings,
}: WorkspaceNextActionsProps) => {
  return (
    <div>
      <h2 className="text-base font-semibold text-gray-900">What&apos;s next?</h2>
      <p className="mt-1 text-sm text-gray-500">Here are some things you can do to get started.</p>

      <div className="mt-6 space-y-4">
        <ActionCard
          icon={<FaFolder />}
          title="Create your first project"
          description="Organize your work into projects."
          onClick={onCreateProject}
          disabled={!onCreateProject}
        />
        <ActionCard
          icon={<FaUsers />}
          title="Invite more members"
          description="Grow your team and collaborate."
          iconContainerClassName="bg-blue-50 text-blue-600"
          onClick={onInviteMembers}
          disabled={!onInviteMembers}
        />
        <ActionCard
          icon={<FaCog />}
          title="Workspace settings"
          description="Update workspace name, icon and more."
          iconContainerClassName="bg-purple-50 text-purple-600"
          onClick={onOpenSettings}
          disabled={!onOpenSettings}
        />
      </div>
    </div>
  );
};

export default WorkspaceNextActions;
