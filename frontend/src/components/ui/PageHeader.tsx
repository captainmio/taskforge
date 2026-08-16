import type { ReactNode } from "react";

interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: ReactNode;
}

const PageHeader = ({ title, description, actions }: PageHeaderProps) => (
  <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
    <div className="order-2 sm:order-1">
      <h1 className="text-2xl font-bold tracking-tight text-gray-950 sm:text-3xl">{title}</h1>
      {description ? <p className="mt-1.5 text-sm text-gray-500">{description}</p> : null}
    </div>
    {actions ? (
      <div className="order-1 flex w-full items-center justify-between gap-3 sm:order-2 sm:w-auto sm:shrink-0 sm:justify-start">
        {actions}
      </div>
    ) : null}
  </header>
);

export default PageHeader;
