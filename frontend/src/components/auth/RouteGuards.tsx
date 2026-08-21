import { Navigate, Outlet } from "react-router";
import { useEffect, useState } from "react";
import { getCurrentUser } from "../../services/auth";
import type { MeResponse } from "../../services/auth";
import {
  getWorkspaceDestination,
  type WorkspaceDestination,
} from "../../pages/workspaces/utils/workspaceRouting";

type GuestDestination = "loading" | "guest" | WorkspaceDestination;

export const ProtectedRoute = () => {
  const [session, setSession] = useState<MeResponse | null>(null);
  const [authenticationFailed, setAuthenticationFailed] = useState<boolean>(false);

  useEffect(() => {
    getCurrentUser()
      .then(setSession)
      .catch(() => setAuthenticationFailed(true));
  }, []);

  if (!session && !authenticationFailed) return null;
  return session ? <Outlet context={session} /> : <Navigate to="/" replace />;
};

export const GuestRoute = () => {
  const [destination, setDestination] = useState<GuestDestination>("loading");

  useEffect(() => {
    getCurrentUser()
      .then(({ workspaces }) => {
        setDestination(getWorkspaceDestination(workspaces));
      })
      .catch(() => setDestination("guest"));
  }, []);

  if (destination === "loading") return null;
  return destination === "guest" ? <Outlet /> : <Navigate to={destination} replace />;
};
