import { useEffect, useMemo, useRef } from "react";
import { io } from "socket.io-client";
import type { ProjectTask } from "../services/tasks";

interface TaskUpdatedEvent {
  workspaceId: number;
  projectId: number;
  task: ProjectTask;
}

interface TaskCreatedEvent {
  workspaceId: number;
  projectId: number;
  taskId: number;
}

interface UseProjectTaskRealtimeOptions {
  workspaceId: string | undefined;
  projectId: number | undefined;
  projectIds?: number[];
  onTaskUpdated?: (task: ProjectTask) => void;
  onTaskCreated?: () => void;
  onTaskCommentAdded?: (taskId: number) => void;
  onSubscribed?: () => void;
}

const socketServerOrigin = new URL(import.meta.env.VITE_API_URL).origin;

export const useProjectTaskRealtime = ({
  workspaceId,
  projectId,
  projectIds,
  onTaskUpdated,
  onTaskCreated,
  onTaskCommentAdded,
  onSubscribed,
}: UseProjectTaskRealtimeOptions): void => {
  const onTaskUpdatedRef = useRef(onTaskUpdated);
  const onTaskCreatedRef = useRef(onTaskCreated);
  const onTaskCommentAddedRef = useRef(onTaskCommentAdded);
  const onSubscribedRef = useRef(onSubscribed);
  const subscribedProjectIds = useMemo(
    () =>
      [
        ...new Set(
          (projectIds ?? [projectId]).filter(
            (candidate): candidate is number =>
              candidate !== undefined &&
              Number.isSafeInteger(candidate) &&
              candidate > 0,
          ),
        ),
      ],
    [projectId, projectIds],
  );

  useEffect(() => {
    onTaskCommentAddedRef.current = onTaskCommentAdded;
    onSubscribedRef.current = onSubscribed;
  }, [onTaskCommentAdded, onSubscribed]);

  useEffect(() => {
    onTaskUpdatedRef.current = onTaskUpdated;
  }, [onTaskUpdated]);

  useEffect(() => {
    onTaskCreatedRef.current = onTaskCreated;
  }, [onTaskCreated]);

  useEffect(() => {
    const numericWorkspaceId = Number(workspaceId);
    if (
      !Number.isSafeInteger(numericWorkspaceId) ||
      numericWorkspaceId <= 0 ||
      subscribedProjectIds.length === 0
    ) {
      return;
    }

    // `VITE_API_URL` ends in `/api` for REST requests. Socket.IO instead
    // connects to the server origin, then uses its own `/socket.io` endpoint.
    const socket = io(socketServerOrigin, { withCredentials: true });

    socket.on("connect", () => {
      // Each room is authorized separately, even when a screen needs updates
      // from more than one project.
      let remainingProjectJoins = subscribedProjectIds.length;
      let hasAuthorizedProject = false;
      for (const subscribedProjectId of subscribedProjectIds) {
        socket.emit(
          "project:join",
          { workspaceId: numericWorkspaceId, projectId: subscribedProjectId },
          (result: { success: boolean }) => {
            remainingProjectJoins -= 1;
            if (!result.success) {
              if (!hasAuthorizedProject && remainingProjectJoins === 0) {
                socket.disconnect();
              }
              return;
            }
            hasAuthorizedProject = true;
            // Reload after joining, including reconnections, to recover missed
            // events and close the gap between the initial fetch and subscription.
            onSubscribedRef.current?.();
          },
        );
      }
    });

    socket.on("task.updated", (event: TaskUpdatedEvent) => {
      if (
        event.workspaceId === numericWorkspaceId &&
        subscribedProjectIds.includes(event.projectId)
      ) {
        onTaskUpdatedRef.current?.(event.task);
      }
    });

    socket.on("task.created", (event: TaskCreatedEvent) => {
      if (
        event.workspaceId === numericWorkspaceId &&
        subscribedProjectIds.includes(event.projectId)
      ) {
        // Creation events intentionally contain only an ID, so reloading the
        // normal REST list gives this board the complete new task record.
        onTaskCreatedRef.current?.();
      }
    });

    socket.on("task.comment_added", (event: TaskCreatedEvent) => {
      if (
        event.workspaceId === numericWorkspaceId &&
        subscribedProjectIds.includes(event.projectId)
      ) {
        onTaskCommentAddedRef.current?.(event.taskId);
      }
    });

    // Leaving the page closes this connection and stops this board from
    // receiving updates for a project the user is no longer viewing.
    return () => {
      socket.disconnect();
    };
  }, [subscribedProjectIds, workspaceId]);
};
