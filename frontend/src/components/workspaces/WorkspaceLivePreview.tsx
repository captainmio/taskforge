import { useFormContext, useWatch } from "react-hook-form";
import type { WorkspaceFormValues } from "../../types/workspace";
import { getCompleteWorkspaceInvites } from "../../pages/workspaces/utils/workspaceForm";
import WorkspacePreviewPanel from "./WorkspacePreviewPanel";

const WorkspaceLivePreview = () => {
  const { control } = useFormContext<WorkspaceFormValues>();
  const workspaceName = useWatch({ control, name: "workspaceName" });
  const description = useWatch({ control, name: "description" });
  const icon = useWatch({ control, name: "icon" });
  const invites = useWatch({ control, name: "invites" });

  const invitedMemberCount = getCompleteWorkspaceInvites(invites).length;

  return (
    <WorkspacePreviewPanel
      name={workspaceName || "Your workspace name"}
      description={
        description || "Your workspace description will appear here."
      }
      icon={icon}
      invitedMemberCount={invitedMemberCount}
    />
  );
};

export default WorkspaceLivePreview;
