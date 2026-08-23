import { Controller, useForm, useWatch } from "react-hook-form";
import { FaCalendarAlt, FaCircle } from "react-icons/fa";
import { useEffect } from "react";
import Button from "../ui/Button";
import SectionCard from "../ui/SectionCard";
import Select from "../ui/Select";
import SelectableIconButton from "../ui/SelectableIconButton";
import Textarea from "../ui/Textarea";
import Textbox from "../ui/Textbox";
import {
  projectIconOptions,
  type ProjectIcon,
} from "./projectIconOptions";

export interface ProjectFormValues {
  projectName: string;
  description: string;
  icon: ProjectIcon;
  status: "planning" | "active" | "on-hold" | "completed";
  startDate: string;
  dueDate: string;
  defaultView: "list" | "board" | "calendar";
}

interface ProjectFormProps {
  onCancel: () => void;
  onSubmit?: (values: ProjectFormValues) => void | Promise<void>;
  defaultValues?: ProjectFormValues;
  submitLabel?: string;
}

const statusIconClassNames: Record<ProjectFormValues["status"], string> = {
  planning: "text-blue-500",
  active: "text-green-500",
  "on-hold": "text-amber-500",
  completed: "text-purple-500",
};

const ProjectForm = ({
  onCancel,
  onSubmit,
  defaultValues,
  submitLabel = "Create Project",
}: ProjectFormProps) => {
  const {
    register,
    control,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<ProjectFormValues>({
    defaultValues: defaultValues ?? {
      projectName: "",
      description: "",
      icon: "desktop",
      status: "planning",
      startDate: "",
      dueDate: "",
      defaultView: "list",
    },
  });
  const selectedStatus = useWatch({ control, name: "status" });
  const startDate = useWatch({ control, name: "startDate" });

  useEffect(() => {
    if (!startDate) setValue("dueDate", "");
  }, [setValue, startDate]);

  const submitForm = async (values: ProjectFormValues) => {
    await onSubmit?.(values);
  };

  return (
    <form className="mt-7 space-y-5" onSubmit={handleSubmit(submitForm)}>
      <SectionCard title="Project details" className="shadow-sm">
        <div className="space-y-6 mt-2">
          <div>
            <label htmlFor="project-name" className="mb-2 block text-base font-semibold text-gray-900">
              Project Name <span className="text-red-500">*</span>
            </label>
            <Textbox
              id="project-name"
              placeholder="e.g. Website Redesign"
              aria-invalid={Boolean(errors.projectName)}
              aria-describedby={errors.projectName ? "project-name-error" : undefined}
              {...register("projectName", {
                required: "Project name is required.",
                validate: (value) => value.trim().length > 0 || "Project name is required.",
                maxLength: {
                  value: 100,
                  message: "Project name must be 100 characters or fewer.",
                },
              })}
            />
            {errors.projectName ? (
              <p id="project-name-error" className="mt-2 text-xs text-red-500" role="alert">
                {errors.projectName.message}
              </p>
            ) : null}
          </div>

          <div>
            <label htmlFor="project-description" className="mb-2 block text-base font-semibold text-gray-900">
              Description
            </label>
            <Textarea
              id="project-description"
              placeholder="Describe the purpose, goals, and key details of this project..."
              height={112}
              resizable={false}
              aria-invalid={Boolean(errors.description)}
              aria-describedby={errors.description ? "project-description-error" : undefined}
              {...register("description", {
                maxLength: {
                  value: 500,
                  message: "Description must be 500 characters or fewer.",
                },
              })}
            />
            {errors.description ? (
              <p id="project-description-error" className="mt-2 text-xs text-red-500" role="alert">
                {errors.description.message}
              </p>
            ) : null}
          </div>

          <fieldset>
            <legend className="text-base font-semibold text-gray-900">Project Icon</legend>
            <p className="mt-1 text-xs text-gray-500">Choose an icon to represent your project.</p>
            <Controller
              name="icon"
              control={control}
              render={({ field }) => (
                <div className="mt-3 flex flex-wrap gap-5">
                  {projectIconOptions.map((option) => (
                    <SelectableIconButton
                      key={option.id}
                      icon={option.icon}
                      label={option.label}
                      title={option.label}
                      selected={field.value === option.id}
                      iconContainerClassName={option.className}
                      onClick={() => field.onChange(option.id)}
                    />
                  ))}
                </div>
              )}
            />
          </fieldset>

          <div className="grid gap-5 md:grid-cols-3">
            <div>
              <label htmlFor="project-status" className="mb-2 block text-base font-semibold text-gray-900">
                Status
              </label>
              <Select
                id="project-status"
                leadingIcon={<FaCircle className={statusIconClassNames[selectedStatus]} />}
                {...register("status")}
              >
                <option value="planning">Planning</option>
                <option value="active">Active</option>
                <option value="on-hold">On hold</option>
                <option value="completed">Completed</option>
              </Select>
            </div>

            <div>
              <label htmlFor="project-start-date" className="mb-2 block text-base font-semibold text-gray-900">
                Start Date <span className="font-normal text-gray-500">(optional)</span>
              </label>
              <Textbox
                id="project-start-date"
                type="date"
                icon={<FaCalendarAlt />}
                {...register("startDate")}
              />
            </div>

            <div>
              <label htmlFor="project-due-date" className="mb-2 block text-base font-semibold text-gray-900">
                Due Date <span className="font-normal text-gray-500">(optional)</span>
              </label>
              <Textbox
                id="project-due-date"
                type="date"
                icon={<FaCalendarAlt />}
                min={startDate || undefined}
                disabled={!startDate}
                className="disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-500"
                aria-invalid={Boolean(errors.dueDate)}
                aria-describedby={errors.dueDate ? "project-due-date-error" : undefined}
                {...register("dueDate", {
                  validate: (dueDate, values) =>
                    !dueDate ||
                    !values.startDate ||
                    dueDate >= values.startDate ||
                    "Due date cannot be earlier than the start date.",
                })}
              />
              {errors.dueDate ? (
                <p id="project-due-date-error" className="mt-2 text-xs text-red-500" role="alert">
                  {errors.dueDate.message}
                </p>
              ) : null}
            </div>
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Project settings" className="shadow-sm">

        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label htmlFor="project-default-view" className="mb-2 block text-base font-semibold text-gray-900">
              Default View
            </label>
            <Select id="project-default-view" {...register("defaultView")}>
              <option value="list">List View</option>
              <option value="board">Board View</option>
              <option value="calendar">Calendar View</option>
            </Select>
            <p className="mt-2 text-xs text-gray-500">Choose how tasks will be displayed by default.</p>
          </div>
        </div>
      </SectionCard>

      <div className="flex justify-end gap-3 pt-2">
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Saving…" : submitLabel}
        </Button>
      </div>
    </form>
  );
};

export default ProjectForm;
