import { useWatch, useFormContext } from "react-hook-form";
import type { WorkspaceFormValues } from "../../types/workspace";
import SectionCard from "../ui/SectionCard";
import InviteReviewRow from "./InviteReviewRow";
import StepNavigation from "./StepNavigation";
import WorkspaceSummaryCard from "./WorkspaceSummaryCard";

interface WorkspaceReviewStepProps {
  onEditDetails: () => void;
  onEditInvites: () => void;
  onBack: () => void;
  onCreateWorkspace: () => void;
  isCreating: boolean;
}

const EditAction = ({ onClick }: { onClick: () => void }) => (
  <button
    type="button"
    onClick={onClick}
    className="cursor-pointer rounded-md border border-site-green px-3 py-1 text-xs font-semibold text-site-green hover:bg-green-50"
  >
    Edit
  </button>
);

const WorkspaceReviewStep = ({
  onEditDetails,
  onEditInvites,
  onBack,
  onCreateWorkspace,
  isCreating,
}: WorkspaceReviewStepProps) => {
  const { control } = useFormContext<WorkspaceFormValues>();
  const workspaceName = useWatch({ control, name: "workspaceName" });
  const description = useWatch({ control, name: "description" });
  const icon = useWatch({ control, name: "icon" });
  const invites = useWatch({ control, name: "invites" });

  return (
    <div className="flex h-full flex-col">
      <h2 className="text-2xl font-bold">Review your workspace</h2>
      <p className="mt-1 text-sm text-gray-500">
        Please review your workspace details and invitations before creating.
      </p>

      <div className="mt-6 space-y-4">
        <SectionCard
          title="Workspace details"
          action={<EditAction onClick={onEditDetails} />}
        >
          <WorkspaceSummaryCard
            name={workspaceName}
            description={description}
            icon={icon}
            invitedMemberCount={invites.length}
          />
        </SectionCard>

        <SectionCard
          title={`Invited members (${invites.length})`}
          action={<EditAction onClick={onEditInvites} />}
        >
          {invites.length > 0 ? (
            <div>
              {invites.map((invite, index) => (
                <InviteReviewRow
                  key={`${invite.email}-${index}`}
                  email={invite.email}
                  role={invite.role}
                />
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500">No members will be invited.</p>
          )}
        </SectionCard>
      </div>

      <div className="mt-auto pt-8">
        <StepNavigation
          isFirstStep={false}
          isLastStep={false}
          nextLabel={isCreating ? "Creating workspace..." : "Create workspace"}
          isNextDisabled={isCreating}
          onBack={onBack}
          onNext={onCreateWorkspace}
        />
      </div>
    </div>
  );
};

export default WorkspaceReviewStep;
