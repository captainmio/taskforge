import { fireEvent, render, screen } from "@testing-library/react";
import {
  Link,
  MemoryRouter,
  Outlet,
  Route,
  Routes,
  useOutletContext,
} from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { MeResponse } from "../../services/auth";
import { GuestRoute, ProtectedRoute } from "./RouteGuards";

const mocks = vi.hoisted(() => ({ getCurrentUser: vi.fn() }));

vi.mock("../../services/auth", () => ({
  getCurrentUser: mocks.getCurrentUser,
}));

const session: MeResponse = {
  success: true,
  user: {
    id: 7,
    email: "owner@example.com",
    firstname: "Workspace",
    lastname: "Owner",
  },
  workspaces: [{ id: 42, name: "Engineering" }],
};

const ProtectedPage = () => {
  const currentSession = useOutletContext<MeResponse>();

  return (
    <>
      <p>{currentSession.workspaces[0]?.name}</p>
      <Link to="members">Open members</Link>
      <Outlet />
    </>
  );
};

describe("route guards", () => {
  beforeEach(() => {
    mocks.getCurrentUser.mockResolvedValue(session);
  });

  it("loads the session once and reuses it across protected page navigation", async () => {
    render(
      <MemoryRouter initialEntries={["/workspace/42"]}>
        <Routes>
          <Route element={<ProtectedRoute />}>
            <Route path="/workspace/:id" element={<ProtectedPage />}>
              <Route path="members" element={<h1>Members page</h1>} />
            </Route>
          </Route>
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByText("Engineering")).toBeVisible();
    fireEvent.click(screen.getByRole("link", { name: "Open members" }));

    expect(
      await screen.findByRole("heading", { name: "Members page" }),
    ).toBeVisible();
    expect(mocks.getCurrentUser).toHaveBeenCalledOnce();
  });

  it("redirects an authenticated guest route to the first joined workspace", async () => {
    render(
      <MemoryRouter initialEntries={["/"]}>
        <Routes>
          <Route element={<GuestRoute />}>
            <Route index element={<p>Guest page</p>} />
          </Route>
          <Route path="/workspace/:id" element={<p>Workspace page</p>} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByText("Workspace page")).toBeVisible();
  });

  it("redirects an authenticated user without workspaces to workspace creation", async () => {
    mocks.getCurrentUser.mockResolvedValue({ ...session, workspaces: [] });

    render(
      <MemoryRouter initialEntries={["/"]}>
        <Routes>
          <Route element={<GuestRoute />}>
            <Route index element={<p>Guest page</p>} />
          </Route>
          <Route
            path="/create-workspace"
            element={<p>Create workspace page</p>}
          />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByText("Create workspace page")).toBeVisible();
  });
});
