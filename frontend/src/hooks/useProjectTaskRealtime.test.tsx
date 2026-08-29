import { render } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useProjectTaskRealtime } from "./useProjectTaskRealtime";

const mocks = vi.hoisted(() => {
  const listeners = new Map<string, (...args: unknown[]) => void>();
  const socket = {
    on: vi.fn((event: string, listener: (...args: unknown[]) => void) => {
      listeners.set(event, listener);
      return socket;
    }),
    emit: vi.fn(),
    disconnect: vi.fn(),
  };

  return { io: vi.fn(() => socket), listeners, socket };
});

vi.mock("socket.io-client", () => ({ io: mocks.io }));

const RealtimeHarness = ({
  onTaskUpdated,
  onTaskCreated,
}: {
  onTaskUpdated: (taskId: number) => void;
  onTaskCreated: () => void;
}) => {
  useProjectTaskRealtime({
    workspaceId: "42",
    projectId: 25,
    onTaskUpdated: (task) => onTaskUpdated(task.id),
    onTaskCreated,
  });
  return null;
};

describe("useProjectTaskRealtime", () => {
  beforeEach(() => {
    mocks.io.mockClear();
    mocks.socket.on.mockClear();
    mocks.socket.emit.mockClear();
    mocks.socket.disconnect.mockClear();
    mocks.listeners.clear();
  });

  it("joins the active project and forwards its real-time events", () => {
    const onTaskUpdated = vi.fn();
    const onTaskCreated = vi.fn();
    render(
      <RealtimeHarness
        onTaskUpdated={onTaskUpdated}
        onTaskCreated={onTaskCreated}
      />,
    );

    expect(mocks.io).toHaveBeenCalledWith(
      new URL(import.meta.env.VITE_API_URL).origin,
      { withCredentials: true },
    );

    mocks.listeners.get("connect")?.();
    expect(mocks.socket.emit).toHaveBeenCalledWith(
      "project:join",
      { workspaceId: 42, projectId: 25 },
      expect.any(Function),
    );

    mocks.listeners.get("task.updated")?.({
      workspaceId: 42,
      projectId: 25,
      task: { id: 101 },
    });
    mocks.listeners.get("task.created")?.({
      workspaceId: 42,
      projectId: 25,
      taskId: 102,
    });

    expect(onTaskUpdated).toHaveBeenCalledWith(101);
    expect(onTaskCreated).toHaveBeenCalledOnce();
  });

  it("disconnects when room access is rejected or the component unmounts", () => {
    const { unmount } = render(
      <RealtimeHarness onTaskUpdated={vi.fn()} onTaskCreated={vi.fn()} />,
    );

    mocks.listeners.get("connect")?.();
    const acknowledgement = mocks.socket.emit.mock.calls[0]?.[2] as
      | ((result: { success: boolean }) => void)
      | undefined;
    acknowledgement?.({ success: false });
    expect(mocks.socket.disconnect).toHaveBeenCalledOnce();

    unmount();
    expect(mocks.socket.disconnect).toHaveBeenCalledTimes(2);
  });
});
