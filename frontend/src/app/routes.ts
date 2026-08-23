import { createBrowserRouter } from "react-router";
import AppLayout from "../components/layout/AppLayout";
import LoginPage from "../pages/LoginPage";
import { Register } from "../pages/Register";
import { GuestRoute, ProtectedRoute } from "../components/auth/RouteGuards";
import CreateWorkspace from "../pages/workspaces/CreateWorkspace";
import CreateProject from "../pages/projects/CreateProject";
import EditProject from "../pages/projects/EditProject";
import Projects from "../pages/projects/Projects";
import AcceptInvitation from "../pages/invitations/AcceptInvitation";
import InviteMembers from "../pages/workspaces/InviteMembers";
import WorkspaceOverview from "../pages/workspaces/WorkspaceOverview";
import WorkspaceMembers from "../pages/workspaces/WorkspaceMembers";

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
            path: "members",
            Component: WorkspaceMembers,
          },
          {
            path: "projects",
            Component: Projects,
          },
          {
            path: "projects/create",
            Component: CreateProject,
          },
          {
            path: "projects/:projectId/edit",
            Component: EditProject,
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
