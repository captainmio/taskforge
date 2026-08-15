import { useState } from "react";
import { FormProvider, useForm, type FieldPath } from "react-hook-form";
import { FaLock } from "react-icons/fa";
import InviteMembersStep from "../../components/workspaces/InviteMembersStep";
import StepNavigation from "../../components/workspaces/StepNavigation";
import WorkspaceDetailsStep from "../../components/workspaces/WorkspaceDetailsStep";
import Steps, { type StepItem } from "../../components/ui/Steps";
import { WorkspaceIcon, type WorkspaceFormValues } from "../../types/workspace";

const workspaceSteps = [
  { id: 1, label: "Workspace details" },
  { id: 2, label: "Invite members" },
  { id: 3, label: "Review" },
  { id: 4, label: "Done" },
] as const satisfies readonly StepItem[];

type WorkspaceStepId = (typeof workspaceSteps)[number]["id"];

const CreateWorkspace = () => {
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
  const isFirstStep = currentStepIndex === 0;
  const isLastStep = currentStepIndex === workspaceSteps.length - 1;

  // Dynamic invite paths ensure every visible email and role field is validated.
  const getCurrentStepFields = (): FieldPath<WorkspaceFormValues>[] => {
    if (currentStep === 1) return ["workspaceName"];

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

  const continueToNextStep = (): void => {
    void goToNextStep();
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
              <WorkspaceDetailsStep onContinue={continueToNextStep} />
            ) : currentStep === 2 ? (
              <InviteMembersStep
                onBack={goToPreviousStep}
                onSkip={advanceToNextStep}
                onContinue={continueToNextStep}
              />
            ) : (
              <div className="flex h-full flex-col">
                {/* Future steps can read this same form through useFormContext. */}
                <h2 className="text-2xl font-bold">{workspaceSteps[currentStepIndex].label}</h2>
                <p className="mt-2 text-sm text-gray-500">Temporary content for step {currentStep}.</p>

                <div className="mt-auto pt-10">
                  <StepNavigation
                    isFirstStep={isFirstStep}
                    isLastStep={isLastStep}
                    onBack={goToPreviousStep}
                    onNext={continueToNextStep}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Reserved for the workspace preview in a later step. */}
          <aside aria-hidden="true" className="hidden border-l border-gray-200 bg-green-50/30 lg:block" />
        </section>

        <p className="mt-6 flex items-center justify-center gap-2 text-xs text-gray-500 sm:text-sm">
          <FaLock className="size-4" aria-hidden="true" />
          You can always change these settings later.
        </p>
      </main>
    </FormProvider>
  );
};

export default CreateWorkspace;
