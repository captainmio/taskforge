import { useEffect, useState } from "react";
import { FaArrowLeft } from "react-icons/fa";
import { useNavigate, useParams } from "react-router";
import { toast } from "react-toastify";
import AppHeader from "../../components/layout/AppHeader";
import ProjectForm, {
  type ProjectFormValues,
} from "../../components/projects/ProjectForm";
import Button from "../../components/ui/Button";
import Skeleton from "../../components/ui/Skeleton";
import { getProjectById, updateProject } from "../../services/projects";
import { canCreateWorkspaceProjects } from "../../types/roles";
import type { WorkspaceProject } from "../../types/workspace";

const EditProjectSkeleton = () => (
  <div className="mx-auto max-w-6xl space-y-7 px-4 py-6 sm:px-6 lg:px-8 lg:py-8" role="status" aria-label="Loading edit project form">
    <div className="flex items-start justify-between gap-4">
      <div className="space-y-3"><Skeleton className="h-8 w-48" /><Skeleton className="h-4 w-72" /></div>
      <Skeleton className="h-10 w-40" />
    </div>
    <div className="space-y-6 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-7">
      <Skeleton className="h-6 w-40" />
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-28 w-full" />
      <div className="grid gap-5 md:grid-cols-3">{[1, 2, 3].map((item) => <Skeleton key={item} className="h-10 w-full" />)}</div>
      <div className="flex justify-end gap-3"><Skeleton className="h-10 w-20" /><Skeleton className="h-10 w-32" /></div>
    </div>
  </div>
);

const toFormValues = (project: WorkspaceProject): ProjectFormValues => ({
  projectName: project.name,
  description: project.description,
  icon: project.icon,
  status: project.status === "on_hold" ? "on-hold" : project.status,
  startDate: project.startDate?.slice(0, 10) ?? "",
  dueDate: project.dueDate?.slice(0, 10) ?? "",
  defaultView: project.defaultView,
});

const EditProject = () => {
  const { id = "", projectId = "" } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState<WorkspaceProject | null>(null);

  useEffect(() => {
    let isActive = true;
    const projectsPath = `/workspace/${id}/projects`;

    if (!id || !/^\d+$/.test(projectId)) {
      navigate(projectsPath, { replace: true });
      return;
    }

    const loadProject = async () => {
      try {
        const response = await getProjectById(id, Number(projectId));

        if (
          !isActive ||
          !response.success ||
          !canCreateWorkspaceProjects(response.data.currentUserRole)
        ) {
          if (isActive) navigate(projectsPath, { replace: true });
          return;
        }

        setProject(response.data.project);
      } catch {
        if (isActive) navigate(projectsPath, { replace: true });
      }
    };

    void loadProject();

    return () => {
      isActive = false;
    };
  }, [id, navigate, projectId]);

  const handleUpdateProject = async (values: ProjectFormValues): Promise<void> => {
    if (!project) return;

    const response = await updateProject(id, project.id, values);
    toast.success(response.message);
    navigate(`/workspace/${id}/projects`);
  };

  if (!project) return <EditProjectSkeleton />;

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <AppHeader
        title="Edit Project"
        secondaryAction={(
          <Button
            variant="outline"
            leadingIcon={<FaArrowLeft />}
            onClick={() => navigate(`/workspace/${id}/projects`)}
          >
            Back to Projects
          </Button>
        )}
      />
      <ProjectForm
        defaultValues={toFormValues(project)}
        submitLabel="Save changes"
        onCancel={() => navigate(`/workspace/${id}/projects`)}
        onSubmit={handleUpdateProject}
      />
    </div>
  );
};

export default EditProject;
