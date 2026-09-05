import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import MyTask from "./MyTask";

const mocks = vi.hoisted(() => ({
  getWorkspaceMyTasks: vi.fn(),
}));

vi.mock("../../services/workspaces", () => ({
  getWorkspaceMyTasks: mocks.getWorkspaceMyTasks,
}));

vi.mock("../../hooks/useAuthenticatedSession", () => ({
  useAuthenticatedSession: () => ({
    user: {
      id: 7,
      firstname: "Workspace",
      lastname: "Owner",
      email: "owner@example.com",
    },
  }),
}));

describe("MyTask", () => {
  beforeEach(() => {
    mocks.getWorkspaceMyTasks.mockResolvedValue({
      success: true,
      message: "My tasks retrieved",
      data: {
        tasks: [
          {
            id: 18,
            title: "Document release process",
            description: "Capture the handoff steps.",
            status: "todo",
            priority: "medium",
            dueDate: "",
            timeEstimate: null,
            project: { id: 5, name: "Release" },
            assignees: [
              {
                id: 7,
                firstname: "Workspace",
                lastname: "Owner",
                email: "owner@example.com",
              },
            ],
          },
        ],
        nextCursor: null,
      },
    });
  });

  it("shows assigned tasks without due dates", async () => {
    render(
      <MemoryRouter initialEntries={["/workspace/42/my-tasks"]}>
        <Routes>
          <Route path="/workspace/:id/my-tasks" element={<MyTask />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(
      await screen.findAllByText("Document release process"),
    ).toHaveLength(2);
    expect(screen.getAllByText("No due date")).toHaveLength(2);
    expect(mocks.getWorkspaceMyTasks).toHaveBeenCalledWith(
      "42",
      undefined,
      "due_asc",
    );
  });
});
