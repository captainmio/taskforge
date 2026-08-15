import { createBrowserRouter } from "react-router";
import LoginPage from "../pages/LoginPage";
import { Register } from "../pages/Register";
import Dashboard from "../pages/Dashboard";
import { GuestRoute, ProtectedRoute } from "../components/auth/RouteGuards";
import CreateWorkspace from "../pages/workspaces/CreateWorkspace";

export const router = createBrowserRouter([
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
        path: "/create-workspace",
        Component: CreateWorkspace,
      },
    ],
  },
]);
