import { useId, type ReactNode } from "react";

interface SectionCardProps {
  title?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}

const SectionCard = ({ title = "", action, children, className = "" }: SectionCardProps) => {
  const titleId = useId();

  return (
    <section
      aria-labelledby={title ? titleId : undefined}
      className={`overflow-hidden rounded-xl border border-gray-200 bg-white text-gray-900 ${className}`}
    >
      {title ? (
        <header className="flex items-center justify-between gap-4 border-b border-emerald-200 bg-emerald-100/70 px-4 py-3">
          <h2 id={titleId} className="text-xl font-semibold text-green-800">
            {title}
          </h2>
          {action}
        </header>
      ) : null}
      <div className={title ? "p-4 pl-6" : "p-4"}>{children}</div>
    </section>
  );
};

export default SectionCard;
