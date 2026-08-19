import { createBrowserRouter } from "react-router";
import AppLayout from "../components/layout/AppLayout";
import LoginPage from "../pages/LoginPage";
import { Register } from "../pages/Register";
import { GuestRoute, ProtectedRoute } from "../components/auth/RouteGuards";
import CreateWorkspace from "../pages/workspaces/CreateWorkspace";
import CreateProject from "../pages/projects/CreateProject";
import AcceptInvitation from "../pages/invitations/AcceptInvitation";
import InviteMembers from "../pages/workspaces/InviteMembers";
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
        Component: AppLayout,
      },
      {
        path: "/workspace/:id",
        Component: AppLayout,
        children: [
          {
            index: true,
            Component: WorkspaceOverview,
          },
          {
            path: "members/invite",
            Component: InviteMembers,
          },
          {
            path: "create-project",
            Component: CreateProject,
          },
        ],
      },
      {
        path: "/create-workspace",
        Component: CreateWorkspace,
      },
    ],
  },
]);
