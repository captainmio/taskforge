import { getInitials } from "../../utils/getInitials";

interface InitialsAvatarProps {
  value: string;
  label?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizeClasses = {
  sm: "size-8 text-[11px]",
  md: "size-9 text-xs",
  lg: "size-12 text-sm",
} as const;

const colorClasses = [
  "bg-purple-100 text-purple-600",
  "bg-orange-100 text-orange-600",
  "bg-blue-100 text-blue-600",
  "bg-green-100 text-green-600",
  "bg-rose-100 text-rose-600",
  "bg-cyan-100 text-cyan-700",
  "bg-teal-100 text-teal-700",
  "bg-indigo-100 text-indigo-600",
  "bg-pink-100 text-pink-600",
  "bg-amber-100 text-amber-700",
  "bg-lime-100 text-lime-700",
] as const;

const InitialsAvatar = ({
  value,
  label = value,
  size = "md",
  className = "",
}: InitialsAvatarProps) => {
  // A stable character sum keeps the same person on the same color across renders.
  const colorIndex = [...value].reduce((total, character) => total + character.charCodeAt(0), 0);
  const colorClass = colorClasses[colorIndex % colorClasses.length];

  return (
    <span
      className={`flex shrink-0 items-center justify-center rounded-full font-semibold ring-2 ring-white ${sizeClasses[size]} ${colorClass} ${className}`}
      aria-label={label}
    >
      {getInitials(value)}
    </span>
  );
};

export default InitialsAvatar;
