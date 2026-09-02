import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import TaskHistory from "./TaskHistory";

const mocks = vi.hoisted(() => ({ getTaskHistory: vi.fn() }));

vi.mock("../../services/tasks", () => ({
  getTaskHistory: mocks.getTaskHistory,
}));

const actor = {
  id: 7,
  firstname: "Rustam",
  lastname: "Jordan",
  email: "rustam@example.com",
};

const response = (history: unknown[], nextCursor: number | null = null) => ({
  data: { history, nextCursor },
});

const renderHistory = (refreshVersion = 0) =>
  render(
    <TaskHistory
      workspaceId="42"
      projectId={25}
      taskId={101}
      members={[{ id: "7", name: "Rustam Jordan" }]}
      refreshVersion={refreshVersion}
    />,
  );

describe("TaskHistory", () => {
  beforeEach(() => {
    mocks.getTaskHistory.mockReset();
  });

  it("shows actor and changed values while hiding empty update events", async () => {
    mocks.getTaskHistory.mockResolvedValue(
      response([
        {
          id: 3,
          action: "updated",
          changes: {},
          createdAt: "2026-09-02T02:26:00.000Z",
          actor,
        },
        {
          id: 2,
          action: "updated",
          changes: { priority: { from: "medium", to: "high" } },
          createdAt: "2026-09-02T02:25:00.000Z",
          actor,
        },
      ]),
    );

    renderHistory();

    expect(await screen.findByText("Priority:")).toBeVisible();
    expect(screen.getByText("Medium")).toBeVisible();
    expect(screen.getByText("High")).toBeVisible();
    expect(screen.getAllByText("Rustam Jordan")).toHaveLength(1);
  });

  it("expands a long changed value only when requested", async () => {
    const longDescription = "a".repeat(220);
    mocks.getTaskHistory.mockResolvedValue(
      response([
        {
          id: 2,
          action: "updated",
          changes: { description: { from: "", to: longDescription } },
          createdAt: "2026-09-02T02:25:00.000Z",
          actor,
        },
      ]),
    );

    renderHistory();

    const showFullValue = await screen.findByRole("button", {
      name: "Show full value",
    });
    expect(screen.queryByText(longDescription)).not.toBeInTheDocument();
    fireEvent.click(showFullValue);
    expect(screen.getByText(longDescription)).toBeVisible();
    expect(screen.getByRole("button", { name: "Show less" })).toBeVisible();
  });

  it("loads the next history page when requested", async () => {
    mocks.getTaskHistory
      .mockResolvedValueOnce(
        response(
          [{ id: 2, action: "updated", changes: { title: { from: "A", to: "B" } }, createdAt: "2026-09-02T02:25:00.000Z", actor }],
          2,
        ),
      )
      .mockResolvedValueOnce(
        response([
          { id: 1, action: "updated", changes: { title: { from: "Original", to: "A" } }, createdAt: "2026-09-02T02:24:00.000Z", actor },
        ]),
      );

    renderHistory();
    fireEvent.click(await screen.findByRole("button", { name: "Load more" }));

    expect(await screen.findByText("Original")).toBeVisible();
    expect(mocks.getTaskHistory).toHaveBeenLastCalledWith("42", 25, 101, 2);
  });

  it("refreshes when the dialog reports a successful update", async () => {
    mocks.getTaskHistory
      .mockResolvedValueOnce(
        response([{ id: 1, action: "updated", changes: { title: { from: "A", to: "B" } }, createdAt: "2026-09-02T02:24:00.000Z", actor }]),
      )
      .mockResolvedValueOnce(
        response([{ id: 2, action: "updated", changes: { title: { from: "B", to: "C" } }, createdAt: "2026-09-02T02:25:00.000Z", actor }]),
      );

    const { rerender } = renderHistory();
    expect(await screen.findByText("B")).toBeVisible();
    rerender(
      <TaskHistory
        workspaceId="42"
        projectId={25}
        taskId={101}
        members={[]}
        refreshVersion={1}
      />,
    );

    expect(await screen.findByText("C")).toBeVisible();
    await waitFor(() =>
      expect(mocks.getTaskHistory).toHaveBeenCalledTimes(2),
    );
  });
});
