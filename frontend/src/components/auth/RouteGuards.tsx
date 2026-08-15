import { Navigate, Outlet } from "react-router";
import { useEffect, useState } from "react";
import { getCurrentUser } from "../../services/auth";

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
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    getCurrentUser()
      .then(() => setAuthenticated(true))
      .catch(() => setAuthenticated(false));
  }, []);

  if (authenticated === null) return null;
  return authenticated ? <Navigate to="/dashboard" replace /> : <Outlet />;
};
