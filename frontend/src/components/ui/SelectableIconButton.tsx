import { FaCheck } from "react-icons/fa";
import type { ButtonHTMLAttributes, ReactNode } from "react";

// Native button attributes remain available alongside the selection-specific props.
interface SelectableIconButtonProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> {
  icon: ReactNode;
  label: string;
  selected?: boolean;
  iconContainerClassName?: string;
}

const SelectableIconButton = ({
  icon,
  label,
  selected = false,
  iconContainerClassName = "",
  className = "",
  type = "button",
  ...buttonProps
}: SelectableIconButtonProps) => {
  return (
    <button
      {...buttonProps}
      type={type}
      aria-label={label}
      // aria-pressed exposes this controlled selection state to assistive technology.
      aria-pressed={selected}
      className={`cursor-pointer relative flex size-16 items-center justify-center rounded-lg border-2 bg-white transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-site-green disabled:cursor-not-allowed disabled:opacity-50 ${
        selected ? "border-site-green" : "border-gray-200"
      } ${className}`}
    >
      {selected && (
        <span className="absolute -right-2 -top-2 flex size-5 items-center justify-center rounded-full bg-site-green text-white">
          <FaCheck className="size-3" aria-hidden="true" />
        </span>
      )}

      {/* Keep option icons at the recommended 20px size for visual consistency. */}
      <span
        aria-hidden="true"
        className={`flex size-12 items-center justify-center rounded-md [&>svg]:size-5 ${iconContainerClassName}`}
      >
        {icon}
      </span>
    </button>
  );
};

export default SelectableIconButton;
