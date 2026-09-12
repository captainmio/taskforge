import { beforeEach, describe, expect, it, vi } from "vitest";
import { getArchivedProjects, restoreProject } from "./projects";

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

describe("archived project services", () => {
  beforeEach(() => {
    mocks.get.mockReset();
    mocks.patch.mockReset();
  });

  it("loads archived projects for the selected workspace", async () => {
    const response = {
      success: true,
      message: "Archived projects retrieved",
      data: { projects: [], currentUserRole: "OWNER" },
    };
    mocks.get.mockResolvedValue({ data: response });

    await expect(getArchivedProjects("42")).resolves.toEqual(response);
    expect(mocks.get).toHaveBeenCalledWith("/workspaces/42/projects/archived");
  });

  it("requests restoration for the selected archived project", async () => {
    const response = {
      success: true,
      message: "Project restored",
      data: { id: 25 },
    };
    mocks.patch.mockResolvedValue({ data: response });

    await expect(restoreProject("42", 25)).resolves.toEqual(response);
    expect(mocks.patch).toHaveBeenCalledWith(
      "/workspaces/42/projects/25/restore",
    );
  });
});
