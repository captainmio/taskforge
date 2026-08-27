import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router";
import { describe, expect, it } from "vitest";
import AppSidebar from "./AppSidebar";

const CurrentLocation = () => <span>{useLocation().pathname}</span>;

describe("AppSidebar", () => {
  it("links Projects and Members to the active workspace listings", () => {
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
});
