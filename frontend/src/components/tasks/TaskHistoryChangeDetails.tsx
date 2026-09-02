import { useState } from "react";

interface HistoryMember {
  id: string;
  name: string;
}

interface TaskHistoryChangeDetailsProps {
  changes: unknown;
  valueKeyPrefix: string;
  members?: readonly HistoryMember[];
  className?: string;
}

const statusLabels: Record<string, string> = {
  todo: "To Do",
  in_progress: "In Progress",
  in_review: "In Review",
  done: "Done",
};

const fieldLabels: Record<string, string> = {
  title: "Title",
  description: "Description",
  status: "Status",
  position: "Position",
  priority: "Priority",
  dueDate: "Due date",
  timeEstimate: "Time estimate",
  assigneeIds: "Assignees",
};

const valuePreviewLength = 60;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isChange = (
  value: unknown,
): value is {
  from: unknown;
  to: unknown;
  fromNames?: unknown;
  toNames?: unknown;
} => isRecord(value) && "from" in value && "to" in value;

const getStringArray = (value: unknown): string[] | undefined =>
  Array.isArray(value) && value.every((item) => typeof item === "string")
    ? value
    : undefined;

const formatValue = (
  value: unknown,
  field: string,
  members: readonly HistoryMember[],
  displayNames?: string[],
): string => {
  if (value === null || value === "") return "None";
  if (field === "status" && typeof value === "string") {
    return statusLabels[value] ?? value;
  }
  if (field === "priority" && typeof value === "string") {
    return `${value.charAt(0).toUpperCase()}${value.slice(1)}`;
  }
  if (field === "dueDate" && typeof value === "string") {
    return new Intl.DateTimeFormat(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(new Date(`${value}T00:00:00`));
  }
  if (field === "assigneeIds" && Array.isArray(value)) {
    if (value.length === 0) return "Unassigned";
    return (
      displayNames ??
      value.map(
        (id) =>
          members.find((member) => member.id === String(id))?.name ??
          `User ${id}`,
      )
    ).join(", ");
  }
  return String(value);
};

const HistoryChangeValue = ({
  value,
  valueKey,
  isExpanded,
  onToggle,
}: {
  value: string;
  valueKey: string;
  isExpanded: boolean;
  onToggle: (valueKey: string) => void;
}) => {
  const isLong = value.length > valuePreviewLength;
  const displayedValue =
    isLong && !isExpanded
      ? `${value.slice(0, valuePreviewLength).trimEnd()}…`
      : value;

  return (
    <>
      <strong className="break-words font-semibold text-gray-800">
        {displayedValue}
      </strong>
      {isLong ? (
        <button
          type="button"
          className="ml-1 cursor-pointer font-semibold text-blue-700 underline decoration-blue-300 underline-offset-2 hover:text-blue-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1"
          aria-expanded={isExpanded}
          onClick={() => onToggle(valueKey)}
        >
          {isExpanded ? "Show less" : "Show full value"}
        </button>
      ) : null}
    </>
  );
};

export const hasTaskHistoryDetails = (changes: unknown): boolean => {
  if (!isRecord(changes)) return false;
  if (isRecord(changes.snapshot)) return true;
  return Object.entries(changes).some(
    ([field, value]) => field !== "snapshot" && isChange(value),
  );
};

const TaskHistoryChangeDetails = ({
  changes,
  valueKeyPrefix,
  members = [],
  className,
}: TaskHistoryChangeDetailsProps) => {
  const [expandedValues, setExpandedValues] = useState<Set<string>>(
    () => new Set(),
  );
  if (!isRecord(changes)) return null;

  const snapshot = isRecord(changes.snapshot) ? changes.snapshot : null;
  const changeEntries = Object.entries(changes).flatMap(([field, value]) =>
    field !== "snapshot" && isChange(value) ? [{ field, change: value }] : [],
  );
  const toggleValue = (valueKey: string) => {
    setExpandedValues((currentValues) => {
      const nextValues = new Set(currentValues);
      if (nextValues.has(valueKey)) nextValues.delete(valueKey);
      else nextValues.add(valueKey);
      return nextValues;
    });
  };

  return (
    <ul className={`mt-1 space-y-1 ${className ?? ""}`}>
      {snapshot
        ? Object.entries(snapshot)
            .filter(([field]) => field !== "assigneeNames")
            .map(([field, value]) => {
              const valueKey = `${valueKeyPrefix}:${field}:snapshot`;
              const displayNames =
                field === "assigneeIds"
                  ? getStringArray(snapshot.assigneeNames)
                  : undefined;
              return (
                <li key={field}>
                  <strong className="font-semibold text-gray-800">
                    {fieldLabels[field] ?? field}:
                  </strong>{" "}
                  <HistoryChangeValue
                    value={formatValue(value, field, members, displayNames)}
                    valueKey={valueKey}
                    isExpanded={expandedValues.has(valueKey)}
                    onToggle={toggleValue}
                  />
                </li>
              );
            })
        : null}
      {changeEntries.map(({ field, change }) => {
        const fromValueKey = `${valueKeyPrefix}:${field}:from`;
        const toValueKey = `${valueKeyPrefix}:${field}:to`;
        return (
          <li key={field}>
            <strong className="font-semibold text-gray-800">
              {fieldLabels[field] ?? field}:
            </strong>{" "}
            <HistoryChangeValue
              value={formatValue(
                change.from,
                field,
                members,
                getStringArray(change.fromNames),
              )}
              valueKey={fromValueKey}
              isExpanded={expandedValues.has(fromValueKey)}
              onToggle={toggleValue}
            />{" "}
            to{" "}
            <HistoryChangeValue
              value={formatValue(
                change.to,
                field,
                members,
                getStringArray(change.toNames),
              )}
              valueKey={toValueKey}
              isExpanded={expandedValues.has(toValueKey)}
              onToggle={toggleValue}
            />
          </li>
        );
      })}
    </ul>
  );
};

export default TaskHistoryChangeDetails;
