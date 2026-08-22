import {
  forwardRef,
  type ReactNode,
  type SelectHTMLAttributes,
} from "react";
import { FaChevronDown } from "react-icons/fa";

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  leadingIcon?: ReactNode;
}

const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className = "", leadingIcon, children, ...selectProps }, ref) => {
    const spacingClassName = leadingIcon ? "pl-10" : "pl-3";

    return (
      <div className="relative">
        {leadingIcon ? (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-gray-400"
          >
            <span className="flex size-4 items-center justify-center [&>svg]:size-4">
              {leadingIcon}
            </span>
          </span>
        ) : null}

        <select
          ref={ref}
          {...selectProps}
          className={`block h-10 w-full appearance-none rounded border border-gray-300 bg-white py-2 pr-9 text-sm text-gray-900 focus:border-site-green focus:outline-none focus:ring-1 focus:ring-site-green disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-500 ${spacingClassName} ${className}`}
        >
          {children}
        </select>

        <FaChevronDown
          aria-hidden="true"
          className="pointer-events-none absolute right-3 top-1/2 size-3 -translate-y-1/2 text-gray-400"
        />
      </div>
    );
  },
);

Select.displayName = "Select";

export default Select;
