import type { ButtonHTMLAttributes, ReactNode } from "react";

const variants = {
  primary: "border-site-green bg-site-green text-white hover:bg-green-700",
  outline: "border-green-200 bg-white text-green-700 hover:border-site-green hover:bg-green-50",
  ghost: "border-transparent bg-transparent text-gray-600 hover:bg-gray-100 hover:text-gray-900",
  danger: "border-red-200 bg-white text-red-600 hover:border-red-300 hover:bg-red-50",
} as const;

const sizes = {
  sm: "min-h-9 px-3 py-2 text-xs",
  md: "min-h-10 px-4 py-2.5 text-sm",
} as const;

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: keyof typeof variants;
  size?: keyof typeof sizes;
  leadingIcon?: ReactNode;
}

const Button = ({
  variant = "primary",
  size = "md",
  leadingIcon,
  className = "",
  type = "button",
  children,
  ...buttonProps
}: ButtonProps) => (
  <button
    {...buttonProps}
    type={type}
    className={`inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg border font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-site-green disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 ${variants[variant]} ${sizes[size]} ${className}`}
  >
    {leadingIcon ? <span aria-hidden="true">{leadingIcon}</span> : null}
    {children}
  </button>
);

export default Button;
