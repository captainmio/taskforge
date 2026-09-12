import { useEffect, useState } from "react";
import { FaArchive, FaFolder } from "react-icons/fa";
import { useNavigate, useParams } from "react-router";
import AppHeader from "../../components/layout/AppHeader";
import Button from "../../components/ui/Button";
import Modal from "../../components/ui/Modal";
import SectionCard from "../../components/ui/SectionCard";
import { getArchivedProjects, restoreProject } from "../../services/projects";
import type { WorkspaceProject } from "../../types/workspace";

const ArchivedProjects = () => {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const [projects, setProjects] = useState<WorkspaceProject[]>([]);
  const [role, setRole] = useState<string>();
  const [projectToRestore, setProjectToRestore] =
    useState<WorkspaceProject | null>(null);
  const [isRestoring, setIsRestoring] = useState(false);
  const [restoreError, setRestoreError] = useState<string | null>(null);

  useEffect(() => {
    void getArchivedProjects(id)
      .then((response) => {
        setProjects(response.data.projects);
        setRole(response.data.currentUserRole);
      })
      .catch(() => navigate(`/workspace/${id}/projects`, { replace: true }));
  }, [id, navigate]);

  const restore = async (projectId: number) => {
    setIsRestoring(true);
    setRestoreError(null);

    try {
      await restoreProject(id, projectId);
      setProjects((current) =>
        current.filter((project) => project.id !== projectId),
      );
      setProjectToRestore(null);
    } catch {
      setRestoreError("Unable to restore this project. Please try again.");
    } finally {
      setIsRestoring(false);
    }
  };

  const closeRestoreModal = () => {
    if (isRestoring) return;
    setProjectToRestore(null);
    setRestoreError(null);
  };
  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <AppHeader
        title="Archived Projects"
        description="Archived projects are read-only. Restore a project to make changes."
      />
      <SectionCard className="mt-7 border-amber-100 shadow-sm">
        <ul className="divide-y divide-gray-100">
          {projects.map((project) => (
            <li
              key={project.id}
              className="flex items-center justify-between gap-4 py-4"
            >
              <button
                type="button"
                className="flex min-w-0 cursor-pointer items-center gap-3 text-left"
                onClick={() =>
                  navigate(
                    `/workspace/${id}/projects/archived/${project.id}/tasks`,
                  )
                }
              >
                <FaFolder className="text-gray-400" />
                <span>
                  <strong className="block text-sm text-gray-950">
                    {project.name}
                  </strong>
                  <span className="text-xs text-gray-500">
                    {project.description || "No description provided."}
                  </span>
                </span>
              </button>
              {role === "OWNER" ? (
                <Button
                  variant="outline"
                  onClick={() => setProjectToRestore(project)}
                >
                  Restore project
                </Button>
              ) : null}
            </li>
          ))}
        </ul>
        {projects.length === 0 ? (
          <div className="py-12 text-center text-sm text-gray-500">
            <FaArchive className="mx-auto mb-3 size-7" />
            No archived projects.
          </div>
        ) : null}
      </SectionCard>
      <Modal
        isOpen={projectToRestore !== null}
        title="Restore project?"
        onClose={closeRestoreModal}
        footer={
          <>
            <Button
              variant="ghost"
              disabled={isRestoring}
              onClick={closeRestoreModal}
            >
              Cancel
            </Button>
            <Button
              disabled={isRestoring}
              onClick={() =>
                projectToRestore && void restore(projectToRestore.id)
              }
            >
              {isRestoring ? "Restoring…" : "Restore project"}
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <p className="text-sm leading-6 text-gray-600">
            Restore <strong>{projectToRestore?.name}</strong>? Its tasks will
            become editable and the project will return to the project list.
          </p>
          {restoreError ? (
            <p role="alert" className="text-sm text-red-600">
              {restoreError}
            </p>
          ) : null}
        </div>
      </Modal>
    </div>
  );
};
export default ArchivedProjects;
