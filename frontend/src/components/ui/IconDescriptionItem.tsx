import type { ReactNode } from "react";

interface IconDescriptionItemProps {
  icon: ReactNode;
  title: string;
  description?: string;
  trailing?: ReactNode;
  iconContainerClassName?: string;
  className?: string;
}

const IconDescriptionItem = ({
  icon,
  title,
  description,
  trailing,
  iconContainerClassName = "bg-green-100 text-site-green",
  className = "",
}: IconDescriptionItemProps) => {
  return (
    <div className={`flex items-center gap-4 ${className}`}>
      <span
        aria-hidden="true"
        className={`flex size-10 shrink-0 items-center justify-center rounded-full [&>svg]:size-4 ${iconContainerClassName}`}
      >
        {icon}
      </span>
      <div className="min-w-0 flex-1 pt-0.5">
        <h4 className="truncate text-sm font-semibold text-gray-900">{title}</h4>
        {description ? (
          <p className="mt-1 text-xs leading-5 text-gray-500">{description}</p>
        ) : null}
      </div>
      {trailing ? <span className="shrink-0 text-gray-400">{trailing}</span> : null}
    </div>
  );
};

export default IconDescriptionItem;
