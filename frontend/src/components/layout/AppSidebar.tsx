import type { ReactNode } from "react";

interface AppSidebarProps {
  contextLabel?: string;
  contextSwitcher: ReactNode;
  navigation: ReactNode;
  secondaryAction?: ReactNode;
}

const AppSidebar = ({
  contextLabel = "Workspace",
  contextSwitcher,
  navigation,
  secondaryAction,
}: AppSidebarProps) => (
  <div className="flex h-full flex-col bg-gradient-to-b from-white via-white to-emerald-50/70">
    <div className="flex h-18 items-center gap-2 border-b border-gray-100 px-6">
      <img className="size-9 shrink-0" src="/project-icon-tasks.svg" alt="TaskForge" />
      <span className="text-lg font-bold tracking-tight text-gray-950">TaskForge</span>
    </div>

    <div className="px-5 pt-6">
      <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-gray-400">{contextLabel}</p>
      {contextSwitcher}
    </div>

    <nav className="mt-5 space-y-1 px-4" aria-label="Primary navigation">
      {navigation}
    </nav>

    {secondaryAction ? (
      <div className="mt-5 border-t border-gray-100 px-4 pt-4">{secondaryAction}</div>
    ) : null}
  </div>
);

export default AppSidebar;
