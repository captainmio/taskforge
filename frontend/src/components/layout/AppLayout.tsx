import { useState, type ReactNode } from "react";
import { FaBars, FaTimes } from "react-icons/fa";
import { Outlet, useParams } from "react-router";
import { useAuthenticatedSession } from "../../hooks/useAuthenticatedSession";
import AppFooter from "../ui/AppFooter";
import AppSidebar from "./AppSidebar";

interface AppLayoutProps {
  sidebar?: ReactNode;
  children?: ReactNode;
}

const AppLayout = ({ sidebar, children }: AppLayoutProps) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false);
  const session = useAuthenticatedSession();
  const { id: workspaceId } = useParams();
  const workspaces = session?.workspaces ?? [];
  const activeWorkspace =
    workspaces.find((workspace) => workspace.id === Number(workspaceId)) ??
    workspaces[0];
  const sidebarContent = sidebar ?? (
    <AppSidebar
      workspaceName={activeWorkspace?.name ?? "No workspace"}
      workspaces={workspaces}
      currentWorkspaceId={activeWorkspace?.id}
      onWorkspaceChange={() => setIsSidebarOpen(false)}
    />
  );
  const pageContent = children ?? <Outlet context={session} />;

  return (
    <div className="min-h-screen overflow-x-clip bg-gradient-to-br from-slate-50 via-slate-50 to-emerald-50/70 text-gray-900">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-70 border-r border-gray-200 lg:block">
        {sidebarContent}
      </aside>

      <div className="flex h-16 items-center border-b border-gray-200 bg-white px-4 lg:hidden">
        <button
          type="button"
          onClick={() => setIsSidebarOpen(true)}
          aria-label="Open navigation"
          aria-expanded={isSidebarOpen}
          className="flex size-10 items-center justify-center rounded-lg text-gray-600 hover:bg-gray-100"
        >
          <FaBars aria-hidden="true" />
        </button>
        <div className="ml-3 w-full flex items-center">
          <img
            className="size-9 shrink-0"
            src="/project-icon-tasks.svg"
            alt="TaskForge"
          />
          <span className="ml-2 font-bold text-gray-950">TaskForge</span>
        </div>
      </div>

      {isSidebarOpen ? (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-gray-950/30"
            aria-label="Close navigation"
            onClick={() => setIsSidebarOpen(false)}
          />
          <aside className="relative h-full w-70 max-w-[calc(100vw-3rem)] overflow-y-auto border-r border-gray-200 bg-white shadow-xl">
            <button
              type="button"
              aria-label="Close navigation"
              onClick={() => setIsSidebarOpen(false)}
              className="absolute right-3 top-4 z-10 flex size-9 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100"
            >
              <FaTimes aria-hidden="true" />
            </button>
            {sidebarContent}
          </aside>
        </div>
      ) : null}

      <div className="flex min-h-screen min-w-0 flex-col lg:ml-70">
        <main className="min-w-0 flex-1">{pageContent}</main>
        <AppFooter className="border-t border-emerald-100 bg-white/60" />
      </div>
    </div>
  );
};

export default AppLayout;
