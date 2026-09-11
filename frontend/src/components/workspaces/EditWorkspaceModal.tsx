import { useEffect, useState } from "react";
import { updateWorkspace } from "../../services/workspaces";
import type { WorkspaceIcon, WorkspaceOverview } from "../../types/workspace";
import Button from "../ui/Button";
import Modal from "../ui/Modal";
import SelectableIconButton from "../ui/SelectableIconButton";
import Textarea from "../ui/Textarea";
import Textbox from "../ui/Textbox";
import { workspaceIconOptions } from "./workspaceIconOptions";

type EditableWorkspace = Pick<
  WorkspaceOverview,
  "id" | "displayName" | "description" | "icon"
>;

interface EditWorkspaceModalProps {
  workspace: EditableWorkspace;
  isOpen: boolean;
  onClose: () => void;
  onSaved: (workspace: EditableWorkspace) => void;
}

const EditWorkspaceModal = ({
  workspace,
  isOpen,
  onClose,
  onSaved,
}: EditWorkspaceModalProps) => {
  const [name, setName] = useState(workspace.displayName);
  const [description, setDescription] = useState(workspace.description);
  const [icon, setIcon] = useState<WorkspaceIcon>(workspace.icon);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isOpen) return;

    setName(workspace.displayName);
    setDescription(workspace.description);
    setIcon(workspace.icon);
    setError("");
  }, [isOpen, workspace]);

  const saveWorkspace = async () => {
    if (!name.trim()) return;

    setIsSaving(true);
    setError("");
    try {
      const response = await updateWorkspace(String(workspace.id), {
        workspaceName: name,
        description,
        icon,
      });
      onSaved(response.data);
      onClose();
    } catch {
      setError("We could not save your workspace changes. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      title="Edit Workspace"
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={isSaving}>
            Cancel
          </Button>
          <Button
            disabled={isSaving || !name.trim()}
            onClick={() => void saveWorkspace()}
          >
            {isSaving ? "Saving…" : "Save changes"}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <fieldset>
          <legend className="mb-3 text-sm font-medium text-gray-700">
            Workspace icon
          </legend>
          <div className="flex flex-wrap gap-3">
            {workspaceIconOptions.map((option) => (
              <SelectableIconButton
                key={option.id}
                icon={option.icon}
                label={option.label}
                selected={icon === option.id}
                iconContainerClassName={option.className}
                onClick={() => setIcon(option.id)}
              />
            ))}
          </div>
        </fieldset>
        <div>
          <label
            className="mb-1.5 block text-sm font-medium text-gray-700"
            htmlFor="workspace-name"
          >
            Workspace name
          </label>
          <Textbox
            id="workspace-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
        </div>
        <div>
          <label
            className="mb-1.5 block text-sm font-medium text-gray-700"
            htmlFor="workspace-description"
          >
            Description
          </label>
          <Textarea
            id="workspace-description"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
          />
        </div>
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
      </div>
    </Modal>
  );
};

export default EditWorkspaceModal;
