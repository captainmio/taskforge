import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router";
import { describe, expect, it, vi } from "vitest";
import AppLayout from "./AppLayout";

vi.mock("../../hooks/useAuthenticatedSession", () => ({
  useAuthenticatedSession: () => ({
    success: true,
    user: {
      id: 7,
      email: "owner@example.com",
      firstname: "Workspace",
      lastname: "Owner",
    },
    workspaces: [
      { id: 42, name: "Engineering" },
      { id: 84, name: "Product" },
    ],
  }),
}));

describe("AppLayout", () => {
  it("opens and closes the mobile navigation", () => {
    render(
      <AppLayout sidebar={<span>Navigation content</span>}>
        <h1>Page content</h1>
      </AppLayout>,
    );

    expect(screen.getAllByText("Navigation content")).toHaveLength(1);

    fireEvent.click(screen.getByRole("button", { name: "Open navigation" }));
    expect(screen.getAllByText("Navigation content")).toHaveLength(2);

    const closeButtons = screen.getAllByRole("button", {
      name: "Close navigation",
    });
    fireEvent.click(closeButtons[closeButtons.length - 1]);

    expect(screen.getAllByText("Navigation content")).toHaveLength(1);
  });

  it("shows the workspace matching the current route", () => {
    render(
      <MemoryRouter initialEntries={["/workspace/84"]}>
        <Routes>
          <Route
            path="/workspace/:id"
            element={
              <AppLayout>
                <h1>Page content</h1>
              </AppLayout>
            }
          />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByRole("button", { name: /Product/ })).toBeVisible();
  });
});
