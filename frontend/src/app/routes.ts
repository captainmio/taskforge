import { createBrowserRouter } from "react-router";
import LoginPage from "../pages/LoginPage";
import { Register } from "../pages/Register";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: LoginPage,
  },
  {
    path: "/register",
    Component: Register
  }
]);