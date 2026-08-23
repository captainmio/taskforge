import type { ReactNode } from "react";

const badgeVariants = {
  blue: "border-blue-200 bg-blue-50 text-blue-700",
  green: "border-green-200 bg-green-50 text-green-700",
  purple: "border-purple-200 bg-purple-50 text-purple-700",
  orange: "border-orange-200 bg-orange-50 text-orange-700",
  gray: "border-gray-200 bg-gray-50 text-gray-600",
} as const;

export type BadgeVariant = keyof typeof badgeVariants;

interface BadgeProps {
  children: ReactNode;
  variant?: BadgeVariant;
}

const Badge = ({ children, variant = "gray" }: BadgeProps) => {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium ${badgeVariants[variant]}`}
    >
      {children}
    </span>
  );
};

export default Badge;
