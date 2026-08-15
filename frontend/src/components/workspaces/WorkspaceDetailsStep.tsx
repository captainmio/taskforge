import { Controller, useFormContext } from "react-hook-form";
import {
  FaAlignLeft,
  FaBuilding,
} from "react-icons/fa";
import type { WorkspaceFormValues } from "../../types/workspace";
import SelectableIconButton from "../ui/SelectableIconButton";
import Textarea from "../ui/Textarea";
import Textbox from "../ui/Textbox";
import StepNavigation from "./StepNavigation";
import { workspaceIconOptions } from "./workspaceIconOptions";

interface WorkspaceDetailsStepProps {
  onContinue: () => void;
}

const WorkspaceDetailsStep = ({ onContinue }: WorkspaceDetailsStepProps) => {
  const {
    register,
    control,
    formState: { errors },
  } = useFormContext<WorkspaceFormValues>();

  return (
    <>
      <h2 className="text-2xl font-bold">Workspace details</h2>
      <p className="mt-1 text-sm text-gray-500">Add some basic information about your workspace.</p>

      <form
        className="mt-7 space-y-6"
        onSubmit={(event) => {
          event.preventDefault();
          onContinue();
        }}
      >
        <div>
          <label htmlFor="workspace-name" className="mb-2 block text-sm font-semibold">
            Workspace Name <span className="text-red-500">*</span>
          </label>
          <Textbox
            id="workspace-name"
            icon={<FaBuilding />}
            placeholder="e.g. Acme Development Team"
            aria-invalid={Boolean(errors.workspaceName)}
            {...register("workspaceName", {
              required: "Workspace name is required.",
              validate: (value) => value.trim().length > 0 || "Workspace name is required.",
            })}
          />
          {errors.workspaceName ? (
            <p className="mt-2 text-xs text-red-500" role="alert">
              {errors.workspaceName.message}
            </p>
          ) : (
            <p className="mt-2 text-xs text-gray-500">This will be the name of your workspace.</p>
          )}
        </div>

        <div>
          <label htmlFor="workspace-description" className="mb-2 block text-sm font-semibold">
            Description <span className="font-normal text-gray-500">(optional)</span>
          </label>
          <Textarea
            id="workspace-description"
            icon={<FaAlignLeft />}
            placeholder="e.g. We build great products together."
            height={112}
            resizable={false}
            {...register("description")}
          />
          <p className="mt-2 text-xs text-gray-500">
            A short description to help your team understand the purpose of this workspace.
          </p>
        </div>

        <fieldset>
          <legend className="mb-3 text-sm font-semibold">Workspace Icon (optional)</legend>
          <Controller
            name="icon"
            control={control}
            render={({ field }) => (
              <div className="flex flex-wrap gap-5">
                {workspaceIconOptions.map((option) => (
                  <SelectableIconButton
                    key={option.id}
                    icon={option.icon}
                    label={option.label}
                    selected={field.value === option.id}
                    iconContainerClassName={option.className}
                    onClick={() => field.onChange(option.id)}
                  />
                ))}
              </div>
            )}
          />
          <p className="mt-3 text-xs text-gray-500">You can change this anytime in settings.</p>
        </fieldset>

        <StepNavigation isFirstStep isLastStep={false} submitNext />

        <button
          type="button"
          className="mx-auto block cursor-pointer text-sm text-gray-500 underline underline-offset-4 hover:text-gray-700"
        >
          Cancel
        </button>
      </form>
    </>
  );
};

export default WorkspaceDetailsStep;
