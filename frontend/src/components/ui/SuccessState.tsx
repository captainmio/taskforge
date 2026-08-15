import { FaCheck } from "react-icons/fa";

interface SuccessStateProps {
  title: string;
  description: string;
}

const SuccessState = ({ title, description }: SuccessStateProps) => {
  return (
    <div className="text-center">
      <div className="relative mx-auto w-fit">
        {/* Lightweight decorative dots avoid requiring an illustration package. */}
        <span className="absolute -left-5 top-2 size-2 rounded-full bg-amber-400" aria-hidden="true" />
        <span className="absolute -right-6 top-0 size-2 rounded-full bg-purple-400" aria-hidden="true" />
        <span className="absolute -left-7 bottom-1 size-1.5 rounded-full bg-blue-400" aria-hidden="true" />
        <span className="absolute -right-4 bottom-0 size-1.5 rounded-full bg-rose-400" aria-hidden="true" />
        <span className="flex size-20 items-center justify-center rounded-full bg-green-100 ring-8 ring-green-50">
          <span className="flex size-14 items-center justify-center rounded-full bg-site-green text-white shadow-md">
            <FaCheck className="size-6" aria-hidden="true" />
          </span>
        </span>
      </div>

      <h2 className="mt-7 text-2xl font-bold text-gray-900">{title}</h2>
      <p className="mt-2 text-sm text-gray-500">{description}</p>
    </div>
  );
};

export default SuccessState;
