import type { ReactNode } from "react";
import { NavLink } from "react-router";

interface NavItemProps {
  to?: string;
  icon: ReactNode;
  label: string;
  end?: boolean;
  disabled?: boolean;
}

const itemContent = (icon: ReactNode, label: string) => (
  <>
    <span
      className="flex size-5 items-center justify-center [&>svg]:size-4"
      aria-hidden="true"
    >
      {icon}
    </span>
    {label}
  </>
);

const NavItem = ({
  to,
  icon,
  label,
  end = false,
  disabled = false,
}: NavItemProps) => {
  if (disabled || !to) {
    return (
      <span
        aria-disabled="true"
        title="Coming soon"
        className="flex cursor-not-allowed items-center gap-3 rounded-lg border-l-2 border-transparent px-3 py-2.5 text-sm font-medium text-gray-400"
      >
        {itemContent(icon, label)}
      </span>
    );
  }

  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        `flex items-center gap-3 rounded-lg border-l-2 px-3 py-2.5 text-sm font-medium transition-colors ${
          isActive
            ? "border-site-green bg-green-50 text-green-700"
            : "border-transparent text-gray-600 hover:bg-gray-50 hover:text-gray-900"
        }`
      }
    >
      {itemContent(icon, label)}
    </NavLink>
  );
};

export default NavItem;
