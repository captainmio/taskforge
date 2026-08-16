import type { ReactNode } from "react";
import InitialsAvatar from "./InitialsAvatar";

interface ProfileListItemProps {
  name: string;
  description: string;
  trailing?: ReactNode;
}

const ProfileListItem = ({ name, description, trailing }: ProfileListItemProps) => (
  <li className="flex items-center gap-3 border-b border-gray-100 py-3 last:border-b-0">
    <InitialsAvatar value={name} size="sm" />
    <span className="min-w-0 flex-1">
      <span className="block truncate text-sm font-semibold text-gray-900">{name}</span>
      <span className="mt-0.5 block truncate text-xs text-gray-500">{description}</span>
    </span>
    {trailing ? <span className="shrink-0">{trailing}</span> : null}
  </li>
);

export default ProfileListItem;
