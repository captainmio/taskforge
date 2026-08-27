import type { ButtonHTMLAttributes, ReactNode } from "react";
import { FaChevronRight } from "react-icons/fa";

interface ActionCardProps extends Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  "children"
> {
  icon: ReactNode;
  title: string;
  description: string;
  iconContainerClassName?: string;
}

const ActionCard = ({
  icon,
  title,
  description,
  iconContainerClassName = "bg-green-50 text-site-green",
  className = "",
  type = "button",
  ...buttonProps
}: ActionCardProps) => {
  return (
    <button
      {...buttonProps}
      type={type}
      className={`flex w-full items-center gap-4 rounded-xl border border-gray-200 bg-white p-4 text-left transition-colors hover:border-site-green hover:bg-green-50/30 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-site-green disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:border-gray-200 disabled:hover:bg-white ${className}`}
    >
      {/* Action icons use the app's recommended 20px size. */}
      <span
        aria-hidden="true"
        className={`flex size-10 shrink-0 items-center justify-center rounded-lg [&>svg]:size-5 ${iconContainerClassName}`}
      >
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold text-gray-900">
          {title}
        </span>
        <span className="mt-1 block text-xs leading-5 text-gray-500">
          {description}
        </span>
      </span>
      <FaChevronRight
        className="size-3 shrink-0 text-gray-400"
        aria-hidden="true"
      />
    </button>
  );
};

export default ActionCard;
