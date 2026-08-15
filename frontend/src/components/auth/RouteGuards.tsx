import { Navigate, Outlet } from "react-router";
import { useEffect, useState } from "react";
import { getCurrentUser } from "../../services/auth";
import {
  getWorkspaceDestination,
  type WorkspaceDestination,
} from "../../pages/workspaces/utils/workspaceRouting";

type GuestDestination = "loading" | "guest" | WorkspaceDestination;

export const ProtectedRoute = () => {
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    getCurrentUser()
      .then(() => setAuthenticated(true))
      .catch(() => setAuthenticated(false));
  }, []);

  if (authenticated === null) return null;
  return authenticated ? <Outlet /> : <Navigate to="/" replace />;
};

export const GuestRoute = () => {
  const [destination, setDestination] = useState<GuestDestination>("loading");

  useEffect(() => {
    getCurrentUser()
      .then(({ workspaceIds }) => {
        setDestination(getWorkspaceDestination(workspaceIds));
      })
      .catch(() => setDestination("guest"));
  }, []);

  if (destination === "loading") return null;
  return destination === "guest" ? <Outlet /> : <Navigate to={destination} replace />;
};
