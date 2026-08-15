import  { type WorkspaceRole as WorkspaceRoleType, WorkspaceRole } from "../../types/roles";
import Badge, { type BadgeVariant } from "../ui/Badge";
import InitialsAvatar from "../ui/InitialsAvatar";

interface InviteReviewRowProps {
  email: string;
  role: WorkspaceRole | "";
}

const getRoleVariant = (role: WorkspaceRoleType | ""): BadgeVariant => {
  if (role === WorkspaceRole.ADMIN) return "orange";
  if (role === WorkspaceRole.MEMBER) return "purple";
  return "gray";
};

const InviteReviewRow = ({ email, role }: InviteReviewRowProps) => {
  return (
    <div className="flex items-center gap-3 border-b border-gray-100 py-3 last:border-b-0">
      <InitialsAvatar value={email} label={`Avatar for ${email}`} />
      <span className="min-w-0 flex-1 truncate text-sm text-gray-700">{email}</span>
      <Badge variant={getRoleVariant(role)}>{role || "No role"}</Badge>
    </div>
  );
};

export default InviteReviewRow;
