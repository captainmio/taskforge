import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import CreateProject from "./CreateProject";

const mocks = vi.hoisted(() => ({
  navigate: vi.fn(),
}));

vi.mock("../../hooks/useAuthenticatedSession", () => ({
  useAuthenticatedSession: () => ({
    user: {
      id: "user-1",
      firstname: "Rustem",
      lastname: "Jordan",
      email: "rustem@example.com",
    },
  }),
}));

vi.mock("react-router", async () => {
  const actual = await vi.importActual<typeof import("react-router")>("react-router");
  return {
    ...actual,
    useNavigate: () => mocks.navigate,
  };
});

const renderPage = () =>
  render(
    <MemoryRouter initialEntries={["/workspace/workspace-42/projects/create"]}>
      <Routes>
        <Route path="/workspace/:id/projects/create" element={<CreateProject />} />
      </Routes>
    </MemoryRouter>,
  );

describe("Create Project page", () => {
  beforeEach(() => {
    mocks.navigate.mockReset();
  });

  it("renders the existing page header and project form body", () => {
    renderPage();

    expect(screen.getByRole("heading", { name: "Create Project", level: 1 })).toBeVisible();
    expect(screen.getByRole("button", { name: "Back to Projects" })).toBeVisible();
    expect(screen.getByLabelText(/Project Name/)).toBeVisible();
    expect(screen.getByRole("button", { name: "Create Project" })).toBeVisible();
  });

  it("returns to the current workspace project list from either navigation action", () => {
    renderPage();

    fireEvent.click(screen.getByRole("button", { name: "Back to Projects" }));
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    expect(mocks.navigate).toHaveBeenNthCalledWith(1, "/workspace/workspace-42/projects");
    expect(mocks.navigate).toHaveBeenNthCalledWith(2, "/workspace/workspace-42/projects");
  });
});
