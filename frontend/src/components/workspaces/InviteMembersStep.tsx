import { useFieldArray, useFormContext } from "react-hook-form";
import { FaEnvelope, FaPlus, FaTrash } from "react-icons/fa";
import { WorkspaceRole } from "../../types/roles";
import type { WorkspaceFormValues } from "../../types/workspace";
import { parseAllowedValue } from "../../utils/allowedValue";
import Textbox from "../ui/Textbox";
import StepNavigation from "./StepNavigation";

interface InviteMembersStepProps {
  onBack: () => void;
  onSkip: () => void;
  onContinue: () => void;
}

const InviteMembersStep = ({
  onBack,
  onSkip,
  onContinue,
}: InviteMembersStepProps) => {
  const {
    register,
    control,
    formState: { errors },
  } = useFormContext<WorkspaceFormValues>();
  const { fields, append, remove, replace } = useFieldArray({
    control,
    name: "invites",
  });

  const skipInvites = (): void => {
    // Skipping clears partial rows so invalid invite data is not submitted later.
    replace([]);
    onSkip();
  };

  return (
    <div className="flex h-full flex-col">
      <h2 className="text-2xl font-bold">Invite members</h2>
      <p className="mt-1 text-sm text-gray-500">
        Invite people to collaborate and choose their workspace role.
      </p>

      <form
        className="mt-7 flex flex-1 flex-col"
        onSubmit={(event) => {
          event.preventDefault();
          onContinue();
        }}
      >
        <div className="space-y-5">
        {fields.map((field, index) => {
          const emailError = errors.invites?.[index]?.email;
          const roleError = errors.invites?.[index]?.role;

          return (
            <fieldset key={field.id} className="relative rounded-xl border border-gray-200 p-4">
              <legend className="px-1 text-sm font-semibold">Member {index + 1}</legend>
              <button
                type="button"
                onClick={() => remove(index)}
                className="absolute right-4 top-4 flex cursor-pointer items-center gap-2 text-xs font-medium text-red-500 hover:text-red-700"
                aria-label={`Remove member ${index + 1}`}
              >
                <FaTrash className="size-3" aria-hidden="true" />
                Remove
              </button>

              <div className="mt-3 space-y-4">
                <div>
                  <label htmlFor={`invite-email-${field.id}`} className="mb-2 block text-sm font-semibold">
                    Email address <span className="text-red-500">*</span>
                  </label>
                  <Textbox
                    id={`invite-email-${field.id}`}
                    type="email"
                    icon={<FaEnvelope />}
                    placeholder="name@example.com"
                    aria-invalid={Boolean(emailError)}
                    aria-describedby={emailError ? `invite-email-${field.id}-error` : undefined}
                    {...register(`invites.${index}.email`, {
                      required: "Email address is required.",
                      pattern: {
                        value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                        message: "Enter a valid email address.",
                      },
                    })}
                  />
                  {emailError && (
                    <p id={`invite-email-${field.id}-error`} className="mt-2 text-xs text-red-500" role="alert">
                      {emailError.message}
                    </p>
                  )}
                </div>

                <div>
                  <label htmlFor={`invite-role-${field.id}`} className="mb-2 block text-sm font-semibold">
                    Role <span className="text-red-500">*</span>
                  </label>
                  <select
                    id={`invite-role-${field.id}`}
                    aria-invalid={Boolean(roleError)}
                    aria-describedby={roleError ? `invite-role-${field.id}-error` : undefined}
                    className="h-10 w-full rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-900 focus:border-site-green focus:outline-none focus:ring-1 focus:ring-site-green"
                    {...register(`invites.${index}.role`, {
                      required: "Role is required.",
                      setValueAs: (value: string) =>
                        parseAllowedValue(WorkspaceRole, value) ?? "",
                    })}
                  >
                    <option value="" disabled>Select a role</option>
                    <option value={WorkspaceRole.ADMIN}>{WorkspaceRole.ADMIN}</option>
                    <option value={WorkspaceRole.MEMBER}>{WorkspaceRole.MEMBER}</option>
                  </select>
                  {roleError && (
                    <p id={`invite-role-${field.id}-error`} className="mt-2 text-xs text-red-500" role="alert">
                      {roleError.message}
                    </p>
                  )}
                </div>
              </div>
            </fieldset>
          );
        })}


        <button
          type="button"
          onClick={() => append({ email: "", role: "" })}
          className="flex cursor-pointer items-center gap-2 text-sm font-semibold text-site-green hover:text-green-700"
        >
          <FaPlus className="size-3" aria-hidden="true" />
          Add another member
        </button>

        {fields.length === 0 && (
          <p className="rounded-lg bg-gray-50 p-4 text-sm text-gray-500">
            No members added. Add an invite or skip this step for now.
          </p>
        )}
        </div>

        {/* Keep navigation anchored to the bottom when the invite list is short. */}
        <div className="mt-auto space-y-5 pt-8">
          <StepNavigation
            isFirstStep={false}
            isLastStep={false}
            submitNext
            nextLabel="Continue"
            onBack={onBack}
          />

          <button
            type="button"
            onClick={skipInvites}
            className="mx-auto block cursor-pointer text-sm text-gray-500 underline underline-offset-4 hover:text-gray-700"
          >
            Skip for now
          </button>
        </div>
      </form>
    </div>
  );
};

export default InviteMembersStep;
