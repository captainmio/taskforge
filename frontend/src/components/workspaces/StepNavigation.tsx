import { FaArrowLeft, FaArrowRight } from "react-icons/fa";
import SubmitButton from "../ui/SubmitButton";

interface StepNavigationProps {
  isFirstStep: boolean;
  isLastStep: boolean;
  submitNext?: boolean;
  nextLabel?: string;
  isNextDisabled?: boolean;
  onBack?: () => void;
  onNext?: () => void;
}

const StepNavigation = ({
  isFirstStep,
  isLastStep,
  submitNext = false,
  nextLabel = "Next",
  isNextDisabled = false,
  onBack,
  onNext,
}: StepNavigationProps) => (
  <div className="flex gap-3">
    {!isFirstStep && (
      <button
        type="button"
        onClick={onBack}
        className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg border border-gray-300 px-4 py-3 font-semibold text-gray-700 transition-colors hover:bg-gray-50"
      >
        <FaArrowLeft className="size-4" aria-hidden="true" />
        Back
      </button>
    )}

    {!isLastStep && (
      <SubmitButton
        type={submitNext ? "submit" : "button"}
        onClick={submitNext ? undefined : onNext}
        disabled={isNextDisabled}
        className="flex flex-1 cursor-pointer items-center justify-center gap-3 rounded-lg bg-site-green px-4 py-3 font-semibold text-white transition-colors hover:bg-green-700"
      >
        {nextLabel}
        <FaArrowRight className="size-4" aria-hidden="true" />
      </SubmitButton>
    )}
  </div>
);

export default StepNavigation;
