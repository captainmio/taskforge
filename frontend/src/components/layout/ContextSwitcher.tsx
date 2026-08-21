import { FaChevronDown } from "react-icons/fa";
import type { JoinedWorkspace } from "../../services/auth";
import { getInitials } from "../../utils/getInitials";
import DropdownMenu from "../ui/DropdownMenu";

interface ContextSwitcherProps {
  name: string;
  initials: string;
  onClick?: () => void;
  workspaces?: readonly JoinedWorkspace[];
  currentWorkspaceId?: number;
  onWorkspaceChange?: (workspaceId: number) => void;
}

const switcherClassName =
  "flex w-full items-center gap-3 rounded-lg border border-gray-200 bg-white p-2.5 text-left shadow-sm transition-colors hover:border-gray-300 hover:bg-gray-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-site-green cursor-pointer";

const switcherContent = (name: string, initials: string, isOpen = false) => (
  <>
    <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-400 to-site-green text-xs font-bold text-white">
      {initials}
    </span>
    <span className="min-w-0 flex-1 truncate text-sm font-semibold text-gray-800">{name}</span>
    <FaChevronDown
      className={`size-2.5 shrink-0 text-gray-400 transition-transform ${isOpen ? "rotate-180" : ""}`}
      aria-hidden="true"
    />
  </>
);

const ContextSwitcher = ({
  name,
  initials,
  onClick,
  workspaces,
  currentWorkspaceId,
  onWorkspaceChange,
}: ContextSwitcherProps) => {
  if (!workspaces || !onWorkspaceChange) {
    return (
      <button type="button" onClick={onClick} className={switcherClassName}>
        {switcherContent(name, initials)}
      </button>
    );
  }

  return (
    <DropdownMenu
      align="left"
      containerClassName="w-full"
      triggerClassName={switcherClassName}
      trigger={(isOpen) => switcherContent(name, initials, isOpen)}
    >
      {(close) => (
        <div className="space-y-1">
          {workspaces.length > 0 ? workspaces.map((workspace) => {
            const isCurrent = workspace.id === currentWorkspaceId;

            return (
              <button
                key={workspace.id}
                type="button"
                role="menuitem"
                aria-current={isCurrent ? "page" : undefined}
                onClick={() => {
                  onWorkspaceChange(workspace.id);
                  close();
                }}
                className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm transition-colors ${isCurrent ? "bg-green-50 font-semibold text-green-800" : "text-gray-700 hover:bg-gray-50"}`}
              >
                <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-site-green text-[10px] font-bold text-white">
                  {getInitials(workspace.name)}
                </span>
                <span className="min-w-0 flex-1 truncate">{workspace.name}</span>
                {isCurrent ? (
                  <span className="text-[10px] font-bold uppercase tracking-wide text-site-green">
                    Current
                  </span>
                ) : null}
              </button>
            );
          }) : (
            <p className="px-3 py-2 text-sm text-gray-500">No joined workspaces</p>
          )}
        </div>
      )}
    </DropdownMenu>
  );
};

export default ContextSwitcher;
