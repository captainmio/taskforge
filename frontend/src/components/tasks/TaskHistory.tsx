import { useEffect, useState } from "react";
import { FaExchangeAlt, FaPlus } from "react-icons/fa";
import Button from "../ui/Button";
import Skeleton from "../ui/Skeleton";
import { getTaskHistory, type TaskHistoryEntry } from "../../services/tasks";
import TaskHistoryChangeDetails, {
  hasTaskHistoryDetails,
} from "./TaskHistoryChangeDetails";

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

const formatDate = (value: string) =>
  new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));

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
          {history.filter((entry) => hasTaskHistoryDetails(entry.changes)).length > 0 ? (
            <ol className="mt-6 space-y-6">
              {history.filter((entry) => hasTaskHistoryDetails(entry.changes)).map((entry) => {
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
                      <TaskHistoryChangeDetails
                        changes={entry.changes}
                        valueKeyPrefix={String(entry.id)}
                        members={members}
                      />
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
