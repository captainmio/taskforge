import {
  forwardRef,
  type CSSProperties,
  type ReactNode,
  type TextareaHTMLAttributes,
} from "react";

// Native textarea attributes remain available alongside the custom visual props.
interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  icon?: ReactNode;
  resizable?: boolean;
  height?: CSSProperties["height"];
}

const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  (
    {
      className = "",
      icon,
      resizable = true,
      height,
      style,
      ...textareaProps
    },
    ref
  ) => {
    // The icon variant adds left padding so entered text stays clear of the icon.
    const spacingClassName = icon ? "pl-10 pr-3" : "px-3";
    const resizeClassName = resizable ? "resize" : "resize-none";

    return (
      <div className="relative">
        {icon && (
          <span
            aria-hidden="true"
            // Match Textbox with a 20px icon and 12px inset from the edges.
            className="pointer-events-none absolute left-3 top-3 text-gray-400"
          >
            <span className="flex size-5 items-center justify-center [&>svg]:size-5">
              {icon}
            </span>
          </span>
        )}

        <textarea
          ref={ref}
          {...textareaProps}
          // Custom height is merged with any other inline styles supplied by the caller.
          style={{ ...style, height: height ?? style?.height }}
          className={`block min-h-24 w-full rounded border border-gray-300 py-3 text-gray-900 ${spacingClassName} ${resizeClassName} ${className}`}
        />
      </div>
    );
  }
);

// Helps React DevTools show a useful name for this forwardRef component.
Textarea.displayName = "Textarea";

export default Textarea;
