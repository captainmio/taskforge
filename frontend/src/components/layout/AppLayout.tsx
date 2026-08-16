import { useState, type ReactNode } from "react";
import { FaBars, FaTimes } from "react-icons/fa";
import AppFooter from "../ui/AppFooter";

interface AppLayoutProps {
  sidebar: ReactNode;
  children: ReactNode;
}

const AppLayout = ({ sidebar, children }: AppLayoutProps) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-slate-50 to-emerald-50/70 text-gray-900">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 border-r border-gray-200 lg:block">
        {sidebar}
      </aside>

      <div className="flex h-16 items-center border-b border-gray-200 bg-white px-4 lg:hidden">
        <button
          type="button"
          onClick={() => setIsSidebarOpen(true)}
          aria-label="Open navigation"
          className="flex size-10 items-center justify-center rounded-lg text-gray-600 hover:bg-gray-100"
        >
          <FaBars aria-hidden="true" />
        </button>
        <span className="ml-3 font-bold text-gray-950">TaskForge</span>
      </div>

      {isSidebarOpen ? (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-gray-950/30"
            aria-label="Close navigation"
            onClick={() => setIsSidebarOpen(false)}
          />
          <aside className="relative h-full w-72 max-w-[85vw] border-r border-gray-200 bg-white shadow-xl">
            <button
              type="button"
              aria-label="Close navigation"
              onClick={() => setIsSidebarOpen(false)}
              className="absolute right-3 top-4 z-10 flex size-9 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100"
            >
              <FaTimes aria-hidden="true" />
            </button>
            {sidebar}
          </aside>
        </div>
      ) : null}

      <div className="flex min-h-screen flex-col lg:ml-60">
        <main className="flex-1">{children}</main>
        <AppFooter className="border-t border-emerald-100 bg-white/60" />
      </div>
    </div>
  );
};

export default AppLayout;
