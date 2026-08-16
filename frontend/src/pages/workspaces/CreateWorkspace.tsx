import { useState } from "react";
import { FormProvider, useForm, type FieldPath } from "react-hook-form";
import { useNavigate } from "react-router";
import InviteMembersStep from "../../components/workspaces/InviteMembersStep";
import WorkspaceDoneStep from "../../components/workspaces/WorkspaceDoneStep";
import WorkspaceDetailsStep from "../../components/workspaces/WorkspaceDetailsStep";
import WorkspaceLivePreview from "../../components/workspaces/WorkspaceLivePreview";
import WorkspaceNextActions from "../../components/workspaces/WorkspaceNextActions";
import WorkspaceReviewStep from "../../components/workspaces/WorkspaceReviewStep";
import Steps, { type StepItem } from "../../components/ui/Steps";
import { createWorkspace as createWorkspaceRequest } from "../../services/workspaces";
import { WorkspaceIcon, type WorkspaceFormValues } from "../../types/workspace";
import { applyApiValidationErrors } from "../../utils/apiError";
import { createWorkspacePayload } from "./utils/workspaceForm";

const workspaceSteps = [
  { id: 1, label: "Workspace details" },
  { id: 2, label: "Invite members" },
  { id: 3, label: "Review" },
  { id: 4, label: "Done" },
] as const satisfies readonly StepItem[];

type WorkspaceStepId = (typeof workspaceSteps)[number]["id"];

const CreateWorkspace = () => {
  const navigate = useNavigate();
  const currentYear = new Date().getFullYear();
  const [currentStep, setCurrentStep] = useState<WorkspaceStepId>(1);
  const formMethods = useForm<WorkspaceFormValues>({
    defaultValues: {
      workspaceName: "",
      description: "",
      icon: WorkspaceIcon.CODE,
      invites: [{ email: "", role: "" }],
    },
    mode: "onTouched",
    shouldUnregister: false,
  });

  const currentStepIndex = workspaceSteps.findIndex((step) => step.id === currentStep);

  // Dynamic invite paths ensure every visible email and role field is validated.
  const getCurrentStepFields = (): FieldPath<WorkspaceFormValues>[] => {
    if (currentStep === 1) return ["workspaceName", "description"];

    if (currentStep === 2) {
      return formMethods.getValues("invites").flatMap((_, index) => [
        `invites.${index}.email` as const,
        `invites.${index}.role` as const,
      ]);
    }

    return [];
  };

  const advanceToNextStep = (): void => {
    const nextStep = workspaceSteps[currentStepIndex + 1];
    if (nextStep) setCurrentStep(nextStep.id);
  };

  const goToNextStep = async (): Promise<void> => {
    const fieldsToValidate = getCurrentStepFields();
    const isStepValid =
      fieldsToValidate.length === 0 ||
      (await formMethods.trigger(fieldsToValidate, { shouldFocus: true }));

    if (!isStepValid) return;
    advanceToNextStep();
  };

  const goToPreviousStep = (): void => {
    const previousStep = workspaceSteps[currentStepIndex - 1];
    if (previousStep) setCurrentStep(previousStep.id);
  };

  const goToStep = (step: WorkspaceStepId): void => {
    setCurrentStep(step);
  };

  const continueToNextStep = (): void => {
    void goToNextStep();
  };

  const submitWorkspace = (): void => {
    void formMethods.handleSubmit(async (values) => {
      try {
        await createWorkspaceRequest(createWorkspacePayload(values));
        advanceToNextStep();
      } catch (error: unknown) {
        const errorFields = applyApiValidationErrors(error, formMethods.setError);

        if (errorFields.some((field) => field.startsWith("invites."))) {
          goToStep(2);
        } else if (errorFields.length > 0) {
          goToStep(1);
        }
      }
    })();
  };

  return (
    <FormProvider {...formMethods}>
      <main className="min-h-screen bg-slate-50 px-4 py-8 text-gray-900 sm:px-6 lg:py-10">
        <header className="mx-auto max-w-3xl text-center">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Create Your Workspace</h1>
          <p className="mt-2 text-sm text-gray-500 sm:text-base">
            Set up your workspace to get started with managing your projects.
          </p>
        </header>

        <div className="mx-auto mt-8 max-w-6xl px-2 sm:px-6">
          <Steps steps={workspaceSteps} currentStep={currentStep} />
        </div>

        <section className="mx-auto mt-8 grid max-w-6xl overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-lg lg:min-h-[620px] lg:grid-cols-2">
          <div className="p-6 sm:p-8 lg:p-10">
            {currentStep === 1 ? (
              <WorkspaceDetailsStep
                onContinue={continueToNextStep}
                onCancel={() => navigate("/dashboard")}
              />
            ) : currentStep === 2 ? (
              <InviteMembersStep
                onBack={goToPreviousStep}
                onSkip={advanceToNextStep}
                onContinue={continueToNextStep}
              />
            ) : currentStep === 3 ? (
              <WorkspaceReviewStep
                onEditDetails={() => goToStep(1)}
                onEditInvites={() => goToStep(2)}
                onBack={goToPreviousStep}
                onCreateWorkspace={submitWorkspace}
                isCreating={formMethods.formState.isSubmitting}
              />
            ) : (
              <WorkspaceDoneStep
                onGoToWorkspace={() => navigate("/dashboard")}
              />
            )}
          </div>

          <aside className="border-t border-gray-200 bg-green-50/30 p-6 sm:p-8 lg:border-l lg:border-t-0 lg:p-10">
            {currentStep < 4 ? (
              <WorkspaceLivePreview />
            ) : (
              <WorkspaceNextActions />
            )}
          </aside>
        </section>

        <footer className="mt-6 text-center text-xs text-gray-500 sm:text-sm">
          &copy; {currentYear} Taskforge. All rights reserved.
        </footer>
      </main>
    </FormProvider>
  );
};

export default CreateWorkspace;
