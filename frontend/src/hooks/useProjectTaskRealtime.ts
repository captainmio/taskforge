import { useEffect, useRef } from "react";
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
  onTaskUpdated: (task: ProjectTask) => void;
  onTaskCreated: () => void;
}

const socketServerOrigin = new URL(import.meta.env.VITE_API_URL).origin;

export const useProjectTaskRealtime = ({
  workspaceId,
  projectId,
  onTaskUpdated,
  onTaskCreated,
}: UseProjectTaskRealtimeOptions): void => {
  const onTaskUpdatedRef = useRef(onTaskUpdated);
  const onTaskCreatedRef = useRef(onTaskCreated);

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
      !Number.isSafeInteger(projectId) ||
      !projectId ||
      projectId <= 0
    ) {
      return;
    }

    // `VITE_API_URL` ends in `/api` for REST requests. Socket.IO instead
    // connects to the server origin, then uses its own `/socket.io` endpoint.
    const socket = io(socketServerOrigin, { withCredentials: true });

    socket.on("connect", () => {
      // Connecting proves the cookie is valid. Joining this room separately
      // lets the server check that this user may view this specific project.
      socket.emit(
        "project:join",
        { workspaceId: numericWorkspaceId, projectId },
        (result: { success: boolean }) => {
          if (!result.success) socket.disconnect();
        },
      );
    });

    socket.on("task.updated", (event: TaskUpdatedEvent) => {
      if (
        event.workspaceId === numericWorkspaceId &&
        event.projectId === projectId
      ) {
        onTaskUpdatedRef.current(event.task);
      }
    });

    socket.on("task.created", (event: TaskCreatedEvent) => {
      if (
        event.workspaceId === numericWorkspaceId &&
        event.projectId === projectId
      ) {
        // Creation events intentionally contain only an ID, so reloading the
        // normal REST list gives this board the complete new task record.
        onTaskCreatedRef.current();
      }
    });

    // Leaving the page closes this connection and stops this board from
    // receiving updates for a project the user is no longer viewing.
    return () => {
      socket.disconnect();
    };
  }, [projectId, workspaceId]);
};
