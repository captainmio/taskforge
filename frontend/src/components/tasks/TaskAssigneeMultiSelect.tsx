import { useEffect, useId, useRef, useState } from "react";
import { FaCheck, FaChevronDown, FaSearch, FaTimes } from "react-icons/fa";

export interface TaskAssignee {
  id: string;
  name: string;
  email: string;
}

interface TaskAssigneeMultiSelectProps {
  members: readonly TaskAssignee[];
  value: readonly TaskAssignee[];
  onChange: (members: TaskAssignee[]) => void;
  disabled?: boolean;
}

const TaskAssigneeMultiSelect = ({
  members,
  value,
  onChange,
  disabled = false,
}: TaskAssigneeMultiSelectProps) => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [query, setQuery] = useState<string>("");
  const containerRef = useRef<HTMLDivElement>(null);
  const searchId = useId();
  const selectedIds = new Set(value.map((member: { id: string }) => member.id));
  const visibleMembers = members.filter(
    (member: { name: string; email: string }) =>
      `${member.name} ${member.email}`
        .toLowerCase()
        .includes(query.trim().toLowerCase()),
  );

  useEffect(() => {
    const closeOnOutsideClick = (event: MouseEvent): void => {
      if (!containerRef.current?.contains(event.target as Node))
        setIsOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent): void => {
      if (event.key === "Escape") setIsOpen(false);
    };

    document.addEventListener("mousedown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("mousedown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, []);

  const toggleMember = (member: TaskAssignee): void => {
    onChange(
      selectedIds.has(member.id)
        ? value.filter(({ id }) => id !== member.id)
        : [...value, member],
    );
  };

  return (
    <div ref={containerRef} className="relative">
      <label className="block text-xs font-semibold text-gray-700">
        Assignee
      </label>
      <div className="mt-1.5 flex min-h-10 flex-wrap items-center gap-1.5 rounded-lg border border-gray-200 bg-white p-1.5 focus-within:border-site-green focus-within:ring-1 focus-within:ring-site-green">
        {value.map((member) => (
          <span
            key={member.id}
            className="inline-flex items-center gap-1 rounded-md bg-emerald-50 py-1 pl-1.5 pr-1 text-xs font-medium text-emerald-800"
          >
            <span
              className="flex size-4 items-center justify-center rounded-full bg-emerald-600 text-[8px] font-bold text-white"
              aria-hidden="true"
            >
              {member.name.slice(0, 2).toUpperCase()}
            </span>
            {member.name}
            <button
              type="button"
              disabled={disabled}
              onClick={() =>
                onChange(value.filter(({ id }) => id !== member.id))
              }
              aria-label={`Remove ${member.name}`}
              className="cursor-pointer rounded p-0.5 text-emerald-700 hover:bg-emerald-100"
            >
              <FaTimes className="size-2.5" aria-hidden="true" />
            </button>
          </span>
        ))}
        <button
          type="button"
          disabled={disabled}
          aria-expanded={isOpen}
          aria-controls={searchId}
          onClick={() => setIsOpen((current) => !current)}
          className="flex min-h-7 flex-1 cursor-pointer items-center justify-between gap-2 px-1.5 text-left text-xs text-gray-500"
        >
          <span>
            {disabled
              ? "Loading members..."
              : value.length === 0
                ? "Select members"
                : "Add member"}
          </span>
          <FaChevronDown className="size-3" aria-hidden="true" />
        </button>
      </div>
      {isOpen ? (
        <div
          id={searchId}
          className="absolute z-30 mt-1.5 w-full overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg"
        >
          <div className="border-b border-gray-100 p-2">
            <label className="relative block">
              <span className="sr-only">Search members</span>
              <FaSearch
                className="pointer-events-none absolute left-2.5 top-2.5 size-3 text-gray-400"
                aria-hidden="true"
              />
              <input
                autoFocus
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search members..."
                className="h-8 w-full rounded-md border border-gray-200 py-1.5 pl-8 pr-2 text-xs text-gray-900 outline-none focus:border-site-green focus:ring-1 focus:ring-site-green"
              />
            </label>
          </div>
          <ul
            className="max-h-48 overflow-y-auto p-1.5"
            aria-label="Workspace members"
          >
            {visibleMembers.length === 0 ? (
              <li className="px-2 py-4 text-center text-xs text-gray-500">
                No members found.
              </li>
            ) : (
              visibleMembers.map((member) => {
                const isSelected = selectedIds.has(member.id);
                return (
                  <li key={member.id}>
                    <button
                      type="button"
                      disabled={disabled}
                      onClick={() => toggleMember(member)}
                      className="flex w-full cursor-pointer items-center gap-2 rounded-md px-2 py-2 text-left hover:bg-emerald-50"
                    >
                      <span
                        className="flex size-6 shrink-0 items-center justify-center rounded-full bg-slate-700 text-[9px] font-bold text-white"
                        aria-hidden="true"
                      >
                        {member.name.slice(0, 2).toUpperCase()}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-xs font-medium text-gray-800">
                          {member.name}
                        </span>
                        <span className="block truncate text-[11px] text-gray-500">
                          {member.email}
                        </span>
                      </span>
                      <span
                        className={`flex size-4 items-center justify-center rounded border ${isSelected ? "border-site-green bg-site-green text-white" : "border-gray-300 bg-white"}`}
                      >
                        {isSelected ? (
                          <FaCheck className="size-2.5" aria-hidden="true" />
                        ) : null}
                      </span>
                    </button>
                  </li>
                );
              })
            )}
          </ul>
        </div>
      ) : null}
    </div>
  );
};

export default TaskAssigneeMultiSelect;
