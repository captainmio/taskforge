import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  getWorkspaceOverview,
  getWorkspaceMyTasks,
  getWorkspaceUpcomingTasks,
  updateWorkspaceMemberRole,
} from "./workspaces";

const mocks = vi.hoisted(() => ({
  get: vi.fn(),
  patch: vi.fn(),
}));

vi.mock("./api", () => ({
  apiClient: {
    get: mocks.get,
    patch: mocks.patch,
  },
}));

describe("getWorkspaceOverview", () => {
  it("returns the selected workspace metadata and members", async () => {
    const apiResponse = {
      success: true as const,
      message: "Workspace overview retrieved",
      data: {
        id: 42,
        displayName: "Engineering Team",
        description: "Builds and maintains the product.",
        icon: "code" as const,
        createdAt: "2026-08-18T00:00:00.000Z",
        members: [
          {
            id: 7,
            firstname: "Workspace",
            lastname: "Owner",
            email: "owner@example.com",
            role: "OWNER" as const,
            joinedAt: "2026-08-18T00:00:00.000Z",
          },
        ],
      },
    };
    mocks.get.mockResolvedValue({ data: apiResponse });

    await expect(getWorkspaceOverview("42")).resolves.toEqual(apiResponse);
    expect(mocks.get).toHaveBeenCalledWith("/workspaces/42/overview");
  });
});

describe("getWorkspaceUpcomingTasks", () => {
  it("requests the first five upcoming tasks by default", async () => {
    const apiResponse = {
      success: true as const,
      message: "Upcoming tasks retrieved",
      data: { tasks: [], nextCursor: null },
    };
    mocks.get.mockResolvedValue({ data: apiResponse });

    await expect(getWorkspaceUpcomingTasks("42")).resolves.toEqual(apiResponse);
    expect(mocks.get).toHaveBeenCalledWith("/workspaces/42/upcoming-tasks", {
      params: { limit: 5, sort: "due_asc" },
    });
  });

  it("passes a cursor when loading a later page", async () => {
    mocks.get.mockResolvedValue({
      data: {
        success: true,
        message: "Upcoming tasks retrieved",
        data: { tasks: [], nextCursor: null },
      },
    });

    await getWorkspaceUpcomingTasks("42", 81);
    expect(mocks.get).toHaveBeenCalledWith("/workspaces/42/upcoming-tasks", {
      params: { limit: 5, cursor: 81, sort: "due_asc" },
    });
  });
});

describe("getWorkspaceMyTasks", () => {
  it("requests the current user's tasks including those without due dates", async () => {
    const apiResponse = {
      success: true as const,
      message: "My tasks retrieved",
      data: { tasks: [], nextCursor: null },
    };
    mocks.get.mockResolvedValue({ data: apiResponse });

    await expect(getWorkspaceMyTasks("42")).resolves.toEqual(apiResponse);
    expect(mocks.get).toHaveBeenCalledWith("/workspaces/42/my-tasks", {
      params: { limit: 5, sort: "due_asc" },
    });
  });
});

describe("updateWorkspaceMemberRole", () => {
  beforeEach(() => {
    mocks.patch.mockResolvedValue({
      data: {
        success: true,
        message: "Workspace member role updated",
        data: {
          id: 8,
          firstname: "Taylor",
          lastname: "Member",
          email: "taylor@example.com",
          role: "ADMIN",
          joinedAt: "2026-08-20T00:00:00.000Z",
        },
      },
    });
  });

  it("patches the selected member role and returns the complete API response", async () => {
    await expect(
      updateWorkspaceMemberRole("42", 8, { role: "ADMIN" }),
    ).resolves.toEqual({
      success: true,
      message: "Workspace member role updated",
      data: {
        id: 8,
        firstname: "Taylor",
        lastname: "Member",
        email: "taylor@example.com",
        role: "ADMIN",
        joinedAt: "2026-08-20T00:00:00.000Z",
      },
    });
    expect(mocks.patch).toHaveBeenCalledWith("/workspaces/42/members/8", {
      role: "ADMIN",
    });
  });
});
