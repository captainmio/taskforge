import { FaChevronDown, FaSignOutAlt } from "react-icons/fa";
import DropdownMenu from "./DropdownMenu";
import InitialsAvatar from "./InitialsAvatar";

interface AccountMenuProps {
  name: string;
  email: string;
  onLogout?: () => void;
}

const AccountMenu = ({ name, email, onLogout }: AccountMenuProps) => (
  <DropdownMenu
    trigger={(isOpen) => (
      <span className="flex items-center gap-2 rounded-full border border-gray-200 bg-white py-1 pl-1 pr-2 shadow-sm transition-colors hover:bg-gray-50">
        <InitialsAvatar value={name} size="sm" />
        <span className="hidden max-w-32 truncate text-sm font-semibold text-gray-800 sm:block">{name}</span>
        <FaChevronDown
          className={`size-2.5 text-gray-400 transition-transform ${isOpen ? "rotate-180" : ""}`}
          aria-hidden="true"
        />
      </span>
    )}
  >
    <div className="border-b border-gray-100 px-3 py-2">
      <p className="truncate text-sm font-semibold text-gray-900">{name}</p>
      <p className="mt-0.5 truncate text-xs text-gray-500">{email}</p>
    </div>
    <button
      type="button"
      role="menuitem"
      onClick={onLogout}
      disabled={!onLogout}
      title={!onLogout ? "Logout will be available when the server endpoint is added" : undefined}
      className="mt-1 flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:text-gray-400"
    >
      <FaSignOutAlt className="size-4" aria-hidden="true" />
      Log out
    </button>
  </DropdownMenu>
);

export default AccountMenu;
