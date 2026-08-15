import { createBrowserRouter } from "react-router";
import LoginPage from "../pages/LoginPage";
import { Register } from "../pages/Register";
import Dashboard from "../pages/Dashboard";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: LoginPage,
  },
  {
    path: "/register",
    Component: Register
  },
  {
    path: "/dashboard",
    Component: Dashboard
  }
]);
