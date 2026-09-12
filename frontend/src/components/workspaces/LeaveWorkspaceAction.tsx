import { useState } from "react";
import { FaSignOutAlt } from "react-icons/fa";
import { useNavigate } from "react-router";
import type { WorkspaceMemberRole } from "../../types/roles";
import { leaveWorkspace } from "../../services/workspaces";
import ActionCard from "../ui/ActionCard";
import Button from "../ui/Button";
import Modal from "../ui/Modal";

interface LeaveWorkspaceActionProps {
  workspaceId: string;
  role: WorkspaceMemberRole | undefined;
}

const LeaveWorkspaceAction = ({
  workspaceId,
  role,
}: LeaveWorkspaceActionProps) => {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);
  const canLeave = role === "ADMIN" || role === "MEMBER";

  if (!canLeave) return null;

  const confirmLeave = async () => {
    setIsLeaving(true);
    try {
      await leaveWorkspace(workspaceId);
      navigate("/", { replace: true });
    } finally {
      setIsLeaving(false);
    }
  };

  return (
    <>
      <ActionCard
        icon={<FaSignOutAlt />}
        title="Leave Workspace"
        description="Leave this workspace"
        iconContainerClassName="bg-orange-50 text-orange-500"
        className="cursor-pointer"
        onClick={() => setIsOpen(true)}
      />
      <Modal
        isOpen={isOpen}
        title="Leave workspace?"
        onClose={() => !isLeaving && setIsOpen(false)}
        footer={
          <>
            <Button
              variant="ghost"
              disabled={isLeaving}
              onClick={() => setIsOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              disabled={isLeaving}
              onClick={() => void confirmLeave()}
            >
              {isLeaving ? "Leaving…" : "Leave workspace"}
            </Button>
          </>
        }
      >
        <p className="text-sm leading-6 text-gray-600">
          You will lose access to this workspace, its projects, and its tasks.
          You will also be removed from all task assignments.
        </p>
      </Modal>
    </>
  );
};

export default LeaveWorkspaceAction;
