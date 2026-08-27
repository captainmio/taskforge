import { FaCheck } from "react-icons/fa";

export interface StepItem {
  id: number;
  label: string;
}

interface StepsProps {
  steps: readonly StepItem[];
  currentStep: number;
}

const Steps = ({ steps, currentStep }: StepsProps) => {
  return (
    <ol
      className="grid"
      style={{ gridTemplateColumns: `repeat(${steps.length}, minmax(0, 1fr))` }}
      aria-label="Workspace creation progress"
    >
      {steps.map((step, index) => {
        const isActive = step.id === currentStep;
        const isCompleted = step.id < currentStep;

        return (
          <li
            key={step.id}
            className="relative flex flex-col items-center text-center"
          >
            {/* The connector begins after one circle and ends before the next one. */}
            {index < steps.length - 1 && (
              <span
                aria-hidden="true"
                className={`absolute left-[calc(50%+1.25rem)] top-4 h-px w-[calc(100%-2.5rem)] ${
                  isCompleted ? "bg-site-green" : "bg-gray-300"
                }`}
              />
            )}

            <span
              aria-current={isActive ? "step" : undefined}
              className={`relative z-10 flex size-8 items-center justify-center rounded-full border text-sm font-semibold ${
                isActive || isCompleted
                  ? "border-site-green bg-site-green text-white"
                  : "border-gray-400 bg-white text-gray-500"
              }`}
            >
              {isCompleted ? (
                <FaCheck className="size-3" aria-hidden="true" />
              ) : (
                step.id
              )}
            </span>

            <span
              className={`mt-3 text-xs font-medium sm:text-sm ${
                isActive || isCompleted ? "text-site-green" : "text-gray-500"
              }`}
            >
              {step.label}
            </span>
          </li>
        );
      })}
    </ol>
  );
};

export default Steps;
