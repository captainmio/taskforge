import { createServer, type Server as HttpServer } from "node:http";
import jwt from "jsonwebtoken";
import { io, type Socket } from "socket.io-client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  findProjectByWorkspace: vi.fn(),
  findWorkspaceMembership: vi.fn(),
}));

vi.mock("../../../src/repositories/project.repository.js", () => ({
  findProjectByWorkspace: mocks.findProjectByWorkspace,
}));

vi.mock("../../../src/repositories/workspace.repository.js", () => ({
  findWorkspaceMembership: mocks.findWorkspaceMembership,
}));

const {
  closeTaskSocketServer,
  emitTaskUpdated,
  initializeTaskSocketServer,
} = await import("../../../src/realtime/task.socket.js");

const authCookie = `accessToken=${jwt.sign(
  { sub: 7, email: "member@example.com" },
  "test-only-jwt-secret",
)}`;

let server: HttpServer;
let client: Socket | undefined;

const getServerUrl = () => {
  const address = server.address();
  if (!address || typeof address === "string") {
    throw new Error("Socket test server did not start");
  }
  return `http://127.0.0.1:${address.port}`;
};

const connect = async (cookie = authCookie) =>
  new Promise<Socket>((resolve, reject) => {
    const nextClient = io(getServerUrl(), {
      transports: ["websocket"],
      ...(cookie ? { extraHeaders: { Cookie: cookie } } : {}),
    });
    nextClient.once("connect", () => resolve(nextClient));
    nextClient.once("connect_error", reject);
  });

const joinProject = (socket: Socket, workspaceId: number, projectId: number) =>
  new Promise<{ success: boolean }>((resolve) => {
    socket.emit("project:join", { workspaceId, projectId }, resolve);
  });

describe("task Socket.IO server", () => {
  beforeEach(async () => {
    mocks.findProjectByWorkspace.mockReset();
    mocks.findWorkspaceMembership.mockReset();
    mocks.findProjectByWorkspace.mockResolvedValue({ id: 25 });
    mocks.findWorkspaceMembership.mockResolvedValue({ role: "MEMBER" });

    server = createServer();
    initializeTaskSocketServer(server);
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  });

  afterEach(async () => {
    client?.disconnect();
    client = undefined;
    closeTaskSocketServer();
    if (server.listening) {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });

  it("authorizes a project room and delivers task updates to its members", async () => {
    client = await connect();

    await expect(joinProject(client, 42, 25)).resolves.toEqual({ success: true });
    expect(mocks.findWorkspaceMembership).toHaveBeenCalledWith(42, 7);
    expect(mocks.findProjectByWorkspace).toHaveBeenCalledWith(42, 25);

    const receivedEvent = new Promise<unknown>((resolve) => {
      client?.once("task.updated", resolve);
    });
    emitTaskUpdated({
      workspaceId: 42,
      projectId: 25,
      task: { id: 101, title: "Updated task" },
    });

    await expect(receivedEvent).resolves.toEqual({
      workspaceId: 42,
      projectId: 25,
      task: { id: 101, title: "Updated task" },
    });
  });

  it("rejects a project room when the user is not a workspace member", async () => {
    mocks.findWorkspaceMembership.mockResolvedValueOnce(null);
    client = await connect();

    await expect(joinProject(client, 42, 25)).resolves.toEqual({ success: false });
  });

  it("rejects a connection without the login cookie", async () => {
    await expect(connect("")).rejects.toMatchObject({
      message: "Authentication required",
    });
  });
});
