import { forwardRef, type InputHTMLAttributes, type ReactNode } from "react";

// Extending the native input props lets callers pass attributes such as
// type, name, placeholder, disabled, and onChange without redefining them.
interface TextboxProps extends InputHTMLAttributes<HTMLInputElement> {
    icon?: ReactNode;
}

const Textbox = forwardRef<HTMLInputElement, TextboxProps>(
  ({ className = "", icon, ...inputProps }, ref) => {
    // Inputs with an icon need extra left padding so text does not overlap it.
    const inputClassName = icon
      ? "block h-10 w-full rounded-md border-0 py-3 pl-10 pr-3 text-gray-900 ring-1 ring-inset ring-gray-300"
      : "block h-10 w-full rounded border border-gray-300 px-3 py-3 text-gray-900";

    return (
      <div className="relative">
        {icon && (
          <span
            aria-hidden="true"
            // A 20px icon is visually balanced inside the 40px-high input.
            className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-gray-400"
          >
            <span className="flex size-5 items-center justify-center [&>svg]:size-5">
              {icon}
            </span>
          </span>
        )}

        <input
          ref={ref}
          {...inputProps}
          className={`${inputClassName} ${className}`}
        />
      </div>
    );
  }
);

// Helps React DevTools show a useful name for this forwardRef component.
Textbox.displayName = "Textbox";

export default Textbox;
