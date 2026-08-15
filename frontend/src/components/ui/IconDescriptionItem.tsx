import type { ReactNode } from "react";

interface IconDescriptionItemProps {
  icon: ReactNode;
  title: string;
  description: string;
  iconContainerClassName?: string;
}

const IconDescriptionItem = ({
  icon,
  title,
  description,
  iconContainerClassName = "bg-green-100 text-site-green",
}: IconDescriptionItemProps) => {
  return (
    <div className="flex items-start gap-4">
      <span
        aria-hidden="true"
        className={`flex size-10 shrink-0 items-center justify-center rounded-full [&>svg]:size-4 ${iconContainerClassName}`}
      >
        {icon}
      </span>
      <div className="min-w-0 pt-0.5">
        <h4 className="text-sm font-semibold text-gray-900">{title}</h4>
        <p className="mt-1 text-xs leading-5 text-gray-500">{description}</p>
      </div>
    </div>
  );
};

export default IconDescriptionItem;
