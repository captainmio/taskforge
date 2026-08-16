import type { ReactNode } from "react";

interface StatCardProps {
  icon: ReactNode;
  label: string;
  value: string | number;
  iconClassName?: string;
}

const StatCard = ({
  icon,
  label,
  value,
  iconClassName = "bg-emerald-50 text-site-green ring-emerald-100",
}: StatCardProps) => (
  <article className="group relative overflow-hidden rounded-xl border border-gray-200 bg-gradient-to-br from-white to-gray-50/80 p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:border-gray-300 hover:shadow-md">
    <div className="flex items-center justify-between gap-4">
      <div className="min-w-0">
        <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">{label}</p>
        <p className="mt-2 text-3xl font-bold tracking-tight text-gray-950">{value}</p>
      </div>
      <span
        aria-hidden="true"
        className={`flex size-11 shrink-0 items-center justify-center rounded-xl ring-1 [&>svg]:size-5 ${iconClassName}`}
      >
        {icon}
      </span>
    </div>
    <span className="absolute inset-x-0 bottom-0 h-0.5 origin-left scale-x-0 bg-site-green transition-transform group-hover:scale-x-100" />
  </article>
);

export default StatCard;
