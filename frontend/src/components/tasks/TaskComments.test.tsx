import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import TaskComments from "./TaskComments";

const mocks = vi.hoisted(() => ({
  createTaskComment: vi.fn(),
  getTaskComments: vi.fn(),
  useProjectTaskRealtime: vi.fn(),
}));

vi.mock("../../services/tasks", () => ({
  createTaskComment: mocks.createTaskComment,
  getTaskComments: mocks.getTaskComments,
}));

vi.mock("../../hooks/useProjectTaskRealtime", () => ({
  useProjectTaskRealtime: mocks.useProjectTaskRealtime,
}));

const existingComment = {
  id: 10,
  body: "I have started this task.",
  createdAt: "2026-09-05T09:00:00.000Z",
  author: { id: 7, firstname: "Alex", lastname: "Member" },
};

const renderComments = (onActivityRefresh = vi.fn()) =>
  render(
    <TaskComments
      workspaceId="42"
      projectId={25}
      taskId={101}
      onActivityRefresh={onActivityRefresh}
    />,
  );

describe("TaskComments", () => {
  beforeEach(() => {
    mocks.createTaskComment.mockReset();
    mocks.getTaskComments.mockReset();
    mocks.useProjectTaskRealtime.mockReset();
    mocks.getTaskComments.mockResolvedValue({
      data: { comments: [existingComment], nextCursor: null },
    });
  });

  it("loads existing comments and posts a new comment", async () => {
    const onActivityRefresh = vi.fn();
    mocks.createTaskComment.mockResolvedValue({
      data: { ...existingComment, id: 11, body: "I added the API contract." },
    });
    renderComments(onActivityRefresh);

    expect(await screen.findByText(existingComment.body)).toBeVisible();
    fireEvent.change(screen.getByLabelText("Add a comment"), {
      target: { value: "I added the API contract." },
    });
    fireEvent.click(screen.getByRole("button", { name: "Post comment" }));

    await waitFor(() =>
      expect(mocks.createTaskComment).toHaveBeenCalledWith(
        "42",
        25,
        101,
        "I added the API contract.",
      ),
    );
    expect(await screen.findByText("I added the API contract.")).toBeVisible();
    expect(screen.getByLabelText("Add a comment")).toHaveValue("");
    expect(onActivityRefresh).toHaveBeenCalledOnce();
  });

  it("keeps the draft and explains how to recover when posting fails", async () => {
    mocks.createTaskComment.mockRejectedValue(new Error("Network error"));
    renderComments();

    await screen.findByText(existingComment.body);
    const composer = screen.getByLabelText("Add a comment");
    fireEvent.change(composer, { target: { value: "Please review this." } });
    fireEvent.click(screen.getByRole("button", { name: "Post comment" }));

    expect(
      await screen.findByText(
        "Couldn't post your comment. Your draft is still here; try again.",
      ),
    ).toBeVisible();
    expect(composer).toHaveValue("Please review this.");
  });

  it("refreshes comments when the active task receives a socket event", async () => {
    const refreshedComment = {
      ...existingComment,
      id: 11,
      body: "A teammate added this update.",
    };
    mocks.getTaskComments
      .mockResolvedValueOnce({
        data: { comments: [existingComment], nextCursor: null },
      })
      .mockResolvedValueOnce({
        data: { comments: [refreshedComment, existingComment], nextCursor: null },
      });
    renderComments();

    await screen.findByText(existingComment.body);
    const realtimeOptions = mocks.useProjectTaskRealtime.mock.calls.at(-1)?.[0];
    await act(async () => {
      realtimeOptions?.onTaskCommentAdded(101);
    });

    expect(await screen.findByText(refreshedComment.body)).toBeVisible();
  });
});
