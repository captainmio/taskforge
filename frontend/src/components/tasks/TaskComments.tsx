import { useCallback, useEffect, useRef, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { FaRegCommentDots } from "react-icons/fa";
import Button from "../ui/Button";
import InitialsAvatar from "../ui/InitialsAvatar";
import Skeleton from "../ui/Skeleton";
import Textarea from "../ui/Textarea";
import { useProjectTaskRealtime } from "../../hooks/useProjectTaskRealtime";
import {
  createTaskComment,
  getTaskComments,
  type TaskComment,
} from "../../services/tasks";

interface TaskCommentsProps {
  workspaceId: string;
  projectId: number;
  taskId: number | null;
  onActivityRefresh: () => void;
}

interface CommentFormValues {
  body: string;
}

const maxCommentLength = 5000;
const formatDate = (value: string) =>
  new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));

const TaskComments = ({
  workspaceId,
  projectId,
  taskId,
  onActivityRefresh,
}: TaskCommentsProps) => {
  const [comments, setComments] = useState<TaskComment[]>([]);
  const [nextCursor, setNextCursor] = useState<number | null>(null);
  const {
    register,
    control,
    handleSubmit,
    resetField,
    setError,
    clearErrors,
    setFocus,
    formState: { errors, isSubmitting },
  } = useForm<CommentFormValues>({ defaultValues: { body: "" } });
  const draft = useWatch({ control, name: "body" });
  const postError = errors.body?.message ?? errors.root?.server?.message;
  const [isLoading, setIsLoading] = useState(Boolean(taskId));
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [announcement, setAnnouncement] = useState("");
  const requestVersion = useRef(0);
  const posting = useRef(false);
  const mounted = useRef(false);
  const commentsRef = useRef(comments);
  const hasLoadedComments = useRef(false);

  useEffect(() => {
    commentsRef.current = comments;
  }, [comments]);

  const loadComments = useCallback(
    async (cursor?: number) => {
      if (!taskId) return;
      // Only the latest request may update state. The checks after each await
      // also discard results if the task dialog has closed.
      const version = ++requestVersion.current;
      const newestKnownId = hasLoadedComments.current
        ? commentsRef.current[0]?.id
        : undefined;
      // Older-page loads show progress; socket refreshes keep the conversation
      // visible and the composer available while fetching new comments.
      if (cursor) setIsLoadingMore(true);
      setLoadError("");
      try {
        let response = await getTaskComments(
          workspaceId,
          projectId,
          taskId,
          cursor,
        );
        if (!mounted.current || version !== requestVersion.current) return;
        const incoming = [...response.data.comments];
        // Reconnection can miss more than one page. Fetch through the newest
        // known comment so merging cannot leave a gap in the conversation.
        while (
          !cursor &&
          newestKnownId &&
          response.data.nextCursor &&
          (incoming.at(-1)?.id ?? 0) > newestKnownId
        ) {
          response = await getTaskComments(
            workspaceId,
            projectId,
            taskId,
            response.data.nextCursor,
          );
          if (!mounted.current || version !== requestVersion.current) return;
          incoming.push(...response.data.comments);
        }
        // Pagination and socket refreshes retain loaded comments, deduplicating
        // by ID when a posted comment also arrives through a socket refresh.
        setComments((current) =>
          [
            ...new Map(
              [...current, ...incoming].map((entry) => [entry.id, entry]),
            ).values(),
          ].sort((left, right) => right.id - left.id),
        );
        // Newer comments must not move the cursor for loading older comments.
        // Advance it for older pages or initialize it when no loaded comment anchors the list.
        if (cursor || !newestKnownId) setNextCursor(response.data.nextCursor);
        hasLoadedComments.current = true;
        // Refresh Task History with new activity, but not when paging backward.
        if (!cursor) onActivityRefresh();
      } catch {
        if (mounted.current && version === requestVersion.current) {
          setLoadError(
            cursor
              ? "Couldn't load older comments. Try again."
              : "Couldn't load comments. Close and reopen this task to try again.",
          );
        }
      } finally {
        // A superseded request must not clear a newer request's loading state.
        if (mounted.current && version === requestVersion.current) {
          setIsLoading(false);
          setIsLoadingMore(false);
        }
      }
    },
    [workspaceId, projectId, taskId, onActivityRefresh],
  );

  useEffect(() => {
    mounted.current = true;
    const version = ++requestVersion.current;
    const loadInitialComments = async () => {
      if (!taskId) return;
      try {
        const response = await getTaskComments(workspaceId, projectId, taskId);
        if (!mounted.current || version !== requestVersion.current) return;
        setComments(response.data.comments);
        setNextCursor(response.data.nextCursor);
        hasLoadedComments.current = true;
      } catch {
        if (mounted.current && version === requestVersion.current) {
          setLoadError(
            "Couldn't load comments. Close and reopen this task to try again.",
          );
        }
      } finally {
        if (mounted.current && version === requestVersion.current)
          setIsLoading(false);
      }
    };
    void loadInitialComments();
    return () => {
      mounted.current = false;
      requestVersion.current += 1;
    };
  }, [workspaceId, projectId, taskId]);

  useProjectTaskRealtime({
    workspaceId: taskId ? workspaceId : undefined,
    projectId: taskId ? projectId : undefined,
    onTaskCommentAdded: (changedTaskId) => {
      if (changedTaskId === taskId) void loadComments();
    },
    onSubscribed: () => void loadComments(),
  });

  const submitComment = async (values: CommentFormValues) => {
    const body = values.body.trim();
    if (!taskId || posting.current) return;
    posting.current = true;
    clearErrors("root.server");
    setAnnouncement("");
    try {
      const response = await createTaskComment(
        workspaceId,
        projectId,
        taskId,
        body,
      );
      if (!mounted.current) return;
      setComments((current) =>
        [
          response.data,
          ...current.filter(({ id }) => id !== response.data.id),
        ].sort((left, right) => right.id - left.id),
      );
      resetField("body");
      setAnnouncement("Comment posted.");
      onActivityRefresh();
    } catch {
      if (mounted.current)
        setError("root.server", {
          type: "server",
          message:
            "Couldn't post your comment. Your draft is still here; try again.",
        });
    } finally {
      posting.current = false;
      if (mounted.current) {
        // Return keyboard focus after React finishes updating the composer.
        requestAnimationFrame(() => {
          if (mounted.current) setFocus("body");
        });
      }
    }
  };

  const isBusy = isLoading || isLoadingMore || isSubmitting;

  return (
    <section
      aria-labelledby="task-comments-heading"
      className="min-w-0 border-t border-gray-100 px-6 py-6"
    >
      <h3
        id="task-comments-heading"
        className="flex items-center gap-2 text-sm font-bold text-gray-950"
      >
        <FaRegCommentDots aria-hidden="true" className="text-gray-500" />
        Task Comments
      </h3>

      {!taskId ? (
        <p className="mt-4 text-sm text-gray-600">
          Add a task title to create the task before commenting.
        </p>
      ) : (
        <>
          <form
            onSubmit={(event) => void handleSubmit(submitComment)(event)}
            className="mt-5"
          >
            <label
              htmlFor="task-comment-body"
              className="mb-2 block text-xs font-semibold text-gray-700"
            >
              Add a comment
            </label>
            <Textarea
              id="task-comment-body"
              rows={3}
              resizable={false}
              maxLength={maxCommentLength}
              {...register("body", {
                validate: (value) =>
                  value.trim().length > 0 || "Write a comment before posting.",
                maxLength: {
                  value: maxCommentLength,
                  message: "Comments cannot exceed 5,000 characters.",
                },
                onChange: () => clearErrors("root.server"),
              })}
              readOnly={isSubmitting}
              aria-invalid={Boolean(errors.body)}
              aria-describedby={`task-comment-hint${postError ? " task-comment-error" : ""}`}
              className="text-sm placeholder:text-gray-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-site-green read-only:bg-slate-50"
            />
            <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
              <p
                id="task-comment-hint"
                className="text-xs tabular-nums text-gray-500"
              >
                {draft.length.toLocaleString()} / 5,000 characters
              </p>
              <Button
                type="submit"
                size="sm"
                disabled={!draft.trim() || isBusy}
              >
                {isSubmitting ? "Posting…" : "Post comment"}
              </Button>
            </div>
            {postError ? (
              <p
                id="task-comment-error"
                role="alert"
                className="mt-3 text-sm text-red-600"
              >
                {postError}
              </p>
            ) : null}
            <p role="status" className="sr-only">
              {announcement}
            </p>
          </form>

          {loadError ? (
            <p role="alert" className="mt-5 text-sm text-red-600">
              {loadError}
            </p>
          ) : null}
          {isLoading && comments.length === 0 ? (
            <div
              role="status"
              aria-label="Loading comments"
              className="mt-6 space-y-5"
            >
              {[1, 2].map((item) => (
                <div key={item} className="flex gap-3">
                  <Skeleton className="size-8 shrink-0 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-3 w-1/3" />
                    <Skeleton className="h-4 w-4/5" />
                  </div>
                </div>
              ))}
            </div>
          ) : comments.length > 0 ? (
            <>
              <p className="mt-6 text-xs font-medium text-gray-500">
                Newest first
              </p>
              <ol
                aria-label="Task comments"
                className="mt-3 divide-y divide-gray-100"
              >
                {comments.map((comment) => {
                  const name = `${comment.author.firstname} ${comment.author.lastname}`;
                  return (
                    <li
                      key={comment.id}
                      className="flex min-w-0 gap-3 py-4 first:pt-0"
                    >
                      <InitialsAvatar value={name} size="sm" />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                          <span className="break-words text-sm font-semibold text-gray-900">
                            {name}
                          </span>
                          <time
                            dateTime={comment.createdAt}
                            className="text-xs text-gray-500"
                          >
                            {formatDate(comment.createdAt)}
                          </time>
                        </div>
                        <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-6 text-gray-700 [overflow-wrap:anywhere]">
                          {comment.body}
                        </p>
                      </div>
                    </li>
                  );
                })}
              </ol>
            </>
          ) : !loadError ? (
            <p className="mt-6 text-sm text-gray-600">
              No comments yet. Start the conversation with an update or a
              question.
            </p>
          ) : null}
          {nextCursor ? (
            <Button
              variant="ghost"
              size="sm"
              className="mt-3"
              disabled={isBusy}
              onClick={() => void loadComments(nextCursor)}
            >
              {isLoadingMore ? "Loading…" : "Load older comments"}
            </Button>
          ) : null}
        </>
      )}
    </section>
  );
};

export default TaskComments;
