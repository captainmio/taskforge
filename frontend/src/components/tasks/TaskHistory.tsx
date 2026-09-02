import { useEffect, useState } from "react";
import { FaExchangeAlt, FaPlus } from "react-icons/fa";
import Button from "../ui/Button";
import Skeleton from "../ui/Skeleton";
import { getTaskHistory, type TaskHistoryEntry } from "../../services/tasks";

interface TaskHistoryMember {
  id: string;
  name: string;
}

interface TaskHistoryProps {
  workspaceId: string;
  projectId: number;
  taskId: number | null;
  members: readonly TaskHistoryMember[];
  refreshVersion: number;
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

const valuePreviewLength = 160;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isChange = (value: unknown): value is { from: unknown; to: unknown } =>
  isRecord(value) && "from" in value && "to" in value;

const formatDate = (value: string) =>
  new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));

const formatValue = (
  value: unknown,
  field: string,
  members: readonly TaskHistoryMember[],
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
    return value.length === 0
      ? "Unassigned"
      : value
          .map(
            (id) =>
              members.find((member) => member.id === String(id))?.name ??
              `User ${id}`,
          )
          .join(", ");
  }
  return String(value);
};

interface HistoryChangeValueProps {
  value: string;
  valueKey: string;
  isExpanded: boolean;
  onToggle: (valueKey: string) => void;
}

const HistoryChangeValue = ({
  value,
  valueKey,
  isExpanded,
  onToggle,
}: HistoryChangeValueProps) => {
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
          className="ml-1 font-semibold text-blue-700 underline decoration-blue-300 underline-offset-2 hover:text-blue-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 cursor-pointer"
          aria-expanded={isExpanded}
          onClick={() => onToggle(valueKey)}
        >
          {isExpanded ? "Show less" : "Show full value"}
        </button>
      ) : null}
    </>
  );
};

const hasVisibleHistoryDetail = (entry: TaskHistoryEntry) => {
  const changes = isRecord(entry.changes) ? entry.changes : {};
  if (isRecord(changes.snapshot)) return true;

  return Object.entries(changes).some(
    ([field, value]) => field !== "snapshot" && isChange(value),
  );
};

const TaskHistory = ({
  workspaceId,
  projectId,
  taskId,
  members,
  refreshVersion,
}: TaskHistoryProps) => {
  const [history, setHistory] = useState<TaskHistoryEntry[]>([]);
  const [nextCursor, setNextCursor] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [expandedValues, setExpandedValues] = useState<Set<string>>(
    () => new Set(),
  );

  useEffect(() => {
    if (!taskId) {
      return;
    }

    let isActive = true;
    const loadHistory = async () => {
      const isInitialLoad = refreshVersion === 0;
      setIsLoading(isInitialLoad);
      setIsRefreshing(!isInitialLoad);
      setHasError(false);
      try {
        const response = await getTaskHistory(workspaceId, projectId, taskId);
        if (!isActive) return;
        setHistory(response.data.history);
        setNextCursor(response.data.nextCursor);
      } catch {
        if (isActive) setHasError(true);
      } finally {
        if (isActive) {
          setIsLoading(false);
          setIsRefreshing(false);
        }
      }
    };

    void loadHistory();
    return () => {
      isActive = false;
    };
  }, [projectId, refreshVersion, retryCount, taskId, workspaceId]);

  const loadMore = async () => {
    if (!taskId || !nextCursor) return;

    setIsLoadingMore(true);
    setHasError(false);
    try {
      const response = await getTaskHistory(
        workspaceId,
        projectId,
        taskId,
        nextCursor,
      );
      setHistory((currentHistory) => [
        ...currentHistory,
        ...response.data.history,
      ]);
      setNextCursor(response.data.nextCursor);
    } catch {
      setHasError(true);
    } finally {
      setIsLoadingMore(false);
    }
  };

  const toggleValue = (valueKey: string) => {
    setExpandedValues((currentValues) => {
      const nextValues = new Set(currentValues);
      if (nextValues.has(valueKey)) {
        nextValues.delete(valueKey);
      } else {
        nextValues.add(valueKey);
      }
      return nextValues;
    });
  };

  return (
    <aside className="border-t border-gray-100 bg-slate-50/70 p-6 lg:border-l lg:border-t-0 overflow-y-auto">
      <h3 className="text-sm font-bold text-gray-950">Task History</h3>
      <p className="mt-1 text-xs text-gray-500">
        {isRefreshing ? "Refreshing changes…" : "Changes to this task."}
      </p>

      {!taskId ? (
        <p className="mt-6 text-sm text-gray-500">
          History will be available after this task is created.
        </p>
      ) : isLoading ? (
        <div
          className="mt-6 space-y-5"
          role="status"
          aria-label="Loading task history"
        >
          {[1, 2, 3].map((item) => (
            <div key={item} className="flex gap-3">
              <Skeleton className="size-7 shrink-0 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-3 w-4/5" />
                <Skeleton className="h-3 w-2/5" />
              </div>
            </div>
          ))}
        </div>
      ) : hasError && history.length === 0 ? (
        <div className="mt-6">
          <p className="text-sm text-red-600" role="alert">
            Unable to load task history.
          </p>
          <Button
            size="sm"
            variant="ghost"
            className="mt-2"
            onClick={() => setRetryCount((current) => current + 1)}
          >
            Try again
          </Button>
        </div>
      ) : (
        <>
          {history.filter(hasVisibleHistoryDetail).length > 0 ? (
            <ol className="mt-6 space-y-6">
              {history.filter(hasVisibleHistoryDetail).map((entry) => {
                const changes = isRecord(entry.changes) ? entry.changes : {};
                const snapshot = isRecord(changes.snapshot)
                  ? changes.snapshot
                  : null;
                const changeEntries = Object.entries(changes).flatMap(
                  ([field, value]) =>
                    field !== "snapshot" && isChange(value)
                      ? [{ field, change: value }]
                      : [],
                );
                const actorName = `${entry.actor.firstname} ${entry.actor.lastname}`;
                const isCreated = entry.action === "created";
                const Icon = isCreated ? FaPlus : FaExchangeAlt;

                return (
                  <li key={entry.id} className="relative flex gap-3">
                    <span
                      className={`flex size-7 shrink-0 items-center justify-center rounded-full ${
                        isCreated
                          ? "bg-emerald-100 text-emerald-600"
                          : "bg-blue-100 text-blue-600"
                      }`}
                    >
                      <Icon className="size-3" aria-hidden="true" />
                    </span>
                    <div className="min-w-0 text-xs leading-5 text-gray-600">
                      <p>
                        <strong className="font-semibold text-gray-800">
                          {actorName}
                        </strong>{" "}
                        {isCreated
                          ? "created this task."
                          : "updated this task."}
                      </p>
                      {snapshot ? (
                        <p className="mt-1">
                          Created with{" "}
                          <strong className="font-semibold text-gray-800">
                            {formatValue(snapshot.status, "status", members)}
                          </strong>{" "}
                          status and{" "}
                          <strong className="font-semibold text-gray-800">
                            {formatValue(
                              snapshot.priority,
                              "priority",
                              members,
                            )}
                          </strong>{" "}
                          priority.
                        </p>
                      ) : null}
                      {changeEntries.length > 0 ? (
                        <ul className="mt-1 space-y-1">
                          {changeEntries.map(({ field, change }) => {
                            const fromValue = formatValue(
                              change.from,
                              field,
                              members,
                            );
                            const toValue = formatValue(
                              change.to,
                              field,
                              members,
                            );
                            const fromValueKey = `${entry.id}:${field}:from`;
                            const toValueKey = `${entry.id}:${field}:to`;

                            return (
                              <li key={field}>
                                <strong className="font-semibold text-gray-800">
                                  {fieldLabels[field] ?? field}:
                                </strong>{" "}
                                <HistoryChangeValue
                                  value={fromValue}
                                  valueKey={fromValueKey}
                                  isExpanded={expandedValues.has(fromValueKey)}
                                  onToggle={toggleValue}
                                />{" "}
                                to{" "}
                                <HistoryChangeValue
                                  value={toValue}
                                  valueKey={toValueKey}
                                  isExpanded={expandedValues.has(toValueKey)}
                                  onToggle={toggleValue}
                                />
                              </li>
                            );
                          })}
                        </ul>
                      ) : null}
                      <time className="mt-1 block text-[11px] text-gray-400">
                        {formatDate(entry.createdAt)}
                      </time>
                    </div>
                  </li>
                );
              })}
            </ol>
          ) : (
            <p className="mt-6 text-sm text-gray-500">
              No changes recorded yet.
            </p>
          )}
          {hasError ? (
            <p className="mt-4 text-xs text-red-600" role="alert">
              Unable to load older history entries.
            </p>
          ) : null}
          {nextCursor ? (
            <Button
              size="sm"
              variant="ghost"
              className="mt-4"
              disabled={isLoadingMore}
              onClick={() => void loadMore()}
            >
              {isLoadingMore ? "Loading…" : "Load more"}
            </Button>
          ) : null}
        </>
      )}
    </aside>
  );
};

export default TaskHistory;
