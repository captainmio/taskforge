import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { getCurrentUser } from "../services/auth";

const Dashboard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getCurrentUser()
      .catch(() => navigate("/", { replace: true }))
      .finally(() => setLoading(false));
  }, [navigate]);

  if (loading) return null;

  return <h1>Dashboard</h1>;
};

export default Dashboard;
