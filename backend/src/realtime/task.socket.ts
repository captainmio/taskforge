import type { Server as HttpServer } from "node:http";
import jwt from "jsonwebtoken";
import { Server } from "socket.io";
import { z } from "zod";
import { JWT_COOKIE_NAME, JWT_SECRET } from "../config/auth.js";
import { env } from "../config/env.js";
import { logger } from "../config/logger.js";
import { findProjectByWorkspace } from "../repositories/project.repository.js";
import { findWorkspaceMembership } from "../repositories/workspace.repository.js";
import { authTokenPayloadSchema } from "../validations/auth.validation.js";

const projectRoomSchema = z.object({
  workspaceId: z.number().int().positive(),
  projectId: z.number().int().positive(),
});

type AuthenticatedSocket = Parameters<Parameters<Server["use"]>[0]>[0] & {
  data: { userId: number };
};

type TaskUpdatedEvent = {
  workspaceId: number;
  projectId: number;
  task: object;
};

type TaskCreatedEvent = {
  workspaceId: number;
  projectId: number;
  taskId: number;
};

let socketServer: Server | undefined;

const projectRoom = (projectId: number) => `project:${projectId}`;

const readCookie = (cookieHeader: string | undefined, name: string) => {
  const cookie = cookieHeader
    ?.split(";")
    .map((value) => value.trim())
    .find((value) => value.startsWith(`${name}=`));

  return cookie?.slice(name.length + 1);
};

export const initializeTaskSocketServer = (httpServer: HttpServer) => {
  socketServer = new Server(httpServer, {
    cors: { origin: env.FRONTEND_API, credentials: true },
  });

  socketServer.use((socket, next) => {
    // Socket.IO does not run Express middleware. Read the same login cookie and
    // verify it here before allowing this browser to establish a connection.
    const token = readCookie(socket.request.headers.cookie, JWT_COOKIE_NAME);
    if (!token) return next(new Error("Authentication required"));

    try {
      const payload = authTokenPayloadSchema.safeParse(jwt.verify(token, JWT_SECRET));
      if (!payload.success) return next(new Error("Invalid authentication"));

      (socket as AuthenticatedSocket).data.userId = payload.data.sub;
      return next();
    } catch {
      return next(new Error("Invalid authentication"));
    }
  });

  socketServer.on("connection", (socket) => {
    const authenticatedSocket = socket as AuthenticatedSocket;

    socket.on("project:join", async (payload: unknown, acknowledge?: (result: { success: boolean }) => void) => {
      const room = projectRoomSchema.safeParse(payload);
      if (!room.success) {
        acknowledge?.({ success: false });
        return;
      }

      const { workspaceId, projectId } = room.data;
      try {
        // Joining a room is permission-sensitive: being logged in is not enough.
        // The user must belong to the workspace and the project must be in it.
        const [membership, project] = await Promise.all([
          findWorkspaceMembership(workspaceId, authenticatedSocket.data.userId),
          findProjectByWorkspace(workspaceId, projectId),
        ]);
        if (!membership || !project) {
          acknowledge?.({ success: false });
          return;
        }

        await socket.join(projectRoom(projectId));
        acknowledge?.({ success: true });
      } catch (error) {
        logger.error(
          {
            logType: "system",
            event: "socket.project_join_failed",
            err: error,
            workspaceId,
            projectId,
            userId: authenticatedSocket.data.userId,
          },
          "[SYSTEM] Unable to authorize project socket room",
        );
        acknowledge?.({ success: false });
      }
    });
  });

  return socketServer;
};

export const emitTaskCreated = (event: TaskCreatedEvent): void => {
  socketServer?.to(projectRoom(event.projectId)).emit("task.created", event);
};

export const emitTaskUpdated = (event: TaskUpdatedEvent): void => {
  socketServer?.to(projectRoom(event.projectId)).emit("task.updated", event);
};

export const closeTaskSocketServer = (): void => {
  socketServer?.close();
  socketServer = undefined;
};
