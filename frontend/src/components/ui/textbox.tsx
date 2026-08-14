import { type InputHTMLAttributes, type ReactNode } from "react";

interface Textbox extends InputHTMLAttributes<HTMLInputElement> {
    className?: string;
    icon?: ReactNode
}

const Textbox = (props: Textbox) => {
    const { className = "", icon, ...inputProps } = props;

    const classNameValue = !icon
        ? "block h-10 w-full rounded border border-gray-300 px-3 py-3 text-gray-900"
        : "block h-10 w-full rounded-md border-0 pl-10 pr-3 py-3 text-gray-900 ring-1 ring-inset ring-gray-300";

    return (
        <div className="relative">

            {icon && (
                <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">
                {icon}
                </span>
            )}
            <input
                {...inputProps}
                className={`${classNameValue} ${className}`} />

        </div>
    )
}

export default Textbox
