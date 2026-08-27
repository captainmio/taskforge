import type { ButtonHTMLAttributes } from "react";

const SubmitButton = ({
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) => {
  const { children, className, type = "submit" } = props;
  return (
    <button
      {...props}
      type={type}
      className={`disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none ${className}`}
    >
      {children}
    </button>
  );
};

export default SubmitButton;
