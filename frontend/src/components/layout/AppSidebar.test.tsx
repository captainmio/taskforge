import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router";
import { describe, expect, it } from "vitest";
import AppSidebar from "./AppSidebar";

const CurrentLocation = () => <span>{useLocation().pathname}</span>;

describe("AppSidebar", () => {
  it("links My Tasks, Projects, and Members to the active workspace listings", () => {
    render(
      <MemoryRouter initialEntries={["/workspace/42"]}>
        <Routes>
          <Route
            path="/workspace/:id"
            element={
              <AppSidebar
                workspaceName="Engineering"
                workspaces={[{ id: 42, name: "Engineering" }]}
                currentWorkspaceId={42}
              />
            }
          />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByRole("link", { name: "Projects" })).toHaveAttribute(
      "href",
      "/workspace/42/projects",
    );
    expect(screen.getByRole("link", { name: "My Tasks" })).toHaveAttribute(
      "href",
      "/workspace/42/my-tasks",
    );
    expect(screen.queryByText("Settings")).not.toBeInTheDocument();
    expect(screen.queryByText("Leave workspace")).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Members" })).toHaveAttribute(
      "href",
      "/workspace/42/members",
    );
  });

  it("navigates to the selected joined workspace", () => {
    render(
      <MemoryRouter initialEntries={["/workspace/42"]}>
        <Routes>
          <Route
            path="/workspace/:id"
            element={
              <>
                <AppSidebar
                  workspaceName="Engineering"
                  workspaces={[
                    { id: 42, name: "Engineering" },
                    { id: 84, name: "Product" },
                  ]}
                  currentWorkspaceId={42}
                />
                <CurrentLocation />
              </>
            }
          />
        </Routes>
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole("button", { name: /Engineering/ }));
    fireEvent.click(screen.getByRole("menuitem", { name: /Product/ }));

    expect(screen.getByText("/workspace/84")).toBeVisible();
  });

  it("shows Archived Projects only to workspace owners and admins", () => {
    const { rerender } = render(
      <MemoryRouter initialEntries={["/workspace/42"]}>
        <Routes>
          <Route
            path="/workspace/:id"
            element={
              <AppSidebar
                workspaceName="Engineering"
                workspaces={[{ id: 42, name: "Engineering", role: "OWNER" }]}
                currentWorkspaceId={42}
              />
            }
          />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByRole("link", { name: "Archived Projects" })).toHaveAttribute(
      "href",
      "/workspace/42/projects/archived",
    );

    rerender(
      <MemoryRouter initialEntries={["/workspace/42"]}>
        <Routes>
          <Route
            path="/workspace/:id"
            element={
              <AppSidebar
                workspaceName="Engineering"
                workspaces={[{ id: 42, name: "Engineering", role: "MEMBER" }]}
                currentWorkspaceId={42}
              />
            }
          />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.queryByRole("link", { name: "Archived Projects" })).toBeNull();
  });
});
