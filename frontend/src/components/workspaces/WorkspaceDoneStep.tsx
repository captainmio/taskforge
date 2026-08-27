import { useFormContext, useWatch } from "react-hook-form";
import { FaArrowRight, FaEnvelope } from "react-icons/fa";
import type { WorkspaceFormValues } from "../../types/workspace";
import { getCompleteWorkspaceInvites } from "../../pages/workspaces/utils/workspaceForm";
import IconDescriptionItem from "../ui/IconDescriptionItem";
import SubmitButton from "../ui/SubmitButton";
import SuccessState from "../ui/SuccessState";

interface WorkspaceDoneStepProps {
  onGoToWorkspace: () => void;
  onCreateProject?: () => void;
  onInviteMembers?: () => void;
}

const WorkspaceDoneStep = ({
  onGoToWorkspace,
  onCreateProject,
  onInviteMembers,
}: WorkspaceDoneStepProps) => {
  const { control } = useFormContext<WorkspaceFormValues>();
  const workspaceName = useWatch({ control, name: "workspaceName" });
  const invites = useWatch({ control, name: "invites" });
  const completedInvites = getCompleteWorkspaceInvites(invites).length;

  const invitationTitle =
    completedInvites === 0
      ? "No invitations added"
      : `${completedInvites} ${completedInvites === 1 ? "invitation" : "invitations"} prepared`;
  const invitationDescription =
    completedInvites === 0
      ? "You can invite members from your workspace later."
      : "Your invitations were included with the workspace request.";

  return (
    <div className="flex h-full flex-col">
      <SuccessState
        title="Your workspace is ready!"
        description={`${workspaceName || "Your workspace"} has been prepared successfully.`}
      />

      <div className="mt-7 rounded-xl border border-green-200 bg-green-50/40 p-4">
        <IconDescriptionItem
          icon={<FaEnvelope />}
          title={invitationTitle}
          description={invitationDescription}
        />
      </div>

      <div className="mt-auto space-y-3 pt-8">
        <SubmitButton
          type="button"
          onClick={onGoToWorkspace}
          className="flex w-full cursor-pointer items-center justify-center gap-3 rounded-lg bg-site-green px-4 py-3 font-semibold text-white transition-colors hover:bg-green-700"
        >
          Go to workspace
          <FaArrowRight className="size-4" aria-hidden="true" />
        </SubmitButton>

        <button
          type="button"
          onClick={onCreateProject}
          disabled={!onCreateProject}
          title={
            !onCreateProject ? "Project creation is coming soon" : undefined
          }
          className="w-full cursor-pointer rounded-lg border border-gray-300 px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Create your first project
        </button>

        <button
          type="button"
          onClick={onInviteMembers}
          disabled={!onInviteMembers}
          title={
            !onInviteMembers
              ? "Available after workspace details are returned"
              : undefined
          }
          className="mx-auto block cursor-pointer text-sm text-gray-500 underline underline-offset-4 hover:text-gray-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Invite more members
        </button>
      </div>
    </div>
  );
};

export default WorkspaceDoneStep;
