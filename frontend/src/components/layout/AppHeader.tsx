import type { ReactNode } from "react";
import { useNavigate } from "react-router";
import { useAuthenticatedSession } from "../../hooks/useAuthenticatedSession";
import { logout } from "../../services/auth";
import AccountMenu from "../ui/AccountMenu";

interface AppHeaderProps {
  title: string;
  description?: string;
  primaryAction?: ReactNode;
  secondaryAction?: ReactNode;
}

const AppHeader = ({
  title,
  description,
  primaryAction,
  secondaryAction,
}: AppHeaderProps) => {
  const navigate = useNavigate();
  const { user } = useAuthenticatedSession();
  const userName = `${user.firstname} ${user.lastname}`;

  const handleLogout = () => {
    logout()
      .then(() => navigate("/", { replace: true }))
      .catch(() => undefined);
  };

  return (
    <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="order-2 sm:order-1">
        <h1 className="text-2xl font-bold tracking-tight text-gray-950 sm:text-3xl">
          {title}
        </h1>
        {description ? (
          <p className="mt-1.5 text-sm text-gray-500">{description}</p>
        ) : null}
      </div>

      <div className="order-1 flex w-full items-center justify-end gap-2 sm:order-2 sm:w-auto sm:shrink-0">
        {secondaryAction}
        {primaryAction}
        <AccountMenu
          name={userName}
          email={user.email}
          onLogout={handleLogout}
        />
      </div>
    </header>
  );
};

export default AppHeader;
