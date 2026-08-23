import { Navigate, Outlet } from "react-router";
import { useEffect, useState } from "react";
import { getCurrentUser } from "../../services/auth";
import LoaderOneDemo from "../ui/loader-one-demo";
import type { MeResponse } from "../../services/auth";
import {
  getWorkspaceDestination,
  type WorkspaceDestination,
} from "../../pages/workspaces/utils/workspaceRouting";

type GuestDestination = "loading" | "guest" | WorkspaceDestination;

const RouteLoading = () => (
  <div
    className="flex min-h-screen items-center justify-center bg-gray-50 p-8"
    role="status"
    aria-label="Loading application"
  >
    <div style={{ transform: "scale(2.5)" }}>
      <LoaderOneDemo />
    </div>
  </div>
);

export const ProtectedRoute = () => {
  const [session, setSession] = useState<MeResponse | null>(null);
  const [authenticationFailed, setAuthenticationFailed] = useState<boolean>(false);

  useEffect(() => {
    getCurrentUser()
      .then(setSession)
      .catch(() => setAuthenticationFailed(true));
  }, []);

  if (!session && !authenticationFailed) return <RouteLoading />;
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
