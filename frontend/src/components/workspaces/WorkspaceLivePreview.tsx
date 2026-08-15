import { useFormContext, useWatch } from "react-hook-form";
import type { WorkspaceFormValues } from "../../types/workspace";
import WorkspacePreviewPanel from "./WorkspacePreviewPanel";

const WorkspaceLivePreview = () => {
  const { control } = useFormContext<WorkspaceFormValues>();
  const workspaceName = useWatch({ control, name: "workspaceName" });
  const description = useWatch({ control, name: "description" });
  const icon = useWatch({ control, name: "icon" });
  const invites = useWatch({ control, name: "invites" });

  // Empty invite rows are form drafts and should not count as invited members.
  const invitedMemberCount = invites.filter(
    (invite) => invite.email.trim().length > 0 && invite.role !== ""
  ).length;

  return (
    <WorkspacePreviewPanel
      name={workspaceName || "Your workspace name"}
      description={description || "Your workspace description will appear here."}
      icon={icon}
      invitedMemberCount={invitedMemberCount}
    />
  );
};

export default WorkspaceLivePreview;
