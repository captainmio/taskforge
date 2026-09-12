import { useState } from "react";
import { FaTrashAlt } from "react-icons/fa";
import { useNavigate } from "react-router";
import { deleteWorkspace } from "../../services/workspaces";
import type { WorkspaceMemberRole } from "../../types/roles";
import ActionCard from "../ui/ActionCard";
import Button from "../ui/Button";
import Modal from "../ui/Modal";
import Textbox from "../ui/Textbox";

interface DeleteWorkspaceActionProps {
  workspaceId: string;
  workspaceName: string;
  role: WorkspaceMemberRole | undefined;
}

const DeleteWorkspaceAction = ({
  workspaceId,
  workspaceName,
  role,
}: DeleteWorkspaceActionProps) => {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [confirmationName, setConfirmationName] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isConfirmed = confirmationName === workspaceName;

  if (role !== "OWNER") return null;

  const close = () => {
    if (isDeleting) return;
    setIsOpen(false);
    setConfirmationName("");
    setError(null);
  };

  const confirmDelete = async () => {
    setIsDeleting(true);
    setError(null);
    try {
      await deleteWorkspace(workspaceId, confirmationName);
      navigate("/", { replace: true });
    } catch {
      setError("Unable to delete this workspace. Check the name and try again.");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <ActionCard
        icon={<FaTrashAlt />}
        title="Delete Workspace"
        description="Permanently delete workspace"
        iconContainerClassName="bg-red-50 text-red-500"
        className="cursor-pointer"
        onClick={() => setIsOpen(true)}
      />
      <Modal
        isOpen={isOpen}
        title="Delete workspace permanently?"
        onClose={close}
        footer={
          <>
            <Button variant="ghost" disabled={isDeleting} onClick={close}>
              Cancel
            </Button>
            <Button
              variant="danger"
              disabled={!isConfirmed || isDeleting}
              onClick={() => void confirmDelete()}
            >
              {isDeleting ? "Deleting…" : "Delete workspace"}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <p className="text-sm leading-6 text-gray-600">
            This permanently deletes the workspace, all projects, tasks,
            members, task assignments, comments, history, and updates. This
            cannot be undone.
          </p>
          <div>
            <label
              htmlFor="workspace-delete-confirmation"
              className="mb-2 block text-sm font-semibold text-gray-900"
            >
              Type <strong>{workspaceName}</strong> to confirm
            </label>
            <Textbox
              id="workspace-delete-confirmation"
              value={confirmationName}
              onChange={(event) => setConfirmationName(event.target.value)}
              disabled={isDeleting}
              autoComplete="off"
              aria-describedby={error ? "workspace-delete-error" : undefined}
            />
            {error ? (
              <p id="workspace-delete-error" role="alert" className="mt-2 text-xs text-red-600">
                {error}
              </p>
            ) : null}
          </div>
        </div>
      </Modal>
    </>
  );
};

export default DeleteWorkspaceAction;
