import { FaChevronDown } from "react-icons/fa";

interface ContextSwitcherProps {
  name: string;
  initials: string;
  onClick?: () => void;
}

const ContextSwitcher = ({ name, initials, onClick }: ContextSwitcherProps) => (
  <button
    type="button"
    onClick={onClick}
    className="flex w-full items-center gap-3 rounded-lg border border-gray-200 bg-white p-2.5 text-left shadow-sm transition-colors hover:border-gray-300 hover:bg-gray-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-site-green"
  >
    <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-400 to-site-green text-xs font-bold text-white">
      {initials}
    </span>
    <span className="min-w-0 flex-1 truncate text-sm font-semibold text-gray-800">{name}</span>
    <FaChevronDown className="size-2.5 shrink-0 text-gray-400" aria-hidden="true" />
  </button>
);

export default ContextSwitcher;
