import { useId, type ReactNode } from "react";

interface SectionCardProps {
  title: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}

const SectionCard = ({ title, action, children, className = "" }: SectionCardProps) => {
  const titleId = useId();

  return (
    <section
      aria-labelledby={titleId}
      className={`overflow-hidden rounded-xl border border-gray-200 bg-white ${className}`}
    >
      <header className="flex items-center justify-between gap-4 border-b border-gray-100 px-4 py-3">
        <h3 id={titleId} className="text-sm font-semibold text-gray-900">
          {title}
        </h3>
        {action}
      </header>
      <div className="p-4">{children}</div>
    </section>
  );
};

export default SectionCard;
