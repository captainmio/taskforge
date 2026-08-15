import { FaCheckCircle, FaFolder, FaUsers } from "react-icons/fa";
import type { WorkspaceIcon } from "../../types/workspace";
import IconDescriptionItem from "../ui/IconDescriptionItem";
import WorkspaceSummaryCard from "./WorkspaceSummaryCard";

interface WorkspacePreviewPanelProps {
  name: string;
  description: string;
  icon: WorkspaceIcon;
  invitedMemberCount: number;
}

const WorkspacePreviewPanel = ({
  name,
  description,
  icon,
  invitedMemberCount,
}: WorkspacePreviewPanelProps) => {
  return (
    <div>
      <h2 className="text-base font-semibold text-gray-900">Workspace preview</h2>
      <p className="mt-1 text-sm text-gray-500">
        This is how your workspace will appear to your team.
      </p>

      <div className="mt-6">
        <WorkspaceSummaryCard
          name={name}
          description={description}
          icon={icon}
          invitedMemberCount={invitedMemberCount}
        />
      </div>

      <section className="mt-10" aria-labelledby="workspace-next-heading">
        <h3 id="workspace-next-heading" className="text-sm font-semibold text-gray-900">
          What&apos;s next?
        </h3>
        <div className="mt-5 space-y-6">
          <IconDescriptionItem
            icon={<FaUsers />}
            title="Invite your team"
            description="Add members to start collaborating on projects."
          />
          <IconDescriptionItem
            icon={<FaFolder />}
            title="Create your first project"
            description="Break down your work into manageable tasks."
          />
          <IconDescriptionItem
            icon={<FaCheckCircle />}
            title="Start collaborating"
            description="Track progress and achieve goals together."
          />
        </div>
      </section>
    </div>
  );
};

export default WorkspacePreviewPanel;
