import { createBrowserRouter } from "react-router";
import LoginPage from "../pages/LoginPage";
import { Register } from "../pages/Register";
import Dashboard from "../pages/Dashboard";
import { GuestRoute, ProtectedRoute } from "../components/auth/RouteGuards";
import CreateWorkspace from "../pages/workspaces/CreateWorkspace";
import CreateProject from "../pages/projects/CreateProject";
import AcceptInvitation from "../pages/invitations/AcceptInvitation";
import WorkspaceOverview from "../pages/workspaces/WorkspaceOverview";

export const router = createBrowserRouter([
  {
    path: "/invitations/accept",
    Component: AcceptInvitation,
  },
  {
    Component: GuestRoute,
    children: [
      {
        index: true,
        Component: LoginPage,
      },
      {
        path: "register",
        Component: Register,
      },
    ],
  },
  {
    Component: ProtectedRoute,
    children: [
      {
        path: "/dashboard",
        Component: Dashboard,
      },
      {
        path: "/workspace/:id",
        Component: WorkspaceOverview,
      },
      {
        path: "/create-workspace",
        Component: CreateWorkspace,
      },
      {
        path: "/workspace/:id/create-project",
        Component: CreateProject,
      },
    ],
  },
]);
